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
    const nameY = 785; // Latest stable position

    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // REDUCED SIZE: matching the new 0.08 scaling
    const fontSize = Math.floor(A4_WIDTH_PX * 0.08); 
    ctx.font = `bold ${fontSize}px Arial`;

    ctx.fillText(nameText, A4_WIDTH_PX / 2, nameY);

    fs.writeFileSync('test-text-final-small.png', canvas.toBuffer());
    console.log(`Created test-text-final-small.png at Y=${nameY} with size ${fontSize}px`);
}

testFinalPosition().catch(console.error);
