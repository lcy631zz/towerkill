import fs from "node:fs/promises";
import path from "node:path";

const CARD_ID = /^(game|general|identity|health)-\d{3}$/;
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

function fail(message) {
  throw new Error(`素材包无效：${message}`);
}

export function validateManifest(manifest) {
  if (!manifest || typeof manifest !== "object") fail("manifest.json 必须是对象。");
  if (manifest.schemaVersion !== 1) fail("仅支持 schemaVersion: 1。");
  if (!manifest.cards || typeof manifest.cards !== "object" || Array.isArray(manifest.cards)) fail("cards 必须是对象映射。");

  const cards = {};
  for (const [cardId, relativePath] of Object.entries(manifest.cards)) {
    if (!CARD_ID.test(cardId)) fail(`不支持的实体牌 ID：${cardId}`);
    if (typeof relativePath !== "string" || relativePath.length === 0) fail(`${cardId} 缺少图片路径。`);
    const normalized = path.posix.normalize(relativePath.replaceAll("\\", "/"));
    if (normalized.startsWith("../") || normalized === ".." || path.posix.isAbsolute(normalized)) fail(`${cardId} 的图片路径越出了素材文件夹。`);
    if (!IMAGE_EXTENSIONS.has(path.posix.extname(normalized).toLowerCase())) fail(`${cardId} 仅支持 PNG、JPG、JPEG 或 WEBP。`);
    cards[cardId] = normalized;
  }
  return cards;
}

export async function loadAssetPack(folderPath) {
  const manifestPath = path.join(folderPath, "manifest.json");
  let manifest;
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  } catch {
    fail("未读取到有效的 manifest.json。");
  }

  const manifestCards = validateManifest(manifest);
  const cards = {};
  const missing = [];
  for (const [cardId, relativePath] of Object.entries(manifestCards)) {
    const absolutePath = path.resolve(folderPath, ...relativePath.split("/"));
    if (!absolutePath.startsWith(`${path.resolve(folderPath)}${path.sep}`)) fail(`${cardId} 的路径越出了素材文件夹。`);
    try {
      const stat = await fs.stat(absolutePath);
      if (!stat.isFile()) throw new Error("not a file");
      cards[cardId] = absolutePath;
    } catch {
      missing.push(cardId);
    }
  }
  if (Object.keys(cards).length === 0) fail("manifest 中没有指向有效图片的条目。");
  return { cards, missing, folderPath: path.resolve(folderPath) };
}
