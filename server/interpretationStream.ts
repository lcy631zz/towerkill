import type { Express, Request, Response } from "express";
import { z } from "zod";
import { buildDivinationResult } from "./divinationEngine";

const interpretationRequest = z.object({
  question: z.string().trim().min(2).max(300),
  numberA: z.number().int().min(1).max(999),
  numberB: z.number().int().min(1).max(999),
  numberC: z.number().int().min(1).max(999),
  ritualNonce: z.string().min(16).max(64),
  provider: z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("rules") }),
    z.object({ mode: z.literal("custom"), baseUrl: z.string().url(), model: z.string().trim().min(1).max(160), apiKey: z.string().trim().min(1).max(500) }),
    z.object({ mode: z.literal("local"), baseUrl: z.string().url(), model: z.string().trim().min(1).max(160), apiKey: z.string().trim().max(500).optional() }),
  ]).optional().default({ mode: "rules" }),
});

const disclaimer = "娱乐占卜，切勿迷信，结果不构成任何现实决策依据";

function formatSse(res: Response, event: string, payload: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
}

function splitForFallback(text: string) {
  return text.match(/[^，。；！？]+[，。；！？]?/g) ?? [text];
}

function buildPrompt(result: ReturnType<typeof buildDivinationResult>) {
  const cards = result.cards.map(({ card, orientation }, index) => ({
    position: index + 1,
    name: card.name,
    category: card.subtype,
    uprightOrReversed: orientation === "upright" ? "正位（正着）" : "逆位（倒着）",
    gameEffect: card.effect ?? null,
    faction: card.faction ?? null,
    health: card.hp ?? null,
    skills: card.skills ?? null,
    historicalContext: card.story ?? null,
    symbolicKeywords: card.symbolism,
  }));

  return JSON.stringify({
    question: result.question,
    cards,
    meihua: {
      primary: result.plum.primary.name,
      mutual: result.plum.mutual.name,
      changed: result.plum.changed.name,
      movingLine: result.plum.movingLine,
      body: `${result.plum.body.name}（${result.plum.body.element}）`,
      use: `${result.plum.use.name}（${result.plum.use.element}）`,
      relationship: result.plum.relation,
    },
    resonance: findResonance(result.cards),
  }, null, 2);
}

const systemPrompt = `你是“塔罗杀”的中文娱乐解读主持人。你以三国杀的牌面事实、梅花易数的可复算卦象结构，以及“六壬意象旁注”共同编织一段庄重但有趣的文字。

硬性边界：
1. 开头或结尾必须原样出现：${disclaimer}。
2. 这是虚构娱乐内容，不得声称预测真实未来、替用户作出医疗、法律、金融、投资、保险、学业录取、婚姻或重大人生决定。
3. 只能依据输入 JSON 中明确给出的牌面事实、人物典故、象征关键词与卦象结构，不得捏造三国杀技能、历史事件或卦名。
4. “六壬”部分必须命名为“六壬意象旁注”，并明确它是由本次数字、牌面与问事语境形成的娱乐性象征联想，不是传统完整大六壬排盘。
5. 各体系要互相引用同一组牌和卦象，不能分别写成互不相关的段落。
6. 必须解读 resonance 字段：同名牌重复出现说明其势被加倍强调；武将技能与阵中其他牌联动时（如咆哮配连杀、苦肉配桃），必须点破这层呼应。

请使用以下 Markdown 结构，中文约 550–850 字：
### 塔罗 · 三牌叙事
### 梅花易数 · 卦象脉络
### 六壬意象旁注
### 综合结论 · 可尝试的下一步

“下一步”只提供低风险、可撤回、非决定性的行动建议。保持文学感、克制感与适量的三国意象。`;

type QuestionTopic = "感情" | "事业" | "决策" | "时机" | "人际" | "财运" | "心绪";

function detectTopic(question: string): QuestionTopic {
  if (/感情|爱情|喜欢|恋爱|结婚|婚姻|复合|暗恋|对象|桃花|分手|表白/.test(question)) return "感情";
  if (/工作|职业|事业|升职|跳槽|面试|项目|创业|生意|合作/.test(question)) return "事业";
  if (/要不要|该不该|是否|选择|决定|取舍|二选|转|换/.test(question)) return "决策";
  if (/时机|时候|什么时候|多久|等待|拖|缓|急|何时/.test(question)) return "时机";
  if (/朋友|同事|同学|家人|父母|关系|人际|相处|矛盾|吵架/.test(question)) return "人际";
  if (/钱|财|投资|理财|收益|股票|基金|工资|收入/.test(question)) return "财运";
  return "心绪";
}

const TOPIC_OPENING: Record<QuestionTopic, string> = {
  感情: "此问落在情字上",
  事业: "此问落在功业前程",
  决策: "此问正处在两难取舍之间",
  时机: "此问关心的是时与势",
  人际: "此问系于人与人之间的分寸",
  财运: "此问落在财路上",
  心绪: "此问更近于心绪与状态",
};

const CARD_THEMES: Array<[RegExp, Record<QuestionTopic, string>]> = [
  [/^杀$|^决斗$/, {
    感情: "像一场短兵相接，心意要直来直往，藏话只会误事",
    事业: "主主动出击，此刻等不如做，但出手要有章法",
    决策: "牌面催你落子，拖延本身就是一种选择",
    时机: "锋刃已出鞘，时机偏早不偏晚，宜趁势而为",
    人际: "言语间易带锋芒，留三分余地便是留退路",
    财运: "利于主动争取，不宜被动等利",
    心绪: "心中有股憋着的力量，找正当出口放掉它",
  }],
  [/^闪$/, {
    感情: "一方在试探，另一方在回避，节奏没对上",
    事业: "正面硬刚不划算，闪开锋芒再寻空档",
    决策: "先别接招，看清对方底牌再回应",
    时机: "此刻宜闪不宜攻，缓一步反而安全",
    人际: "有人顾左右而言他，不必强求当面说破",
    财运: "见好就收，躲开来路不明的机会",
    心绪: "你在下意识回避什么，先承认它的存在",
  }],
  [/^桃$/, {
    感情: "桃为生机，旧伤有回暖的余地",
    事业: "有回血之象，濒危的事还能救一手",
    决策: "选那条能保住元气的路，别逞强",
    时机: "休整即是准备，养好了再出发不算迟",
    人际: "有人愿意拉你一把，记得接住",
    财运: "先补窟窿再谈进取",
    心绪: "你需要的是休养，不是硬撑",
  }],
  [/过河拆桥/, {
    感情: "旧纽带该拆就拆，留着只会互相牵制",
    事业: "拆解旧结构，才能腾出手做新的",
    决策: "斩断依赖项，选项自然清晰",
    时机: "先清障，后行路",
    人际: "有些关系靠得太近，拆一步反而清爽",
    财运: "先拆旧账，再谈新利",
    心绪: "把牵绊你的旧事一件件放下",
  }],
  [/顺手牵羊/, {
    感情: "缘分有时是顺手的事，别把机会想得太郑重",
    事业: "留意身边顺手的资源，借力不费力",
    决策: "选那条能顺手带走资源的路",
    时机: "机会是顺手出现的，盯太紧反而抓不住",
    人际: "近水楼台，先处好眼前人",
    财运: "小处得利，勿贪大",
    心绪: "放轻松，该来的会顺路经过",
  }],
  [/借刀杀人/, {
    感情: "假手他人传话，容易变了味",
    事业: "善用外部力量，但别把自己摘得太干净",
    决策: "借势不借责，责任终究是自己的",
    时机: "等有外力可借时再动",
    人际: "三角关系里最易生误会",
    财运: "借力生财，须防中间人",
    心绪: "别把情绪外包给别人处理",
  }],
  [/无中生有/, {
    感情: "无中可生有，空白处正是落笔处",
    事业: "从零创造的机会，比抢来的更干净",
    决策: "现有选项都不满意，就造一个新选项",
    时机: "时机不是等来的，是造出来的",
    人际: "主动创造一次交集",
    财运: "开源胜于节流",
    心绪: "你缺的不是答案，是一个新念头",
  }],
  [/无懈可击/, {
    感情: "防御太密，心意进不来",
    事业: "守得稳，但别把防守当战略",
    决策: "你已有破解之法，信它",
    时机: "此刻以守代攻",
    人际: "卸下部分防备，关系才有缝隙",
    财运: "守财为上，拒掉可疑的门路",
    心绪: "安全感给足了，才敢往前走",
  }],
  [/南蛮入侵/, {
    感情: "外部压力闯进来，两人要一致对外",
    事业: "一波冲击人人有份，别单扛",
    决策: "大环境在变，顺势调整胜于固守",
    时机: "风浪将至，先稳住基本盘",
    人际: "群体压力面前，守住自己的节奏",
    财运: "系统性风险，收手观望",
    心绪: "外界的嘈杂不必全接",
  }],
  [/万箭齐发/, {
    感情: "明枪易躲，先把话说在明处",
    事业: "多点受压，先保要害再顾其余",
    决策: "风险齐发之际，选防御最强的那条路",
    时机: "风头正劲，避一避",
    人际: "众口铄金，少辩多听",
    财运: "全线收紧",
    心绪: "四面来风时，先护住心",
  }],
  [/桃园结义/, {
    感情: "桃园之象，主同心与回暖",
    事业: "合伙共事，彼此补位",
    决策: "选那条能聚人的路",
    时机: "人和已备，可以起事",
    人际: "旧谊可续，新盟可结",
    财运: "合则两利",
    心绪: "找回你的同路人",
  }],
  [/五谷丰登/, {
    感情: "选项不少，挑最合心意的那颗",
    事业: "收获期，按次序把成果收入囊中",
    决策: "牌面摊开给你看，先到先得，别谦让",
    时机: "正是收成的时候",
    人际: "共享利益，关系更牢",
    财运: "明牌之利，取之有道",
    心绪: "先盘点你已拥有的",
  }],
  [/闪电/, {
    感情: "变数悬在头顶，但未必劈下来",
    事业: "有惊雷之象，预案先备好",
    决策: "别让侥幸当参谋",
    时机: "天有不测，节奏留余量",
    人际: "情绪雷区，绕着走",
    财运: "高波动，轻仓",
    心绪: "焦虑多来自想象里的雷声",
  }],
  [/乐不思蜀/, {
    感情: "一方乐不思归，另一方在等",
    事业: "停滞之象，事情被搁住了",
    决策: "你被什么困住了，先看清它",
    时机: "暂时动弹不得，莫硬闯",
    人际: "有人在回避推进",
    财运: "资金被套，暂难周转",
    心绪: "舒适区困住的，是你自己",
  }],
  [/诸葛连弩/, {
    感情: "连续表达的机会来了，别只说半句",
    事业: "连发之势，一鼓作气",
    决策: "动作要连贯，半截而废最可惜",
    时机: "窗口期允许你连续出手",
    人际: "多沟通几次，一次说不透",
    财运: "积小胜为大胜",
    心绪: "憋了很久的话，一次说完",
  }],
  [/^(青釭剑|青龙偃月刀|寒冰剑|雌雄双股剑|丈八蛇矛|贯石斧|方天画戟|麒麟弓)$/, {
    感情: "兵刃在手，长处在锋利，也别忘了距离感",
    事业: "工具已备，射程之内皆可为",
    决策: "用好你手里最强的那张牌",
    时机: "器已利，只欠出手",
    人际: "有锋芒是好事，收放由人才是本事",
    财运: "利器善用，收益看距离",
    心绪: "你的优势，比你想的射程更远",
  }],
  [/^(八卦阵|仁王盾)$/, {
    感情: "护具在身，但别让盾挡掉了真心",
    事业: "有屏障可依，稳中求进",
    决策: "选防御更足的一条",
    时机: "有惊无险",
    人际: "边界感清晰，是好事",
    财运: "有护盘之力",
    心绪: "安全感已经具备",
  }],
  [/^(赤兔|的卢|绝影|爪黄飞电|大宛|紫骍)$/, {
    感情: "良马主速度与距离，拉近或走远，看你想要哪个",
    事业: "机动性增强，能跑在别人前面",
    决策: "快一步能抢到主动权",
    时机: "行动半径变大，时机随之变多",
    人际: "距离可调，进退有据",
    财运: "流通生财",
    心绪: "你比想象中更能走远",
  }],
];

const FACTION_READING: Record<string, string> = {
  魏: "魏势主冷静筹谋，先算后战",
  蜀: "蜀势主信义执着，认准了便走到底",
  吴: "吴势主灵活应变，顺势而转",
  群: "群势主独立不羁，不随大流",
};

function cardReading(card: { name: string; kind: string; effect?: string | null; skills?: string | null; story?: string | null; symbolism: string; faction?: string | null; hp?: number | null }, topic: QuestionTopic): string {
  for (const [pattern, readings] of CARD_THEMES) {
    if (pattern.test(card.name)) return readings[topic];
  }
  if (card.faction && FACTION_READING[card.faction]) {
    return `${FACTION_READING[card.faction]}；其人关键词在“${card.symbolism}”`;
  }
  if (card.kind === "health" || /^\d+\/\d+ 体力$/.test(card.name)) {
    return `体力之牌，讲的是元气与余量：${card.symbolism}`;
  }
  if (/^(主公|忠臣|反贼|内奸)/.test(card.name)) {
    return `身份之牌，提示立场与角色：先想清楚自己在此局中是谁`;
  }
  return `此牌关键词在“${card.symbolism}”`;
}

const ELEMENT_WEAK_TO_STRONG: Record<string, string> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
const ELEMENT_STRONG_TO_WEAK: Record<string, string> = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" };

function relationAdvice(bodyElement: string, useElement: string): string {
  const elements = ["木", "火", "土", "金", "水"];
  if (!elements.includes(bodyElement) || !elements.includes(useElement)) {
    return "体用之势未明，宜稳守本心，静观其变";
  }
  if (bodyElement === useElement) return "体用比和，内外一致，按本心推进即可，不必多疑";
  if (ELEMENT_WEAK_TO_STRONG[useElement] === bodyElement) return "用生体，外部环境在给你递力，宜顺势接住，不必客气";
  if (ELEMENT_WEAK_TO_STRONG[bodyElement] === useElement) return "体生用，你在向外输送精力，先掂量这份付出是否值得";
  if (ELEMENT_STRONG_TO_WEAK[useElement] === bodyElement) return "用克体，外来压力实实在在，先稳住自己再谈其他";
  return "体克用，局面在你掌控之中，但仍需按部就班，不可浪掷优势";
}

const CARD_ELEMENT_RULES: Array<[RegExp, string]> = [
  [/^(杀|决斗|借刀杀人|南蛮入侵|万箭齐发)$/, "金"],
  [/^(青釭剑|青龙偃月刀|寒冰剑|雌雄双股剑|丈八蛇矛|贯石斧|方天画戟|麒麟弓|诸葛连弩)$/, "金"],
  [/^(闪|无懈可击|八卦阵|仁王盾)$/, "水"],
  [/^(桃|桃园结义)$/, "木"],
  [/^(无中生有|五谷丰登)$/, "火"],
  [/^(过河拆桥|顺手牵羊|乐不思蜀|闪电)$/, "土"],
  [/^(赤兔|的卢|绝影|爪黄飞电|大宛|紫骍)$/, "水"],
];

const FACTION_ELEMENT: Record<string, string> = { 魏: "水", 蜀: "火", 吴: "木", 群: "土" };
const IDENTITY_ELEMENT: Record<string, string> = { 主公: "土", 忠臣: "火", 反贼: "金", 内奸: "水" };

function cardElement(card: { name: string; kind: string; faction?: string | null }): string | null {
  for (const [pattern, element] of CARD_ELEMENT_RULES) {
    if (pattern.test(card.name)) return element;
  }
  if (card.kind === "general") return card.faction ? FACTION_ELEMENT[card.faction] ?? null : null;
  const identity = Object.keys(IDENTITY_ELEMENT).find((key) => card.name.startsWith(key));
  if (identity) return IDENTITY_ELEMENT[identity];
  return null;
}

const ELEMENT_GENERATES: Record<string, string> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
const ELEMENT_CONQUERS: Record<string, string> = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" };

function hexagramCardEcho(plum: ReturnType<typeof buildDivinationResult>["plum"], cards: ReturnType<typeof buildDivinationResult>["cards"]): { line: string; tone: string } {
  const elements = cards.map(({ card }) => cardElement(card)).filter((e): e is string => e !== null);
  if (elements.length === 0) {
    return { line: `牌阵五行未显，以卦论势：${plum.relation.summary}`, tone: "卦牌之势未明" };
  }
  const counts = new Map<string, number>();
  for (const e of elements) counts.set(e, (counts.get(e) ?? 0) + 1);
  let dominant = elements[0];
  counts.forEach((count, element) => {
    if (count > (counts.get(dominant) ?? 0)) dominant = element;
  });
  const useElement = String(plum.use.element ?? "");
  const cardNames = cards.map(({ card }) => card.name).join("、");
  let cardTone: string;
  let toneShort: string;
  if (dominant === useElement) {
    cardTone = `与用卦${useElement}气同频，内外合拍，卦势与牌势指向一致`;
    toneShort = "内外合拍";
  } else if (ELEMENT_GENERATES[dominant] === useElement) {
    cardTone = `${dominant}气生用卦${useElement}，牌阵在给卦象添力，此势更足`;
    toneShort = "牌阵为卦象添力，此势更足";
  } else if (ELEMENT_GENERATES[useElement] === dominant) {
    cardTone = `${dominant}气泄于用卦${useElement}，牌阵在为局面持续供血，留意消耗`;
    toneShort = "牌阵在持续供血，留意消耗";
  } else if (ELEMENT_CONQUERS[dominant] === useElement) {
    cardTone = `${dominant}气压住用卦${useElement}，牌阵比外势更强，主动权在你`;
    toneShort = "牌阵强于外势，主动权在你";
  } else if (ELEMENT_CONQUERS[useElement] === dominant) {
    cardTone = `用卦${useElement}反克牌阵${dominant}气，外势压牌，出招前先稳住阵脚`;
    toneShort = "外势压牌，宜先稳阵脚";
  } else {
    cardTone = `与用卦${useElement}不相生克，卦牌各走一路，宜分清内外`;
    toneShort = "卦牌各走一路，宜分清内外";
  }
  return {
    line: `三牌五行以**${dominant}**气最盛（${cardNames}），${cardTone}。卦理判词：${plum.relation.summary}`,
    tone: toneShort,
  };
}

// 武将技能与牌面的已知联动：技能名 -> 呼应牌面与判词
const SKILL_CARD_SYNERGY: Array<{ skill: string; cards: RegExp; note: string }> = [
  { skill: "咆哮", cards: /^杀$/, note: "咆哮无视出杀次数，杀势连环，攻势一旦铺开便不会断" },
  { skill: "武圣", cards: /^杀$/, note: "武圣以牌化杀，杀意随取随用，处处皆是锋芒" },
  { skill: "龙胆", cards: /^(杀|闪)$/, note: "龙胆令杀闪互换，攻守一念之间，进退皆有余地" },
  { skill: "裸衣", cards: /^(杀|决斗)$/, note: "裸衣令杀与决斗之威更烈，正面相搏时杀伤倍增" },
  { skill: "苦肉", cards: /^桃$/, note: "苦肉自损换先手，幸好桃在阵中，元气接得住" },
  { skill: "急救", cards: /^桃$/, note: "急救可回天乏术处救人，桃牌在此正是雪中送炭" },
  { skill: "无双", cards: /^(杀|决斗)$/, note: "无双之下杀需双闪、决斗需双杀，短兵相接时占尽上风" },
  { skill: "铁骑", cards: /^杀$/, note: "铁骑令杀势难挡，主动出手时胜算更足" },
  { skill: "奇袭", cards: /^(过河拆桥|顺手牵羊)$/, note: "奇袭以黑色牌行拆牵之事，敌营储备随时可动" },
  { skill: "国色", cards: /^乐不思蜀$/, note: "国色以方片化乐不思蜀，困敌之锁比牌面所示更多" },
];

type DrawnCard = ReturnType<typeof buildDivinationResult>["cards"][number];

function findResonance(cards: DrawnCard[]): { duplicates: string[]; synergies: string[] } {
  const count = new Map<string, number>();
  cards.forEach(({ card }) => count.set(card.name, (count.get(card.name) ?? 0) + 1));
  const duplicates: string[] = [];
  count.forEach((n, name) => {
    if (n >= 2) {
      duplicates.push(n >= 3
        ? `**${name}**三度现身，意象层层叠加，此牌所主之势已成局，不可忽视`
        : `**${name}**两度现身，重复的意象是强调，此牌所主之势在此局中格外吃重`);
    }
  });
  const synergies: string[] = [];
  cards.forEach(({ card }) => {
    if (!card.skills) return;
    String(card.skills).split("、").forEach((skillName) => {
      const rule = SKILL_CARD_SYNERGY.find((r) => r.skill === skillName);
      if (!rule) return;
      const partner = cards.find((c) => c.card.name !== card.name && rule.cards.test(c.card.name));
      if (partner) {
        synergies.push(`**${card.name}**坐镇牌阵，技能「${skillName}」正与阵中**${partner.card.name}**呼应：${rule.note}`);
      }
    });
  });
  return { duplicates, synergies };
}

// 每张牌的象：正逆两套判词，供六壬旁注与综合结论引用
const CARD_IMAGERY: Array<[RegExp, { symbol: string; upright: string; reversed: string }]> = [
  [/^杀$|^决斗$/, { symbol: "刃象", upright: "正面突破的势头可用", reversed: "锋芒宜先收一收" }],
  [/^闪$/, { symbol: "避象", upright: "闪开锋芒，另寻空档", reversed: "回避太久，会错过出手的时机" }],
  [/^桃$/, { symbol: "生象", upright: "生机尚在，元气可补", reversed: "休养不足，先别硬撑" }],
  [/过河拆桥/, { symbol: "拆象", upright: "旧的不去，新的不来", reversed: "牵绊未断，拆不动就先认下它" }],
  [/顺手牵羊/, { symbol: "取象", upright: "近处有顺手的机会", reversed: "贪近利，反失大体" }],
  [/借刀杀人/, { symbol: "借象", upright: "有外力可借", reversed: "借力不成反受制" }],
  [/无中生有/, { symbol: "创象", upright: "空白处正是落笔处", reversed: "底子未备，别急着造势" }],
  [/无懈可击/, { symbol: "守象", upright: "防线严密，守得住", reversed: "守得过头，机会也挡在了门外" }],
  [/南蛮入侵|万箭齐发/, { symbol: "压象", upright: "风浪齐至，先稳基本盘", reversed: "压力渐退，可缓一口气" }],
  [/桃园结义/, { symbol: "和象", upright: "人和回暖，同心可用", reversed: "同路人暂时聚不齐" }],
  [/五谷丰登/, { symbol: "收象", upright: "收成在望，按序取利", reversed: "果实未熟，别抢收" }],
  [/闪电/, { symbol: "惊象", upright: "变数悬顶，预案先行", reversed: "雷声渐远，虚惊居多" }],
  [/乐不思蜀/, { symbol: "困象", upright: "局面被搁住，先看清困住你的是什么", reversed: "困局将解，勿再恋战" }],
  [/诸葛连弩/, { symbol: "连象", upright: "一鼓作气，连招奏效", reversed: "势不能续，宜单发不宜连攻" }],
  [/^(青釭剑|青龙偃月刀|寒冰剑|雌雄双股剑|丈八蛇矛|贯石斧|方天画戟|麒麟弓)$/, { symbol: "器象", upright: "利器在手，长处在射程", reversed: "器虽利，出手的时机未到" }],
  [/^(八卦阵|仁王盾)$/, { symbol: "甲象", upright: "屏障可依，稳中求进", reversed: "护具有隙，别全押在防守上" }],
  [/^(赤兔|的卢|绝影|爪黄飞电|大宛|紫骍)$/, { symbol: "行象", upright: "进退自如，距离可控", reversed: "脚程被绊，先稳阵脚" }],
];

function cardImagery(card: DrawnCard["card"], orientation: DrawnCard["orientation"]): string {
  for (const [pattern, img] of CARD_IMAGERY) {
    if (pattern.test(card.name)) {
      return `${img.symbol}——${orientation === "upright" ? img.upright : img.reversed}`;
    }
  }
  if (card.kind === "general") return `人像——${card.symbolism}`;
  const healthMatch = card.name.match(/^(\d+)\/(\d+) 体力$/);
  if (card.kind === "health" || healthMatch) {
    if (!healthMatch) return `气象——先养元气，再谈进取`;
    const current = Number(healthMatch[1]);
    const max = Number(healthMatch[2]);
    if (current <= 1) return `气象——元气仅余 ${current}/${max}，一丝悬命，风雨都扛不起，先保根本，万事从缓`;
    if (max - current <= 1) return `气象——元气已至 ${current}/${max}，只差一步圆满，底子厚实，进取有据`;
    return `气象——元气 ${current}/${max}，虽有小损但补得回来，不碍大局，稳中可谋`;
  }
  if (/^(主公|忠臣|反贼|内奸)/.test(card.name)) return `位象——立场先定，再论攻守`;
  return `本象——${card.symbolism}`;
}

const MIRROR_BY_TOPIC: Record<QuestionTopic, string> = {
  感情: "情之一字，牌已替你摆出姿态，剩下的只是你敢不敢认",
  事业: "前程的事，牌把关键变量摆上了桌面，缺的只是你落子",
  决策: "两难之所以两难，是因为你心里其实已有答案，牌只是把它照亮",
  时机: "时与势牌上写得明白，难的从来不是等，是忍住不动",
  人际: "人与人的分寸，牌阵照出的那一点，多半就是你避而不谈的那一点",
  财运: "财路上的取舍，牌已给出轮廓，剩下的只是敢不敢按它执行",
  心绪: "心绪之问，牌不解答，只把你自己已经知道的事摆回你面前",
};

// 下一步建议由资源位牌的象推导，不再只认问事类别
const NEXT_STEP_BY_SYMBOL: Record<string, string> = {
  刃象: "挑一件你一直在回避的正面交锋，把它了结",
  避象: "先停一步，把局势的底看清再回应",
  生象: "先修复最损耗你的那一环，再谈进取",
  拆象: "列出还放不下的旧牵绊，挑一件先放下",
  取象: "从最近最顺手的小事做起，先积一胜",
  借象: "想想谁手里有你缺的资源，去开这个口",
  创象: "没有现成选项就自己造一个，先落个草案",
  守象: "检查你的防线，看有没有哪扇门把机会也挡在了外面",
  压象: "把最坏的情况写下来，配一条预案，心就定了",
  和象: "找那位能与你同心的人，把话摊开说",
  收象: "盘点你已到手的东西，按顺序收好",
  惊象: "给悬着的那件事写个预案，雷就不怕了",
  困象: "写下「到底是什么在困住我」，答案落纸即松动",
  连象: "把要说的话一次说完、要做的事一次做完，别拆成三截",
  器象: "把你的最强项，用在射程之内的那件事上",
  甲象: "确认你的边界：什么能碰，什么不能",
  行象: "调整一下距离——走近一步，或退开一步",
};

function nextStepFor(card: DrawnCard["card"]): string {
  const symbol = cardImagery(card, "upright").split("——")[0];
  const step = NEXT_STEP_BY_SYMBOL[symbol];
  if (step) return step;
  if (symbol === "人像") return `想一想「${card.name}」会怎么做，借他一招`;
  if (symbol === "气象") return "先睡好觉、养足元气，别的事缓一步再说";
  if (symbol === "位象") return "先弄清自己在此局中的立场，再决定往哪边落子";
  return `围绕「${card.name}」给你的提示，落一件具体的小事`;
}

const SIGNATURES = [
  "牌面只描摹态势，落子的始终是你",
  "牌只是镜子，照出的路还得你自己走",
  "势在牌上，局在你手里",
];

function buildFallback(result: ReturnType<typeof buildDivinationResult>) {
  const topic = detectTopic(result.question);
  const cards = result.cards;
  const cardDescs = cards.map(({ card, orientation }, index) => {
    const positionName = ["开局处境", "中途阻力", "手中资源"][index] ?? `第 ${index + 1} 位`;
    const stateText = orientation === "upright" ? "正位发力，顺势而为" : "逆位示警，需要先调整姿势";
    return `${positionName}落在**${card.name}**（${orientation === "upright" ? "正位" : "逆位"}）：${cardReading(card, topic)}。${stateText}。`;
  });
  const resonance = findResonance(cards);
  const resonanceNotes = [...resonance.duplicates, ...resonance.synergies];
  if (resonanceNotes.length > 0) {
    cardDescs.push(`牌阵呼应：${resonanceNotes.join("；")}。`);
  }

  const plum = result.plum;
  const bodyElement = String(plum.body.element ?? "");
  const useElement = String(plum.use.element ?? "");
  const advice = relationAdvice(bodyElement, useElement);
  const cardEcho = hexagramCardEcho(plum, cards);
  const imageryLines = cards.map(({ card, orientation }, index) => `${["开局", "阻力", "资源"][index] ?? "本"}位的**${card.name}**呈${cardImagery(card, orientation)}`);
  const reversedCount = cards.filter(({ orientation }) => orientation === "reversed").length;
  const mirror = MIRROR_BY_TOPIC[topic];
  const nextStep = nextStepFor(cards[2].card);
  const signature = SIGNATURES[reversedCount % SIGNATURES.length];
  const closingLine = reversedCount >= 2
    ? `逆位过半（${reversedCount}/3），牌势偏于示警，步子宁可小一些、慢一些，别急着翻盘`
    : reversedCount === 1
      ? "一正一逆之间尚有余地，顺势推进即可，唯独那一处逆位要先理顺"
      : "三牌皆正，牌势顺遂，可以放心往前落子";

  const imagerySymbols = cards.map(({ card, orientation }) => cardImagery(card, orientation).split("——")[0]);
  const relationKind = String(plum.relation.kind ?? "");
  const finalByRelation: Record<string, string> = {
    比和: `内外节奏一致，可依本心推进，把「${cards[2].card.name}」之势用在刀刃上`,
    用生体: `外力正在递力，顺势接住，再借「${cards[2].card.name}」加码`,
    体生用: `你在向外耗力，先用「${cards[2].card.name}」稳住自身，再谈付出`,
    用克体: `外压实实在在，先守后动，「${cards[2].card.name}」是眼下最该倚仗的`,
    体克用: `局面在你掌中，按部就班，以「${cards[2].card.name}」开路`,
  };
  const finalAdvice = finalByRelation[relationKind] ?? `体用之势未明，稳守本心，以「${cards[2].card.name}」为先手`;
  const resonanceLine = resonanceNotes.length > 0 ? `；更有牌阵呼应：${resonanceNotes.join("；")}` : "";

  return `### 塔罗 · 三牌叙事
你的问题是「${result.question}」。${TOPIC_OPENING[topic]}，三张牌依次展开：

${cardDescs.join("\n\n")}

### 梅花易数 · 卦象脉络
本卦**${plum.primary.name}**，互卦**${plum.mutual.name}**，变卦**${plum.changed.name}**，第 ${plum.movingLine} 爻动。体卦${plum.body.name}（${plum.body.element}），用卦${plum.use.name}（${plum.use.element}）。${advice}。${cardEcho.line}

### 六壬意象旁注
这不是传统完整大六壬排盘，而是以本次牌面与问事语境作的娱乐性象征联想。${TOPIC_OPENING[topic]}，三牌各呈其象：${imageryLines.join("；")}。${mirror}。

### 综合结论 · 可尝试的下一步
${closingLine}。把上面的解读合拢来看：叙事上开局「${cards[0].card.name}」呈${imagerySymbols[0]}，行至「${cards[1].card.name}」呈${imagerySymbols[1]}，所幸手中还有「${cards[2].card.name}」呈${imagerySymbols[2]}；卦象判**${relationKind || "未明"}**；牌气上，${cardEcho.tone}${resonanceLine}。由此观之：${finalAdvice}。${nextStep}。${signature}。

> ${disclaimer}`;
}

function toCompletionUrl(baseUrl: string) {
  const parsed = new URL(baseUrl);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error("invalid provider protocol");
  const clean = baseUrl.replace(/\/$/, "");
  return clean.endsWith("/chat/completions") ? clean : `${clean}/chat/completions`;
}

function isLocalHost(baseUrl: string) {
  const host = new URL(baseUrl).hostname;
  return host === "127.0.0.1" || host === "localhost" || host === "::1";
}

// qwen3 等思考模型默认先推理后作答，思考会挤占 token 预算、拖慢首字，解读类任务无需推理
function isThinkingModel(model: string) {
  return /qwen3/i.test(model);
}

export function registerInterpretationStream(app: Express) {
  app.post("/api/interpretation/stream", async (req: Request, res: Response) => {
    const parsed = interpretationRequest.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "占卜参数不完整或不在允许范围内。" });
    }

    const result = buildDivinationResult(parsed.data, parsed.data.ritualNonce);
    let finished = false;
    const controller = new AbortController();
    const finish = () => {
      if (finished) return;
      finished = true;
      res.end();
    };

    res.status(200);
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    res.on("close", () => {
      if (!finished) controller.abort();
    });

    try {
      if (parsed.data.provider.mode === "rules") {
        for (const chunk of splitForFallback(buildFallback(result))) formatSse(res, "delta", { text: chunk });
        formatSse(res, "notice", { text: "规则本机模式：未调用任何大模型；文本由牌面、卦象和预设模板组合生成。" });
        return;
      }

      const provider = parsed.data.provider;
      if (provider.mode === "custom" && new URL(provider.baseUrl).protocol !== "https:") throw new Error("custom API must use HTTPS");
      if (provider.mode === "local" && !isLocalHost(provider.baseUrl)) throw new Error("local mode must use localhost");
      const endpoint = toCompletionUrl(provider.baseUrl);
      const apiKey = provider.apiKey;
      const model = provider.model;
      formatSse(res, "status", { text: `正在连接解读服务（${model}${isThinkingModel(model) ? " · 已关闭思考" : ""}）…` });
      const upstream = await fetch(endpoint, {
        method: "POST",
        signal: controller.signal,
        headers: { "content-type": "application/json", ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}) },
        body: JSON.stringify({
          model,
          stream: true,
          max_completion_tokens: 1800,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: buildPrompt(result) },
          ],
          ...(isThinkingModel(model) ? { chat_template_kwargs: { enable_thinking: false } } : {}),
        }),
      });

      if (!upstream.ok || !upstream.body) throw new Error(`upstream returned ${upstream.status}`);
      formatSse(res, "status", { text: "已连通，等待模型开始输出…" });

      const contentType = upstream.headers.get("content-type") || "";
      if (!contentType.includes("text/event-stream")) {
        const payload = await upstream.json();
        const content = payload?.choices?.[0]?.message?.content;
        if (typeof content !== "string") throw new Error("upstream response did not include interpretation text");
        formatSse(res, "status", { text: "模型已返回完整解读，正在写入终端…" });
        for (const chunk of splitForFallback(content)) formatSse(res, "delta", { text: chunk });
      } else {
        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let announced = false;
        while (!finished) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (!data || data === "[DONE]") continue;
            try {
              const event = JSON.parse(data);
              const text = event?.choices?.[0]?.delta?.content;
              if (typeof text === "string" && text.length > 0) {
              if (!announced) { announced = true; formatSse(res, "status", { text: "模型正在生成，流式输出中…" }); }
              formatSse(res, "delta", { text });
            }
            } catch {
              // Ignore partial/non-content SSE payloads from the compatible upstream.
            }
          }
        }
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        formatSse(res, "status", { text: "模型调用未成功，改用本机规则解读…" });
        for (const chunk of splitForFallback(buildFallback(result))) formatSse(res, "delta", { text: chunk });
        formatSse(res, "notice", { text: "实时解读暂不可用，已展示基于本次牌面和卦象的本地娱乐解读。" });
      }
    } finally {
      if (!controller.signal.aborted) { formatSse(res, "status", { text: "完成" }); formatSse(res, "done", { seedFingerprint: result.seedFingerprint }); }
      finish();
    }
  });
}
