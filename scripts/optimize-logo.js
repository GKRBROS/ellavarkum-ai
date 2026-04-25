const sharp = require('sharp');
const { join } = require('path');
const fs = require('fs');

async function optimizeLogo() {
    const root = process.cwd();
    const logoPath = join(root, 'public', 'LOGO.png');
    const outputPath = join(root, 'public', 'LOGO_optimized.png');

    if (fs.existsSync(logoPath)) {
        await sharp(logoPath)
            .resize({ width: 400 }) // Sufficient for email
            .png({ quality: 80, compressionLevel: 9 })
            .toFile(outputPath);
        
        // Replace original
        fs.copyFileSync(outputPath, logoPath);
        fs.unlinkSync(outputPath);
        console.log('Logo optimized to smaller size');
    }
}

optimizeLogo();
