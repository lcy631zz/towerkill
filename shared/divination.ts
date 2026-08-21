export type Element = "木" | "火" | "土" | "金" | "水";

export type Trigram = {
  id: number;
  name: string;
  symbol: string;
  element: Element;
  code: number;
};

export type Hexagram = {
  upper: Trigram;
  lower: Trigram;
  name: string;
  code: number;
};

export type ElementRelation = {
  kind: "比和" | "体生用" | "用生体" | "体克用" | "用克体";
  summary: string;
};

export type PlumBlossomResult = {
  upper: Trigram;
  lower: Trigram;
  movingLine: number;
  primary: Hexagram;
  mutual: Hexagram;
  changed: Hexagram;
  body: Trigram;
  use: Trigram;
  relation: ElementRelation;
};

const trigrams: Record<number, Trigram> = {
  1: { id: 1, name: "乾", symbol: "☰", element: "金", code: 7 },
  2: { id: 2, name: "兑", symbol: "☱", element: "金", code: 3 },
  3: { id: 3, name: "离", symbol: "☲", element: "火", code: 5 },
  4: { id: 4, name: "震", symbol: "☳", element: "木", code: 1 },
  5: { id: 5, name: "巽", symbol: "☴", element: "木", code: 6 },
  6: { id: 6, name: "坎", symbol: "☵", element: "水", code: 2 },
  7: { id: 7, name: "艮", symbol: "☶", element: "土", code: 4 },
  8: { id: 8, name: "坤", symbol: "☷", element: "土", code: 0 },
};

const trigramByCode = Object.values(trigrams).reduce<Record<number, Trigram>>((result, trigram) => {
  result[trigram.code] = trigram;
  return result;
}, {});

const hexagramNames: Record<string, string> = {
  "1-1": "乾为天", "1-2": "天泽履", "1-3": "天火同人", "1-4": "天雷无妄", "1-5": "天风姤", "1-6": "天水讼", "1-7": "天山遁", "1-8": "天地否",
  "2-1": "泽天夬", "2-2": "兑为泽", "2-3": "泽火革", "2-4": "泽雷随", "2-5": "泽风大过", "2-6": "泽水困", "2-7": "泽山咸", "2-8": "泽地萃",
  "3-1": "火天大有", "3-2": "火泽睽", "3-3": "离为火", "3-4": "火雷噬嗑", "3-5": "火风鼎", "3-6": "火水未济", "3-7": "火山旅", "3-8": "火地晋",
  "4-1": "雷天大壮", "4-2": "雷泽归妹", "4-3": "雷火丰", "4-4": "震为雷", "4-5": "雷风恒", "4-6": "雷水解", "4-7": "雷山小过", "4-8": "雷地豫",
  "5-1": "风天小畜", "5-2": "风泽中孚", "5-3": "风火家人", "5-4": "风雷益", "5-5": "巽为风", "5-6": "风水涣", "5-7": "风山渐", "5-8": "风地观",
  "6-1": "水天需", "6-2": "水泽节", "6-3": "水火既济", "6-4": "水雷屯", "6-5": "水风井", "6-6": "坎为水", "6-7": "水山蹇", "6-8": "水地比",
  "7-1": "山天大畜", "7-2": "山泽损", "7-3": "山火贲", "7-4": "山雷颐", "7-5": "山风蛊", "7-6": "山水蒙", "7-7": "艮为山", "7-8": "山地剥",
  "8-1": "地天泰", "8-2": "地泽临", "8-3": "地火明夷", "8-4": "地雷复", "8-5": "地风升", "8-6": "地水师", "8-7": "地山谦", "8-8": "坤为地",
};

const generates: Record<Element, Element> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
const conquers: Record<Element, Element> = { 木: "土", 火: "金", 土: "水", 金: "木", 水: "火" };

export function normalizeToRange(value: number, divisor: number) {
  return ((value - 1) % divisor + divisor) % divisor + 1;
}

export function getTrigram(value: number): Trigram {
  return trigrams[normalizeToRange(value, 8)];
}

function getHexagram(upper: Trigram, lower: Trigram): Hexagram {
  return {
    upper,
    lower,
    name: hexagramNames[`${upper.id}-${lower.id}`],
    code: lower.code | (upper.code << 3),
  };
}

function getElementRelation(body: Trigram, use: Trigram): ElementRelation {
  if (body.element === use.element) {
    return { kind: "比和", summary: "体用比和：内外节奏相近，宜顺势厘清重点。" };
  }
  if (generates[body.element] === use.element) {
    return { kind: "体生用", summary: "体生用：需要主动投入，但也应留意精力的边界。" };
  }
  if (generates[use.element] === body.element) {
    return { kind: "用生体", summary: "用生体：外部条件可形成助力，宜善用协作与资源。" };
  }
  if (conquers[body.element] === use.element) {
    return { kind: "体克用", summary: "体克用：自身仍有掌控空间，适合以清晰行动推动局面。" };
  }
  return { kind: "用克体", summary: "用克体：外部牵制较多，宜先防守、审慎判断再行动。" };
}

function getMutualHexagram(primary: Hexagram): Hexagram {
  const primaryCode = primary.code;
  const lowerCode = (primaryCode >> 1) & 0b111;
  const upperCode = (primaryCode >> 2) & 0b111;
  return getHexagram(trigramByCode[upperCode], trigramByCode[lowerCode]);
}

function getChangedHexagram(primary: Hexagram, movingLine: number): Hexagram {
  const changedCode = primary.code ^ (1 << (movingLine - 1));
  const lowerCode = changedCode & 0b111;
  const upperCode = (changedCode >> 3) & 0b111;
  return getHexagram(trigramByCode[upperCode], trigramByCode[lowerCode]);
}

export function calculatePlumBlossom(a: number, b: number, c: number): PlumBlossomResult {
  const upper = getTrigram(a);
  const lower = getTrigram(b);
  const movingLine = normalizeToRange(c, 6);
  const primary = getHexagram(upper, lower);
  const body = movingLine <= 3 ? upper : lower;
  const use = movingLine <= 3 ? lower : upper;

  return {
    upper,
    lower,
    movingLine,
    primary,
    mutual: getMutualHexagram(primary),
    changed: getChangedHexagram(primary, movingLine),
    body,
    use,
    relation: getElementRelation(body, use),
  };
}

export function hashToUint32(text: string) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createRitualSeed(question: string, a: number, b: number, c: number, nonce: string) {
  return hashToUint32(`${question.trim()}|${a}|${b}|${c}|${nonce}`);
}

export function createSeededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(items: readonly T[], seed: number) {
  const result = [...items];
  const random = createSeededRandom(seed);
  for (let index = result.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(random() * (index + 1));
    [result[index], result[nextIndex]] = [result[nextIndex], result[index]];
  }
  return result;
}

export function drawThree<T>(items: readonly T[], seed: number) {
  const random = createSeededRandom(seed ^ 0x9e3779b9);
  return seededShuffle(items, seed).slice(0, 3).map((card) => ({
    card,
    orientation: random() >= 0.5 ? ("upright" as const) : ("reversed" as const),
  }));
}
