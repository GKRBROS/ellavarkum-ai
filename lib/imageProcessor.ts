import sharp from 'sharp';
import { join } from 'path';
import { existsSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { isS3Configured, uploadBufferToS3 } from '@/lib/s3Storage';
import { getSupabaseClient } from '@/lib/supabase';

let canvasModule: any = null;
const getCanvas = () => {
  if (canvasModule) return canvasModule;
  try {
    canvasModule = require('canvas');
    return canvasModule;
  } catch (e) {
    console.error('Failed to load canvas module:', e);
    return null;
  }
};

let fontsRegistered = false;

const A4_WIDTH_PX = 1080;
const A4_HEIGHT_PX = 1350;
const NAME_TEXT_Y_OFFSET_PX = 0;

const registerCanvasFonts = () => {
  if (fontsRegistered) return;

  // On some server environments (Linux/Vercel), Fontconfig needs a path to avoid errors.
  // We set it to the public directory where our fonts are, or /tmp if that fails.
  if (process.env.NODE_ENV === 'production' && !process.env.FONTCONFIG_PATH) {
    process.env.FONTCONFIG_PATH = join(process.cwd(), 'public');
  }

  const canvas = getCanvas();
  if (!canvas) return;

  const calSansPath = join(process.cwd(), 'public', 'CalSans-SemiBold.ttf');
  if (existsSync(calSansPath)) {
    canvas.registerFont(calSansPath, { family: 'Cal Sans', weight: 'bold' });
  } else {
    console.warn('Cal Sans font file not found:', calSansPath);
  }

  const geistPath = join(process.cwd(), 'public', 'Geist-Regular.ttf');
  if (existsSync(geistPath)) {
    canvas.registerFont(geistPath, { family: 'Geist', weight: 'normal' });
  } else {
    console.warn('Geist font file not found:', geistPath);
  }

  fontsRegistered = true;
};

export async function mergeImages(
  generatedImagePath: string,
  timestamp: string,
  name?: string
): Promise<string> {
  try {
    console.log('--- MERGE IMAGES DEBUG START ---');
    console.log('generatedImagePath:', generatedImagePath);
    console.log('Text Overlay:', { name });
    console.log('Node Env:', process.env.NODE_ENV);

    // Create output directory
    const isProduction = process.env.NODE_ENV === 'production';
    const publicOutputDir = join(process.cwd(), 'public', 'elam-ai-final');
    const tmpOutputDir = join('/tmp', 'elam-ai-final');
    const outputDir = isProduction ? tmpOutputDir : publicOutputDir;

    try {
      await mkdir(outputDir, { recursive: true });
    } catch (error) {
      // Directory might already exist or be read-only
    }

    // Load branding layer
    const layerPathWebp = join(process.cwd(), 'public', 'layer.webp');
    const layerPathPng = join(process.cwd(), 'public', 'layer.png');
    const fallbackPath = join(process.cwd(), 'public', 'example.png');
    
    const finalLayerPath = existsSync(layerPathWebp) ? layerPathWebp : (existsSync(layerPathPng) ? layerPathPng : fallbackPath);
    
    console.log('Paths:', { 
      layerPath: finalLayerPath, 
      usingLayerFallback: !existsSync(layerPathWebp) && !existsSync(layerPathPng)
    });

    const layerMetadata = await sharp(finalLayerPath).metadata();
    const layerWidth = layerMetadata.width || 1080;
    const layerHeight = layerMetadata.height || 1920;

    console.log(`Dimensions - Layer: ${layerWidth}x${layerHeight}`);

    // Resize the generated image to serve as the background (1080x1080 square at the top)
    const [baseBuffer, resizedLayerBuffer] = await Promise.all([
      sharp({
        create: {
          width: A4_WIDTH_PX,
          height: A4_HEIGHT_PX,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 1 }
        }
      })
      .composite([{
        input: await sharp(generatedImagePath)
          .resize(A4_WIDTH_PX, A4_WIDTH_PX, { fit: 'cover' }) // Full width square, no black bars
          .png()
          .toBuffer(),
        top: 0,
        left: 0
      }])
      .png()
      .toBuffer(),
      sharp(finalLayerPath)
        .resize(A4_WIDTH_PX, A4_HEIGHT_PX, { fit: 'cover' })
        .png()
        .toBuffer(),
    ]);

    // STEP 2: Build composite layers array
    let finalCompositeLayers: any[] = [
      // Layer on top of the generated portrait
      {
        input: resizedLayerBuffer,
        top: 0,
        left: 0,
        blend: 'over',
      },
    ];

    if (name) {
      // Create text overlay using Canvas (better than SVG for text rendering)
      const canvasWidth = A4_WIDTH_PX;
      const canvasHeight = A4_HEIGHT_PX;

      const nameText = name ? name.trim().charAt(0).toUpperCase() + name.trim().slice(1) : '';

      // Auto-scaling logic (large and bold look, fitted to footer width)
      const maxWidth = Math.floor(canvasWidth * 0.7); // Focused on the box width
      const maxNameSize = 64; 
      const minNameSize = 32;
      
      const nameY = 800; // Centered in the top glass box of the overlay

      console.log('Text overlay:', { nameText, nameY, maxWidth });

      // Create canvas with text using node-canvas
      try {
        registerCanvasFonts();
        const canvasLib = getCanvas();
        if (!canvasLib) throw new Error('Canvas library not available');
        
        const canvas = canvasLib.createCanvas(canvasWidth, canvasHeight);
        const ctx = canvas.getContext('2d');

        const drawTextCentered = (
          text: string,
          x: number,
          y: number,
          font: string,
          color: string
        ) => {
          ctx.font = font;
          ctx.fillStyle = color;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(text, x, y);
        };

        // Draw name text (Outfit or Cal Sans)
        if (nameText) {
          let fontSize = maxNameSize;
          ctx.font = `600 ${fontSize}px "Cal Sans", Arial, sans-serif`;

          while (fontSize > minNameSize && ctx.measureText(nameText).width > maxWidth) {
            fontSize -= 2;
            ctx.font = `600 ${fontSize}px "Cal Sans", Arial, sans-serif`;
          }

          drawTextCentered(
            nameText,
            Math.floor(canvasWidth / 2),
            nameY,
            `600 ${fontSize}px "Cal Sans", Arial, sans-serif`,
            '#FFFFFF'
          );
        }

        const textBuffer = canvas.toBuffer('image/png');
        finalCompositeLayers.push({
          input: textBuffer,
          top: 0,
          left: 0,
          blend: 'over'
        });
      } catch (canvasErr) {
        console.warn('Canvas text rendering failed, falling back to SVG:', canvasErr);
        const svgWidth = A4_WIDTH_PX;
        const svgHeight = A4_HEIGHT_PX;
        const fontSize = 54;
        const svgContent = `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
          <text x="${Math.floor(svgWidth / 2)}" y="${nameY}" fill="#FFFFFF" font-size="${fontSize}" font-weight="700" font-family="Arial, sans-serif" text-anchor="middle" dominant-baseline="middle">${nameText}</text>
        </svg>`;

        finalCompositeLayers.push({
          input: Buffer.from(svgContent),
          top: 0,
          left: 0,
          blend: 'over'
        });
      }
    }

    const finalBuffer = await sharp(baseBuffer)
      .composite(finalCompositeLayers)
      .png()
      .toBuffer();

    // Generate filename
    const timestamp_str = timestamp.toString();
    const outputFilename = `final-${timestamp_str}.png`;

    // STEP 3: Handle Storage (S3 prioritized, Local as fallback for dev)
    if (isS3Configured()) {
      try {
        const s3PublicUrl = await uploadBufferToS3({
          key: `elam ai final/${outputFilename}`,
          body: finalBuffer,
          contentType: 'image/png',
        });

        console.log('Final image uploaded to S3:', s3PublicUrl);
        console.log('--- MERGE IMAGES DEBUG END - SUCCESS ---');
        return s3PublicUrl;
      } catch (s3Error) {
        console.warn('S3 final upload failed, falling back to local/Supabase:', s3Error);
      }
    }

    // Only save locally if S3 failed or is not configured
    if (!isProduction) {
      try {
        const outputPath = join(outputDir, outputFilename);
        await writeFile(outputPath, finalBuffer);
        console.log('Final image saved locally:', outputPath);
        return `/elam-ai-final/${outputFilename}`;
      } catch (err) {
        console.warn('Could not save final image locally:', err);
      }
    }

    return `/elam-ai-final/${outputFilename}`;
  } catch (error) {
    console.error('CRITICAL ERROR in mergeImages:', error);
    throw new Error(`Failed to merge images: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
