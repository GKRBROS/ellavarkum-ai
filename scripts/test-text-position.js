const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');

// Constants to match imageProcessor.ts
const A4_WIDTH_PX = 1080;
const A4_HEIGHT_PX = 1350;

async function testTextPosition() {
    console.log('Starting text position test...');
    
    const canvas = createCanvas(A4_WIDTH_PX, A4_HEIGHT_PX);
    const ctx = canvas.getContext('2d');

    // 1. Load Background & Layer
    const bgPath = path.join(process.cwd(), 'public', 'background.png');
    const layerPath = path.join(process.cwd(), 'public', 'layer.png');
    
    if (!fs.existsSync(bgPath) || !fs.existsSync(layerPath)) {
        console.error('Assets missing. Ensure background.png and layer.png are in public/');
        return;
    }

    const bg = await loadImage(bgPath);
    const layer = await loadImage(layerPath);

    // Draw BG
    ctx.drawImage(bg, 0, 0, A4_WIDTH_PX, A4_HEIGHT_PX);
    
    // Draw Layer
    ctx.drawImage(layer, 0, 0, A4_WIDTH_PX, A4_HEIGHT_PX);

    // 2. Setup Text
    const nameText = "SHAFAS";
    
    // Position to test (White bar seems to be around y=560)
    const nameY = 590; 
    const maxWidth = A4_WIDTH_PX * 0.8;
    const nameFontSize = 70;

    ctx.font = `bold ${nameFontSize}px Arial`;
    ctx.fillStyle = '#000000'; // Black text as requested
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw Text
    ctx.fillText(nameText, A4_WIDTH_PX / 2, nameY);

    // 3. Save Output
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync('test-text-position.png', buffer);
    console.log('Test image created: test-text-position.png');
}

testTextPosition().catch(console.error);
