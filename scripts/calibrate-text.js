const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

const A4_WIDTH_PX = 1080;
const A4_HEIGHT_PX = 1350;

async function calibrate() {
    const canvas = createCanvas(A4_WIDTH_PX, A4_HEIGHT_PX);
    const ctx = canvas.getContext('2d');

    const layer = await loadImage(path.join(process.cwd(), 'public', 'layer.png'));
    ctx.drawImage(layer, 0, 0, A4_WIDTH_PX, A4_HEIGHT_PX);

    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 80px Arial';

    // Test positions from 750 to 950
    for (let y = 750; y <= 950; y += 50) {
        ctx.fillText(`TEST Y=${y}`, A4_WIDTH_PX / 2, y);
    }

    fs.writeFileSync('calibrate-text.png', canvas.toBuffer());
}

calibrate().catch(console.error);
