import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const iconsDir = path.join(root, "public", "icons");
const source = await readFile(path.join(iconsDir, "icon.svg"), "utf8");

const maskable = source
  .replaceAll('rx="118"', 'rx="0"')
  .replace(/\s*<rect\s+x="1\.5"[\s\S]*?\/>/, "");

async function render(svg, size, file) {
  const png = await sharp(Buffer.from(svg), { density: 384 })
    .resize(size, size, { fit: "cover" })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(path.join(iconsDir, file), png);
  console.log(`✓ ${file} (${size}×${size})`);
}

await render(source, 512, "icon-512.png");
await render(source, 192, "icon-192.png");
await render(maskable, 512, "icon-maskable-512.png");
await render(maskable, 192, "icon-maskable-192.png");
await render(maskable, 180, "apple-touch-icon.png");
await writeFile(path.join(iconsDir, "icon-maskable.svg"), maskable);
console.log("✓ icon-maskable.svg");
