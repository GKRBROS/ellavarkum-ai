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
    ctx.font = 'bold 30px Arial';

    // Dense grid of test lines from 600 to 1200
    for (let y = 600; y <= 1200; y += 25) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(A4_WIDTH_PX, y);
        ctx.stroke();
        ctx.fillText(`Y=${y}`, 100, y);
    }

    fs.writeFileSync('grid-calibration.png', canvas.toBuffer());
    console.log('Grid calibration image created: grid-calibration.png');
}

calibrate().catch(console.error);
