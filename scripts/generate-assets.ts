import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Rocket } from 'lucide-react';
import sharp from 'sharp';
import icongen from 'icon-gen';
import path from 'path';
import fs from 'fs';

const IMAGES_DIR = path.join(process.cwd(), 'images');

// Colors
const BACKGROUND_COLOR = '#0f172a'; // slate-900 / primary
const ICON_COLOR = '#f8fafc'; // slate-50 / primary-foreground
const ICON_SIZE = 1024;
const PADDING = 0.25; // 25% padding

async function generate() {
  console.log('Generating assets...');

  // 1. Generate SVG String
  // We want the icon to be centered and sized appropriately.
  // The canvas is 1024x1024.
  // We will create an SVG with the background rect and the icon centered.

  // Lucide icons are 24x24 by default.
  // We will scale it up.
  const iconSize = ICON_SIZE * (1 - PADDING * 2);
  const padding = ICON_SIZE * PADDING;

  const iconSvg = renderToStaticMarkup(
    React.createElement(Rocket, {
      size: iconSize,
      color: ICON_COLOR,
      strokeWidth: 1.5, // Thicker stroke for larger icon? Or keep 2? 1.5 might look elegant.
    }),
  );

  // Construct the full SVG
  // We place the icon at (padding, padding)

  const fullSvg = `
    <svg width="${ICON_SIZE}" height="${ICON_SIZE}" viewBox="0 0 ${ICON_SIZE} ${ICON_SIZE}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${ICON_SIZE}" height="${ICON_SIZE}" fill="${BACKGROUND_COLOR}" />
      <g transform="translate(${padding}, ${padding})">
        ${iconSvg}
      </g>
    </svg>
  `;

  // 2. Generate Base PNG
  const pngBuffer = await sharp(Buffer.from(fullSvg)).png().toBuffer();

  const iconPngPath = path.join(IMAGES_DIR, 'icon.png');
  await sharp(pngBuffer).toFile(iconPngPath);
  console.log(`Generated ${iconPngPath}`);

  // 3. Generate ICO and ICNS using icon-gen
  // icon-gen takes the png directory or file and outputs to destination

  // Create a temporary directory for input if needed, but icon-gen works with a file path usually?
  // Checking icon-gen docs or usage. commonly: icongen(input, destination, options)
  // Input can be a path to a png image.

  // Clean up old directories and files
  const itemsToClean = [
    'android',
    'ios',
    'icon.iconset',
    'icon_master_squircle.png',
    'storealogo.png',
    'tray-icon.png', // incorrectly named
    // Clean up "Square" logos as they appear unused
    'Square30x30Logo.png',
    'Square44x44Logo.png',
    'Square71x71Logo.png',
    'Square89x89Logo.png',
    'Square107x107Logo.png',
    'Square142x142Logo.png',
    'Square150x150Logo.png',
    'Square284x284Logo.png',
    'Square310x310Logo.png',
    'StoreLogo.png',
  ]; // checking casing or existence
  for (const item of itemsToClean) {
    const itemPath = path.join(IMAGES_DIR, item);
    if (fs.existsSync(itemPath)) {
      fs.rmSync(itemPath, { recursive: true, force: true });
      console.log(`Removed old item: ${itemPath}`);
    }
  }

  const options = {
    report: true,
    ico: {
      name: 'icon',
      sizes: [16, 24, 32, 48, 64, 128, 256],
    },
    icns: {
      name: 'icon',
      sizes: [16, 32, 64, 128, 256, 512, 1024],
    },
    favicon: {
      name: 'favicon-',
      pngSizes: [32, 57, 72, 96, 120, 128, 144, 152, 195, 228],
      icoSizes: [16, 24, 32, 48, 64],
    },
  };

  await icongen(iconPngPath, IMAGES_DIR, options);
  console.log('Generated ICO, ICNS, and Favicon files');

  // Generate standard PNGs only
  const standardSizes = [
    { name: '32x32.png', size: 32 },
    { name: '64x64.png', size: 64 },
    { name: '128x128.png', size: 128 },
    { name: '128x128@2x.png', size: 256 },
  ];

  for (const { name, size } of standardSizes) {
    await sharp(pngBuffer).resize(size, size).toFile(path.join(IMAGES_DIR, name));
    console.log(`Generated ${name}`);
  }

  // Generate tray.png (Matched to code requirement)
  const TRAY_SIZE = 24;
  // Code uses 'tray.png'
  const trayIconSvg = renderToStaticMarkup(
    React.createElement(Rocket, {
      size: TRAY_SIZE,
      color: ICON_COLOR, // White
      strokeWidth: 2,
    }),
  );

  const trayPngPath = path.join(IMAGES_DIR, 'tray.png');
  await sharp(Buffer.from(trayIconSvg)).png().toFile(trayPngPath);
  console.log('Generated tray.png');

  // Sync to src/assets
  const SRC_ASSETS_DIR = path.join(process.cwd(), 'src', 'assets');
  if (fs.existsSync(SRC_ASSETS_DIR)) {
    fs.copyFileSync(iconPngPath, path.join(SRC_ASSETS_DIR, 'icon.png'));
    fs.copyFileSync(trayPngPath, path.join(SRC_ASSETS_DIR, 'tray.png'));
    console.log('Synced icon.png and tray.png to src/assets/');
  }
}

generate().catch(console.error);
