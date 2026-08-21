import React, { useMemo, useRef, useState } from "react";
import { Streamdown } from "streamdown";
import { OracleCard } from "@/components/OracleCard";
import { trpc } from "@/lib/trpc";
import type { PlumBlossomResult } from "@shared/divination";
import type { OracleCard as OracleCardData } from "@shared/standardDeck";

const disclaimer = "娱乐占卜，切勿迷信，结果不构成任何现实决策依据";

type DrawnCard = { card: OracleCardData; orientation: "upright" | "reversed" };
type RitualResult = { question: string; numberA: number; numberB: number; numberC: number; ritualNonce: string; seedFingerprint: string; cards: DrawnCard[]; plum: PlumBlossomResult };
type ProviderMode = "rules" | "custom" | "local";

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
    const providerConfig = mode === "rules" ? { mode } : { mode, baseUrl: provider.baseUrl, model: provider.model, ...(provider.apiKey ? { apiKey: provider.apiKey } : {}) };
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
      <section id="ask" className="console-block"><h2>问事 / INPUT</h2><form onSubmit={begin}><label className="question-field"><span>问题</span><textarea value={question} maxLength={300} onChange={(event) => setQuestion(event.target.value)} placeholder="例如：我该如何推进眼前的创作计划？" /></label><div className="field-row"><Field label="数 A" value={numbers.a} onChange={(a) => setNumbers((state) => ({ ...state, a }))} /><Field label="数 B" value={numbers.b} onChange={(b) => setNumbers((state) => ({ ...state, b }))} /><Field label="数 C" value={numbers.c} onChange={(c) => setNumbers((state) => ({ ...state, c }))} /></div><div className="provider-box"><label>解读器 <select value={mode} onChange={(event) => { const next = event.target.value as ProviderMode; setMode(next); if (next === "local") setProvider((current) => ({ ...current, baseUrl: "http://127.0.0.1:11434/v1", model: "llama3.2" })); }}><option value="rules">规则本机（无需模型）</option><option value="custom">自定义 OpenAI 兼容 API</option><option value="local">本地模型（Ollama）</option></select></label>{(mode === "custom" || mode === "local") && <div className="provider-fields"><Field label="Base URL" value={provider.baseUrl} onChange={(baseUrl) => setProvider((current) => ({ ...current, baseUrl }))} /><Field label="模型" value={provider.model} onChange={(model) => setProvider((current) => ({ ...current, model }))} /><Field label={mode === "local" ? "API Key（可选）" : "API Key"} value={provider.apiKey} onChange={(apiKey) => setProvider((current) => ({ ...current, apiKey }))} /></div>}<small>{mode === "rules" ? "不联网、不调用模型；牌义与卦象按固定模板组合。" : mode === "local" ? "本地模型：仅 EXE 可连接你的 127.0.0.1:11434 服务。" : "自定义 API：密钥只随本次请求传输，不写入数据库。"}</small></div><button type="submit" disabled={!ready || draw.isPending || streaming || (mode === "custom" && !provider.apiKey)}>{draw.isPending || streaming ? "[ RUNNING ] 牌堆处理中…" : "[ START ] 启动三牌问事"}</button>{error && <pre className="error-line">{error}</pre>}</form></section>
      {result && <section id="result" ref={resultRef} className="result-section"><h2>结果 / RESULT</h2><div className="status-line">[OK] 本次牌池：156　|　仪式摘要：{result.seedFingerprint}　|　问：{result.question}</div><h3>抽牌</h3><div className="card-grid">{result.cards.map((item, index) => <OracleCard key={item.card.id} card={item.card} orientation={item.orientation} index={index + 1} />)}</div><div className="result-grid"><div className="plain-panel"><h3>梅花易数 / PLUM BLOSSOM</h3><table><tbody><tr><th>本卦</th><td>{result.plum.primary.name}</td><th>互卦</th><td>{result.plum.mutual.name}</td></tr><tr><th>变卦</th><td>{result.plum.changed.name}</td><th>动爻</th><td>第 {result.plum.movingLine} 爻</td></tr><tr><th>体卦</th><td>{result.plum.body.name}（{result.plum.body.element}）</td><th>用卦</th><td>{result.plum.use.name}（{result.plum.use.element}）</td></tr></tbody></table><p className="method-line">体用：{result.plum.relation.kind}；{result.plum.relation.summary}</p></div><div className="plain-panel"><h3>终端输出 / INTERPRETATION</h3>{notice && <p className="notice-line">[NOTICE] {notice}</p>}<div className="terminal-output">{interpretation ? <Streamdown>{interpretation}</Streamdown> : <span>{streaming ? "[STREAM] 正在接收解读文本…" : "[WAIT] 等待解读"}</span>}</div></div></div></section>}
      <section id="about" className="about"><b>免责声明：</b>{disclaimer}<br />本程序不保存问事历史。卡牌为原创文字化展示，未使用官方插画或牌背素材。</section>
    </main>
    <aside className="win-right"><div className="version"><b>塔罗杀 0.2</b><span>本机模式</span></div><div className="version"><b>牌池</b><span>156 张</span></div><div className="version"><b>解读器</b><span>规则本机</span></div></aside>
  </div>;
}
