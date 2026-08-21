import React, { useMemo, useRef, useState } from "react";
import { Streamdown } from "streamdown";
import { OracleCard } from "@/components/OracleCard";
import { trpc } from "@/lib/trpc";
import type { PlumBlossomResult } from "@shared/divination";
import type { OracleCard as OracleCardData } from "@shared/standardDeck";

const disclaimer = "娱乐占卜，切勿迷信，结果不构成任何现实决策依据";

type DrawnCard = { card: OracleCardData; orientation: "upright" | "reversed" };
type RitualResult = { question: string; numberA: number; numberB: number; numberC: number; ritualNonce: string; seedFingerprint: string; cards: DrawnCard[]; plum: PlumBlossomResult };
type ProviderMode = "rules" | "builtin" | "custom" | "local";

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="field"><span>{label}</span><input inputMode="numeric" type="number" min={1} max={999} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

export default function Home() {
  const draw = trpc.divination.draw.useMutation();
  const [question, setQuestion] = useState("");
  const [numbers, setNumbers] = useState({ a: "", b: "", c: "" });
  const [result, setResult] = useState<RitualResult | null>(null);
  const [interpretation, setInterpretation] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState<ProviderMode>("rules");
  const [provider, setProvider] = useState({ baseUrl: "https://api.openai.com/v1", model: "gpt-4.1-mini", apiKey: "" });
  const resultRef = useRef<HTMLDivElement>(null);
  const ready = useMemo(() => question.trim().length >= 2 && [numbers.a, numbers.b, numbers.c].every((value) => Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 999), [numbers, question]);

  async function streamInterpretation(nextResult: RitualResult) {
    setStreaming(true); setInterpretation(""); setNotice("");
    const providerConfig = mode === "rules" || mode === "builtin" ? { mode } : { mode, baseUrl: provider.baseUrl, model: provider.model, ...(provider.apiKey ? { apiKey: provider.apiKey } : {}) };
    const response = await fetch("/api/interpretation/stream", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: nextResult.question, numberA: nextResult.numberA, numberB: nextResult.numberB, numberC: nextResult.numberC, ritualNonce: nextResult.ritualNonce, provider: providerConfig }) });
    if (!response.ok || !response.body) throw new Error("[ERR] 解读服务未响应。");
    const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      buffer += decoder.decode(value, { stream: true }); const events = buffer.split("\n\n"); buffer = events.pop() ?? "";
      for (const block of events) { const event = block.match(/^event: (.+)$/m)?.[1]; const raw = block.match(/^data: (.+)$/m)?.[1]; if (!raw) continue; try { const payload = JSON.parse(raw); if (event === "delta") setInterpretation((current) => current + payload.text); if (event === "notice") setNotice(payload.text); } catch { /* skip malformed chunk */ } }
    }
    setStreaming(false);
  }

  async function begin(event: React.FormEvent) {
    event.preventDefault(); if (!ready) return;
    setError("");
    try { const next = await draw.mutateAsync({ question: question.trim(), numberA: Number(numbers.a), numberB: Number(numbers.b), numberC: Number(numbers.c) }); setResult(next); window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); await streamInterpretation(next); } catch (caught) { setStreaming(false); setError(caught instanceof Error ? caught.message : "[ERR] 问事执行中断。"); }
  }

  return <div className="win-app">
    <aside className="win-sidebar"><div className="win-logo"><b>7</b><span>SGS</span></div><nav><b>Home</b><a href="#ask">问事</a><a href="#result">结果</a><a href="#about">说明</a></nav><hr /><nav><a href="#about">关于本机模式</a><a href="#about">数据说明</a></nav></aside>
    <main className="win-main">
      <header className="win-title"><h1>塔罗杀</h1><span>三国杀牌库 · 数字起卦 · 单次娱乐问事</span></header>
      <section id="ask" className="console-block"><h2>问事 / INPUT</h2><p>输入问题与三个数字。数 A、B、C 范围均为 1–999。</p><form onSubmit={begin}><label className="question-field"><span>问题</span><textarea value={question} maxLength={300} onChange={(event) => setQuestion(event.target.value)} placeholder="例如：我该如何推进眼前的创作计划？" /></label><div className="field-row"><Field label="数 A（上卦）" value={numbers.a} onChange={(a) => setNumbers((state) => ({ ...state, a }))} /><Field label="数 B（下卦）" value={numbers.b} onChange={(b) => setNumbers((state) => ({ ...state, b }))} /><Field label="数 C（动爻）" value={numbers.c} onChange={(c) => setNumbers((state) => ({ ...state, c }))} /></div><div className="provider-box"><label>解读器 <select value={mode} onChange={(event) => { const next = event.target.value as ProviderMode; setMode(next); if (next === "local") setProvider((current) => ({ ...current, baseUrl: "http://127.0.0.1:11434/v1", model: "llama3.2" })); }}><option value="rules">规则本机模式（无需模型）</option><option value="builtin">默认服务（在线）</option><option value="custom">自定义 OpenAI 兼容 API</option><option value="local">本地 OpenAI 兼容服务（Ollama）</option></select></label>{(mode === "custom" || mode === "local") && <div className="provider-fields"><Field label="Base URL" value={provider.baseUrl} onChange={(baseUrl) => setProvider((current) => ({ ...current, baseUrl }))} /><Field label="模型" value={provider.model} onChange={(model) => setProvider((current) => ({ ...current, model }))} /><Field label={mode === "local" ? "API Key（可选）" : "API Key"} value={provider.apiKey} onChange={(apiKey) => setProvider((current) => ({ ...current, apiKey }))} /></div>}<small>{mode === "rules" ? "不联网、不调用模型；只使用可复算规则与模板。" : mode === "builtin" ? "使用应用默认在线解读服务。" : mode === "local" ? "仅在桌面 EXE 中可连接你电脑的 127.0.0.1:11434；网页预览无法访问你的本机模型。" : "密钥仅随本次请求传递，不保存在本程序数据库。"}</small></div><button type="submit" disabled={!ready || draw.isPending || streaming || (mode === "custom" && !provider.apiKey)}>{draw.isPending || streaming ? "[ RUNNING ] 牌堆处理中…" : "[ START ] 启动三牌问事"}</button>{error && <pre className="error-line">{error}</pre>}</form></section>
      <section className="table-section"><h2>本次规则 / METHOD</h2><table><thead><tr><th>步骤</th><th>处理</th><th>输出</th></tr></thead><tbody><tr><td>01</td><td>156 张完整牌池洗牌；本次加入独立随机因子</td><td>3 张牌 + 独立正/逆位</td></tr><tr><td>02</td><td>乾一、兑二、离三、震四、巽五、坎六、艮七、坤八</td><td>本卦 / 互卦 / 变卦 / 体用</td></tr><tr><td>03</td><td>将牌面、卦象、问句送入当前解读器</td><td>关联式娱乐解读</td></tr></tbody></table></section>
      {result && <section id="result" ref={resultRef} className="result-section"><h2>结果 / RESULT</h2><div className="status-line">[OK] 本次牌池：156　|　仪式摘要：{result.seedFingerprint}　|　问：{result.question}</div><h3>抽牌</h3><div className="card-grid">{result.cards.map((item, index) => <OracleCard key={item.card.id} card={item.card} orientation={item.orientation} index={index + 1} />)}</div><div className="result-grid"><div className="plain-panel"><h3>梅花易数 / PLUM BLOSSOM</h3><table><tbody><tr><th>本卦</th><td>{result.plum.primary.name}</td><th>互卦</th><td>{result.plum.mutual.name}</td></tr><tr><th>变卦</th><td>{result.plum.changed.name}</td><th>动爻</th><td>第 {result.plum.movingLine} 爻</td></tr><tr><th>体卦</th><td>{result.plum.body.name}（{result.plum.body.element}）</td><th>用卦</th><td>{result.plum.use.name}（{result.plum.use.element}）</td></tr></tbody></table><p className="method-line">体用：{result.plum.relation.kind}；{result.plum.relation.summary}</p></div><div className="plain-panel"><h3>终端输出 / INTERPRETATION</h3>{notice && <p className="notice-line">[NOTICE] {notice}</p>}<div className="terminal-output">{interpretation ? <Streamdown>{interpretation}</Streamdown> : <span>{streaming ? "[STREAM] 正在接收解读文本…" : "[WAIT] 等待解读"}</span>}</div></div></div></section>}
      <section id="about" className="about"><b>免责声明：</b>{disclaimer}<br />本程序不保存问事历史。卡牌为原创文字化展示，未使用官方插画或牌背素材。</section>
    </main>
    <aside className="win-right"><div className="version"><b>塔罗杀 0.2</b><span>本机模式</span></div><div className="version"><b>牌池</b><span>156 张</span></div><div className="version"><b>解读器</b><span>默认服务</span></div></aside>
  </div>;
}
