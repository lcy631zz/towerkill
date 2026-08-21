import fs from "node:fs/promises";
import path from "node:path";

const CARD_ID = /^(game|general|identity|health)-\d{3}$/;
const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

const NAME_TO_IDS = {"杀": ["game-001", "game-002", "game-003", "game-004", "game-005", "game-006", "game-007", "game-008", "game-009", "game-010", "game-011", "game-012", "game-013", "game-014", "game-015", "game-016", "game-017", "game-018", "game-019", "game-020", "game-021", "game-022", "game-023", "game-024", "game-025", "game-026", "game-027", "game-028", "game-029", "game-030"], "闪": ["game-031", "game-032", "game-033", "game-034", "game-035", "game-036", "game-037", "game-038", "game-039", "game-040", "game-041", "game-042", "game-043", "game-044", "game-045"], "桃": ["game-046", "game-047", "game-048", "game-049", "game-050", "game-051", "game-052", "game-053"], "过河拆桥": ["game-054", "game-055", "game-056", "game-057", "game-058", "game-059"], "顺手牵羊": ["game-060", "game-061", "game-062", "game-063", "game-064"], "决斗": ["game-065", "game-066", "game-067"], "借刀杀人": ["game-068", "game-069"], "无中生有": ["game-070", "game-071", "game-072", "game-073"], "无懈可击": ["game-074", "game-075", "game-076", "game-077"], "南蛮入侵": ["game-078", "game-079", "game-080"], "万箭齐发": ["game-081"], "桃园结义": ["game-082"], "五谷丰登": ["game-083", "game-084"], "闪电": ["game-085", "game-086"], "乐不思蜀": ["game-087", "game-088", "game-089"], "诸葛连弩": ["game-090", "game-091"], "青釭剑": ["game-092"], "寒冰剑": ["game-093"], "雌雄双股剑": ["game-094"], "青龙偃月刀": ["game-095"], "丈八蛇矛": ["game-096"], "贯石斧": ["game-097"], "方天画戟": ["game-098"], "麒麟弓": ["game-099"], "八卦阵": ["game-100", "game-101"], "仁王盾": ["game-102"], "的卢": ["game-103"], "绝影": ["game-104"], "爪黄飞电": ["game-105"], "赤兔": ["game-106"], "大宛": ["game-107"], "紫骍": ["game-108"], "曹操": ["general-001"], "司马懿": ["general-002"], "夏侯惇": ["general-003"], "张辽": ["general-004"], "许褚": ["general-005"], "郭嘉": ["general-006"], "甄姬": ["general-007"], "刘备": ["general-008"], "关羽": ["general-009"], "张飞": ["general-010"], "诸葛亮": ["general-011"], "赵云": ["general-012"], "马超": ["general-013"], "黄月英": ["general-014"], "孙权": ["general-015"], "甘宁": ["general-016"], "吕蒙": ["general-017"], "黄盖": ["general-018"], "周瑜": ["general-019"], "大乔": ["general-020"], "陆逊": ["general-021"], "孙尚香": ["general-022"], "华佗": ["general-023"], "吕布": ["general-024"], "貂蝉": ["general-025"], "华雄": ["general-026"], "袁术": ["general-027"], "主公": ["role-主公-1"], "忠臣": ["role-忠臣-1", "role-忠臣-2", "role-忠臣-3"], "反贼": ["role-反贼-1", "role-反贼-2", "role-反贼-3", "role-反贼-4"], "内奸": ["role-内奸-1", "role-内奸-2"], "1/2 体力": ["health-1-1"], "3/4 体力": ["health-3-1", "health-3-2", "health-3-3", "health-3-4", "health-3-5", "health-3-6", "health-3-7", "health-3-8"], "4/5 体力": ["health-4-1", "health-4-2"]};
const ENGLISH_TO_IDS = {"Attack": ["game-001", "game-002", "game-003", "game-004", "game-005", "game-006", "game-007", "game-008", "game-009", "game-010", "game-011", "game-012", "game-013", "game-014", "game-015", "game-016", "game-017", "game-018", "game-019", "game-020", "game-021", "game-022", "game-023", "game-024", "game-025", "game-026", "game-027", "game-028", "game-029", "game-030"], "Escape": ["game-031", "game-032", "game-033", "game-034", "game-035", "game-036", "game-037", "game-038", "game-039", "game-040", "game-041", "game-042", "game-043", "game-044", "game-045"], "Peach": ["game-046", "game-047", "game-048", "game-049", "game-050", "game-051", "game-052", "game-053"], "Duel": ["game-065", "game-066", "game-067"], "Capture": ["game-068", "game-069"], "Draw Two": ["game-070", "game-071", "game-072", "game-073"], "Negate": ["game-074", "game-075", "game-076", "game-077"], "Barbarians": ["game-078", "game-079", "game-080"], "Hail of Arrows": ["game-081"], "Peach Garden": ["game-082"], "Harvest": ["game-083", "game-084"], "Lightning": ["game-085", "game-086"], "Break": ["game-054", "game-055", "game-056", "game-057", "game-058", "game-059"], "Steal": ["game-060", "game-061", "game-062", "game-063", "game-064"], "Crossbow": ["game-090", "game-091"], "Ice Sword": ["game-093"], "Gender Swords": ["game-094"], "Green Dragon Blade": ["game-095"], "Serpent Spear": ["game-096"], "Axe": ["game-097"], "Sky Scorcher": ["game-098"], "Longbow": ["game-099"], "Eight Trigrams": ["game-100", "game-101"], "Black Shield": ["game-102"], "Di Lu": ["game-103"], "Shadow Runner": ["game-104"], "Hua Liu": ["game-105"], "Red Hare": ["game-106"], "Da Yuan": ["game-107"], "Zi Xing": ["game-108"], "Starvation": ["game-087", "game-088", "game-089"], "Ancient Scimitar": ["game-092"], "Cao Cao": ["general-001"], "Sima Yi": ["general-002"], "Xiahou Dun": ["general-003"], "Zhang Liao": ["general-004"], "Xu Chu": ["general-005"], "Guo Jia": ["general-006"], "Zhen Ji": ["general-007"], "Liu Bei": ["general-008"], "Guan Yu": ["general-009"], "Zhang Fei": ["general-010"], "Zhuge Liang": ["general-011"], "Zhao Yun": ["general-012"], "Ma Chao": ["general-013"], "Huang Yue Ying": ["general-014"], "Sun Quan": ["general-015"], "Gan Ning": ["general-016"], "Lu Meng": ["general-017"], "Huang Gai": ["general-018"], "Zhou Yu": ["general-019"], "Da Qiao": ["general-020"], "Lu Xun": ["general-021"], "Sun Shang Xiang": ["general-022"], "Hua Tuo": ["general-023"], "Lu Bu": ["general-024"], "Diao Chan": ["general-025"], "Hua Xiong": ["general-026"], "Yuan Shu": ["general-027"], "King": ["role-主公-1"], "Loyalist": ["role-忠臣-1", "role-忠臣-2", "role-忠臣-3"], "Rebel": ["role-反贼-1", "role-反贼-2", "role-反贼-3", "role-反贼-4"], "Spy": ["role-内奸-1", "role-内奸-2"]};

function fail(message) {
  throw new Error(`素材包无效：${message}`);
}

function normalizeName(name) {
  return name.toLowerCase().replace(/[-_\s]+/g, "").trim();
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
    if (normalized.startsWith("../") || normalized === ".." || path.posix.isAbsolute(normalized)) fail(`${cardId} 的路径越出了素材文件夹。`);
    if (!IMAGE_EXTENSIONS.includes(path.posix.extname(normalized).toLowerCase())) fail(`${cardId} 仅支持 PNG、JPG、JPEG 或 WEBP。`);
    cards[cardId] = normalized;
  }
  return cards;
}

async function walkImages(folderPath) {
  const images = [];
  const stack = [folderPath];

  while (stack.length > 0) {
    const current = stack.pop();
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (IMAGE_EXTENSIONS.includes(ext)) {
          images.push(fullPath);
        }
      }
    }
  }

  return images;
}

function getRelativePath(folderPath, absolutePath) {
  const rel = path.relative(folderPath, absolutePath);
  return rel.replaceAll("\\", "/");
}

function findIdsByName(name) {
  const normalized = normalizeName(name);

  // 1. Direct Chinese name match
  for (const [cn, ids] of Object.entries(NAME_TO_IDS)) {
    if (normalizeName(cn) === normalized) return [...ids];
  }

  // 2. English name match
  for (const [en, ids] of Object.entries(ENGLISH_TO_IDS)) {
    if (normalizeName(en) === normalized) return [...ids];
  }

  return [];
}

export async function detectAssetPack(folderPath) {
  folderPath = path.resolve(folderPath);
  const allImages = await walkImages(folderPath);
  const idToPath = new Map();
  const unmatched = [];

  for (const imagePath of allImages) {
    const fileName = path.basename(imagePath);
    const nameWithoutExt = path.basename(fileName, path.extname(fileName));
    const relative = getRelativePath(folderPath, imagePath);

    const lowerName = nameWithoutExt.toLowerCase();
    if (lowerName.includes("back") || lowerName.includes("frame") || lowerName.includes("background")) {
      continue;
    }

    // 1. Direct ID match: game-001.png -> game-001
    if (CARD_ID.test(nameWithoutExt)) {
      if (!idToPath.has(nameWithoutExt)) {
        idToPath.set(nameWithoutExt, imagePath);
      }
      continue;
    }

    // 2. Name-based match (Chinese or English)
    const ids = findIdsByName(nameWithoutExt);
    if (ids.length > 0) {
      for (const id of ids) {
        if (!idToPath.has(id)) {
          idToPath.set(id, imagePath);
        }
      }
      continue;
    }

    // 3. Try to extract ID from filename like game-001-extra.png
    const idInName = nameWithoutExt.match(/(game|general|identity|health)-\d{3}/);
    if (idInName) {
      if (!idToPath.has(idInName[0])) {
        idToPath.set(idInName[0], imagePath);
      }
      continue;
    }

    unmatched.push(relative);
  }

  if (idToPath.size === 0) {
    fail("未在素材文件夹中检测到有效的卡牌图片。");
  }

  const cards = {};
  const missing = [];
  for (const [id, imagePath] of idToPath) {
    cards[id] = imagePath;
  }

  return { cards, missing, folderPath };
}

export async function loadAssetPack(folderPath) {
  folderPath = path.resolve(folderPath);
  const manifestPath = path.join(folderPath, "manifest.json");

  let manifestCards = null;
  try {
    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    manifestCards = validateManifest(manifest);
  } catch (err) {
    if (err.message && err.message.includes("素材包无效")) {
      throw err;
    }
    return detectAssetPack(folderPath);
  }

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
  return { cards, missing, folderPath };
}
