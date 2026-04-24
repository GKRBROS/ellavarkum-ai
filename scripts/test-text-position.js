const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

const A4_WIDTH_PX = 1080;
const A4_HEIGHT_PX = 1350;

async function testFinalPosition() {
    const canvas = createCanvas(A4_WIDTH_PX, A4_HEIGHT_PX);
    const ctx = canvas.getContext('2d');

    const layer = await loadImage(path.join(process.cwd(), 'public', 'layer.png'));
    ctx.drawImage(layer, 0, 0, A4_WIDTH_PX, A4_HEIGHT_PX);

    const nameText = "SHAFAS";
    const nameY = 785; // User requested position for better alignment

    console.log(`Testing position Y=${nameY}`);

    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 80px Arial';

    ctx.fillText(nameText, A4_WIDTH_PX / 2, nameY);

    fs.writeFileSync('test-text-position-793.png', canvas.toBuffer());
    console.log('Created test-text-position-793.png at Y=793');
}

testFinalPosition().catch(console.error);
