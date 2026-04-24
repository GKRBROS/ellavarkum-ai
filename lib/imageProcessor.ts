import sharp from 'sharp';
import { join } from 'path';
import { existsSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { isS3Configured, uploadBufferToS3 } from '@/lib/s3Storage';
import { getSupabaseClient } from '@/lib/supabase';
import { createCanvas, registerFont } from 'canvas';

let fontsRegistered = false;

const A4_WIDTH_PX = 1080;
const A4_HEIGHT_PX = 1350;
const NAME_TEXT_Y_OFFSET_PX = 0;

const registerCanvasFonts = () => {
  if (fontsRegistered) return;

  const calSansPath = join(process.cwd(), 'public', 'CalSans-SemiBold.ttf');
  if (existsSync(calSansPath)) {
    registerFont(calSansPath, { family: 'Cal Sans', weight: '600', style: 'normal' });
  } else {
    console.warn('Cal Sans font file not found:', calSansPath);
  }

  const geistPath = join(process.cwd(), 'public', 'Geist-Regular.ttf');
  if (existsSync(geistPath)) {
    registerFont(geistPath, { family: 'Geist', weight: '400', style: 'normal' });
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

    // Load background image
    const backgroundPath = join(process.cwd(), 'public', 'background.png');
    const layerPath = join(process.cwd(), 'public', 'layer.png');
    const fallbackPath = join(process.cwd(), 'public', 'example.png');
    const finalBgPath = existsSync(backgroundPath) ? backgroundPath : fallbackPath;
    
    console.log('Paths:', { backgroundPath, layerPath, usingFallback: !existsSync(backgroundPath) });

    const [bgMetadata, layerMetadata] = await Promise.all([
      sharp(finalBgPath).metadata(),
      sharp(layerPath).metadata(),
    ]);

    const bgWidth = bgMetadata.width || 1024;
    const bgHeight = bgMetadata.height || 1024;
    const layerWidth = layerMetadata.width || 1080;
    const layerHeight = layerMetadata.height || 1920;

    console.log(`Dimensions - BG: ${bgWidth}x${bgHeight}, Layer: ${layerWidth}x${layerHeight}`);

    // STEP 1: Resize generated character image and prepare it in parallel with canvas text
    const charWidth = 880;
    const charHeight = 880; 
    const charTopOffset = 75; // Shifted down another 20px as requested (Total 45px from original)
    const charLeftOffset = Math.floor((A4_WIDTH_PX - charWidth) / 2);

    // Resize the generated image and layer concurrently
    const [resizedCharBuffer, resizedLayerBuffer] = await Promise.all([
      sharp(generatedImagePath)
        .resize(charWidth, charHeight, { fit: 'cover', position: 'center' })
        .png()
        .toBuffer(),
      sharp(layerPath)
        .resize(A4_WIDTH_PX, A4_HEIGHT_PX, { fit: 'cover' })
        .png()
        .toBuffer(),
    ]);

    // STEP 2: Build composite layers array
    let finalCompositeLayers: any[] = [
      // Character image placed behind the layer
      {
        input: resizedCharBuffer,
        blend: 'over',
        top: charTopOffset,
        left: charLeftOffset,
      },
      // Layer on top of character
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

      const nameText = name ? name.trim().charAt(0).toUpperCase() + name.trim().slice(1).toLowerCase() : '';

      // Auto-scaling logic (large and bold look, fitted to footer width)
      const maxWidth = Math.floor(canvasWidth * 0.9);
      const maxNameSize = Math.floor(canvasWidth * 0.08); // Reduced size for better balance
      const minNameSize = Math.floor(canvasWidth * 0.05);
      const estimatedWidthPerChar = 0.52;
      const desiredFillRatio = 0.85; // Reduced fill ratio to leave margins
      let nameFontSize = Math.floor(maxWidth / (Math.max(nameText.length, 1) * estimatedWidthPerChar));
      nameFontSize = Math.max(minNameSize, Math.min(maxNameSize, nameFontSize));

      const nameY = 785; // User requested position for better alignment

      console.log('Text overlay:', { nameText, nameFontSize, nameY, maxWidth });

      // Create canvas with text using node-canvas
      try {
        registerCanvasFonts();
        const canvas = createCanvas(canvasWidth, canvasHeight);
        const ctx = canvas.getContext('2d');

        const drawTextWithKerning = (
          text: string,
          x: number,
          y: number,
          font: string,
          color: string,
          letterSpacingPx = 0,
          strokeWidthPx = 0
        ) => {
          ctx.font = font;
          ctx.fillStyle = color;
          if (strokeWidthPx > 0) {
            ctx.strokeStyle = color;
            ctx.lineWidth = strokeWidthPx;
          }
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';

          if (!letterSpacingPx) {
            const textWidth = ctx.measureText(text).width;
            if (strokeWidthPx > 0) {
              ctx.strokeText(text, x - textWidth / 2, y);
            }
            ctx.fillText(text, x - textWidth / 2, y);
            return;
          }

          let totalWidth = 0;
          for (const char of text) {
            totalWidth += ctx.measureText(char).width + letterSpacingPx;
          }
          totalWidth -= letterSpacingPx;

          let currentX = x - totalWidth / 2;
          for (const char of text) {
            if (strokeWidthPx > 0) {
              ctx.strokeText(char, currentX, y);
            }
            ctx.fillText(char, currentX, y);
            currentX += ctx.measureText(char).width + letterSpacingPx;
          }
        };

        // Draw name text (Cal Sans, larger and bolder)
        if (nameText) {
          let fittedNameSize = Math.max(nameFontSize, minNameSize);
          ctx.font = `700 ${fittedNameSize}px "Cal Sans", Arial, sans-serif`;

          while (fittedNameSize > minNameSize && ctx.measureText(nameText).width > maxWidth) {
            fittedNameSize -= 2;
            ctx.font = `700 ${fittedNameSize}px "Cal Sans", Arial, sans-serif`;
          }

          while (fittedNameSize < maxNameSize && ctx.measureText(nameText).width < maxWidth * desiredFillRatio) {
            fittedNameSize += 2;
            ctx.font = `700 ${fittedNameSize}px "Cal Sans", Arial, sans-serif`;
          }

          const fontSize = Math.max(fittedNameSize, 24);
          const measuredNameWidth = ctx.measureText(nameText).width;
          const gaps = Math.max(nameText.length - 1, 1);
          let letterSpacingPx = 0;
          if (nameText.length > 1 && measuredNameWidth < maxWidth * 0.99) {
            letterSpacingPx = (maxWidth - measuredNameWidth) / gaps;
            letterSpacingPx = Math.max(0, Math.min(letterSpacingPx, Math.floor(fontSize * 0.06)));
          }
          const strokeWidthPx = Math.max(2, Math.floor(fontSize * 0.035));
          nameFontSize = fontSize;
          drawTextWithKerning(
            nameText,
            Math.floor(canvasWidth / 2),
            nameY,
            `700 ${fontSize}px "Cal Sans", Arial, sans-serif`,
            '#000000',
            letterSpacingPx,
            strokeWidthPx
          );

        }

        const textBuffer = canvas.toBuffer('image/png');
        console.log('Canvas text overlay created, buffer size:', textBuffer.length);

        finalCompositeLayers.push({
          input: textBuffer,
          top: 0,
          left: 0,
          blend: 'over'
        });
      } catch (canvasErr) {
        console.warn('Canvas text rendering failed, falling back to SVG:', canvasErr);
        // Fallback to SVG if canvas fails
        const svgWidth = A4_WIDTH_PX;
        const svgHeight = A4_HEIGHT_PX;
        let svgContent = `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg"><defs><style>text { font-family: Arial, sans-serif; }</style></defs>`;

        if (nameText) {
          const fontSize = Math.max(nameFontSize, 24);
          const strokeWidth = Math.max(2, Math.floor(fontSize * 0.035));
          svgContent += `<text x="${Math.floor(svgWidth / 2)}" y="${nameY}" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="${strokeWidth}" font-size="${fontSize}" font-weight="700" font-family="Cal Sans, Arial, sans-serif" text-anchor="middle" dominant-baseline="middle">${nameText}</text>`;

        }

        svgContent += `</svg>`;

        finalCompositeLayers.push({
          input: Buffer.from(svgContent),
          top: 0,
          left: 0,
          blend: 'over'
        });
      }
    }

    const finalBuffer = await sharp(finalBgPath)
      .resize(A4_WIDTH_PX, A4_HEIGHT_PX, {
        fit: 'cover',
        position: 'center'
      })
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
