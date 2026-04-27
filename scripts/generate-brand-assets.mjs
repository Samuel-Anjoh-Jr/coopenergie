import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const webPublicDir = path.join(root, "apps", "web", "public");
const webLogoDir = path.join(webPublicDir, "logo");
const mobileAssetsDir = path.join(root, "apps", "mobile", "assets");

const fullPngPath = path.join(webLogoDir, "coopenergie-logo-full.png");
const iconPngPath = path.join(webLogoDir, "coopenergie-logo-icon.png");

function svgWrapperFromPng(base64Png, width, height) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="CoopEnergie logo">\n  <image href="data:image/png;base64,${base64Png}" width="${width}" height="${height}" />\n</svg>\n`;
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function buildSvgPrimaryFromPng(pngPath, svgPath) {
  const pngBuffer = await fs.readFile(pngPath);
  const metadata = await sharp(pngBuffer).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error(`Unable to read dimensions for ${pngPath}`);
  }

  const svg = svgWrapperFromPng(
    pngBuffer.toString("base64"),
    metadata.width,
    metadata.height,
  );

  await fs.writeFile(svgPath, svg, "utf8");
}

async function resizePng(
  inputPath,
  outputPath,
  width,
  height,
  fit = "contain",
) {
  await sharp(inputPath)
    .resize({ width, height, fit, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(outputPath);
}

async function buildSplashAsset(fullLogoPath, outputPath) {
  const canvasWidth = 1242;
  const canvasHeight = 2436;
  const logoWidth = 860;

  const fullLogo = await sharp(fullLogoPath)
    .resize({ width: logoWidth, fit: "contain" })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4,
      background: { r: 248, g: 250, b: 252, alpha: 1 },
    },
  })
    .composite([
      {
        input: fullLogo,
        gravity: "center",
      },
    ])
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(outputPath);
}

async function run() {
  await ensureDir(webLogoDir);
  await ensureDir(mobileAssetsDir);

  await buildSvgPrimaryFromPng(
    fullPngPath,
    path.join(webLogoDir, "coopenergie-logo-full.svg"),
  );
  await buildSvgPrimaryFromPng(
    iconPngPath,
    path.join(webLogoDir, "coopenergie-logo-icon.svg"),
  );

  // Web + PWA icon set
  await resizePng(
    iconPngPath,
    path.join(webPublicDir, "favicon-16x16.png"),
    16,
    16,
  );
  await resizePng(
    iconPngPath,
    path.join(webPublicDir, "favicon-32x32.png"),
    32,
    32,
  );
  await resizePng(
    iconPngPath,
    path.join(webPublicDir, "apple-touch-icon.png"),
    180,
    180,
  );
  await resizePng(
    iconPngPath,
    path.join(webPublicDir, "icon-192x192.png"),
    192,
    192,
  );
  await resizePng(
    iconPngPath,
    path.join(webPublicDir, "icon-512x512.png"),
    512,
    512,
  );
  await resizePng(
    iconPngPath,
    path.join(webPublicDir, "icon-maskable-512x512.png"),
    512,
    512,
  );
  await resizePng(
    iconPngPath,
    path.join(webPublicDir, "icon-light-32x32.png"),
    32,
    32,
  );
  await resizePng(
    iconPngPath,
    path.join(webPublicDir, "icon-dark-32x32.png"),
    32,
    32,
  );

  // Keep root icon.svg synced for existing references.
  await fs.copyFile(
    path.join(webLogoDir, "coopenergie-logo-icon.svg"),
    path.join(webPublicDir, "icon.svg"),
  );

  // Expo assets
  await resizePng(
    iconPngPath,
    path.join(mobileAssetsDir, "icon.png"),
    1024,
    1024,
  );
  await resizePng(
    iconPngPath,
    path.join(mobileAssetsDir, "adaptive-icon.png"),
    1024,
    1024,
  );
  await resizePng(
    iconPngPath,
    path.join(mobileAssetsDir, "favicon.png"),
    64,
    64,
  );
  await resizePng(
    fullPngPath,
    path.join(mobileAssetsDir, "logo-full.png"),
    728,
    179,
  );
  await buildSplashAsset(fullPngPath, path.join(mobileAssetsDir, "splash.png"));

  console.log("Brand assets generated successfully.");
}

run().catch((error) => {
  console.error("Failed to generate brand assets:", error);
  process.exitCode = 1;
});
