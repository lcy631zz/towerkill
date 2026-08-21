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
  }, null, 2);
}

const systemPrompt = `你是“塔罗杀”的中文娱乐解读主持人。你以三国杀的牌面事实、梅花易数的可复算卦象结构，以及“六壬意象旁注”共同编织一段庄重但有趣的文字。

硬性边界：
1. 开头或结尾必须原样出现：${disclaimer}。
2. 这是虚构娱乐内容，不得声称预测真实未来、替用户作出医疗、法律、金融、投资、保险、学业录取、婚姻或重大人生决定。
3. 只能依据输入 JSON 中明确给出的牌面事实、人物典故、象征关键词与卦象结构，不得捏造三国杀技能、历史事件或卦名。
4. “六壬”部分必须命名为“六壬意象旁注”，并明确它是由本次数字、牌面与问事语境形成的娱乐性象征联想，不是传统完整大六壬排盘。
5. 各体系要互相引用同一组牌和卦象，不能分别写成互不相关的段落。

请使用以下 Markdown 结构，中文约 550–850 字：
### 塔罗 · 三牌叙事
### 梅花易数 · 卦象脉络
### 六壬意象旁注
### 综合结论 · 可尝试的下一步

“下一步”只提供低风险、可撤回、非决定性的行动建议。保持文学感、克制感与适量的三国意象。`;

function buildFallback(result: ReturnType<typeof buildDivinationResult>) {
  const cardNames = result.cards.map(({ card }) => card.name).join("、");
  return `### 塔罗 · 三牌叙事\n本次牌面依次落在**${cardNames}**。它们像一段从处境、阻力到可用资源的叙事：先承认眼前的张力，再寻找可以重新调度的空间。正逆位提示的不是吉凶定论，而是同一力量在“顺势发挥”与“需要调整”之间的不同状态。\n\n### 梅花易数 · 卦象脉络\n本卦为**${result.plum.primary.name}**，互卦为**${result.plum.mutual.name}**，变卦为**${result.plum.changed.name}**；第 ${result.plum.movingLine} 爻动。体为${result.plum.body.name}，用为${result.plum.use.name}，呈现“${result.plum.relation.kind}”之象：${result.plum.relation.summary}\n\n### 六壬意象旁注\n这不是传统完整大六壬排盘，而是以本次数字、牌面和问事语境作的娱乐性象征联想：不必急于把所有线索一次看透，先把最能影响局面的一个动作放在可掌控的尺度里。\n\n### 综合结论 · 可尝试的下一步\n将问题拆成一个能在一两天内验证的小步骤：补一条信息、写下两个选项，或与可信的人做一次具体沟通。让行动给你新的证据，而不是把一次抽牌当作结论。\n\n> ${disclaimer}`;
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
        }),
      });

      if (!upstream.ok || !upstream.body) throw new Error(`upstream returned ${upstream.status}`);

      const contentType = upstream.headers.get("content-type") || "";
      if (!contentType.includes("text/event-stream")) {
        const payload = await upstream.json();
        const content = payload?.choices?.[0]?.message?.content;
        if (typeof content !== "string") throw new Error("upstream response did not include interpretation text");
        for (const chunk of splitForFallback(content)) formatSse(res, "delta", { text: chunk });
      } else {
        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
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
              if (typeof text === "string" && text.length > 0) formatSse(res, "delta", { text });
            } catch {
              // Ignore partial/non-content SSE payloads from the compatible upstream.
            }
          }
        }
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        for (const chunk of splitForFallback(buildFallback(result))) formatSse(res, "delta", { text: chunk });
        formatSse(res, "notice", { text: "实时解读暂不可用，已展示基于本次牌面和卦象的本地娱乐解读。" });
      }
    } finally {
      if (!controller.signal.aborted) formatSse(res, "done", { seedFingerprint: result.seedFingerprint });
      finish();
    }
  });
}
