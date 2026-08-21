import { useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { Streamdown } from "streamdown";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { OracleCard } from "@/components/OracleCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import type { PlumBlossomResult } from "@shared/divination";
import type { OracleCard as OracleCardData } from "@shared/standardDeck";
import { Archive, ArrowRight, Check, ChevronRight, CircleHelp, Loader2, LockKeyhole, MoonStar, Sparkles, Stars } from "lucide-react";

const disclaimer = "娱乐占卜，切勿迷信，结果不构成任何现实决策依据";

type DrawnCard = { card: OracleCardData; orientation: "upright" | "reversed" };
type RitualResult = {
  question: string;
  numberA: number;
  numberB: number;
  numberC: number;
  ritualNonce: string;
  seedFingerprint: string;
  recordId?: number;
  cards: DrawnCard[];
  plum: PlumBlossomResult;
};

function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block">
    <span className="mb-2 flex items-center gap-2 text-[11px] font-semibold tracking-[.18em] text-[#c9ad75]"><i className="h-1.5 w-1.5 rounded-full bg-[#c49a52]" />{label}</span>
    <Input inputMode="numeric" type="number" min={1} max={999} value={value} onChange={(event) => onChange(event.target.value)} className="ritual-number h-12 border-[#d5b978]/30 bg-[#080a11]/65 font-mono text-lg text-[#fff1d8] placeholder:text-[#80755f] focus-visible:ring-[#d2ae63]" />
  </label>;
}

export default function Home() {
  const { isAuthenticated } = useAuth();
  const draw = trpc.divination.draw.useMutation();
  const save = trpc.divination.save.useMutation();
  const [question, setQuestion] = useState("");
  const [numbers, setNumbers] = useState({ a: "", b: "", c: "" });
  const [result, setResult] = useState<RitualResult | null>(null);
  const [interpretation, setInterpretation] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const ready = useMemo(() => question.trim().length >= 2 && [numbers.a, numbers.b, numbers.c].every((value) => {
    const number = Number(value);
    return Number.isInteger(number) && number >= 1 && number <= 999;
  }), [numbers, question]);

  async function streamInterpretation(nextResult: RitualResult) {
    setStreaming(true);
    setInterpretation("");
    setNotice("");
    const response = await fetch("/api/interpretation/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: nextResult.question, numberA: nextResult.numberA, numberB: nextResult.numberB, numberC: nextResult.numberC, ritualNonce: nextResult.ritualNonce }),
    });
    if (!response.ok || !response.body) throw new Error("解读星盘暂未回应，请稍后再试。");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";
      for (const eventBlock of events) {
        const event = eventBlock.match(/^event: (.+)$/m)?.[1] ?? "message";
        const json = eventBlock.match(/^data: (.+)$/m)?.[1];
        if (!json) continue;
        try {
          const payload = JSON.parse(json);
          if (event === "delta" && typeof payload.text === "string") setInterpretation((current) => current + payload.text);
          if (event === "notice" && typeof payload.text === "string") setNotice(payload.text);
        } catch { /* Ignore malformed interim chunks. */ }
      }
    }
    setStreaming(false);
  }

  async function beginRitual(event: React.FormEvent) {
    event.preventDefault();
    if (!ready) return;
    setError("");
    setSaved(false);
    try {
      const nextResult = await draw.mutateAsync({ question: question.trim(), numberA: Number(numbers.a), numberB: Number(numbers.b), numberC: Number(numbers.c) });
      setResult(nextResult);
      window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
      await streamInterpretation(nextResult);
    } catch (caught) {
      setStreaming(false);
      setError(caught instanceof Error ? caught.message : "仪式暂时中断，请稍后重试。");
    }
  }

  async function saveRecord() {
    if (!result || !interpretation || streaming) return;
    if (!isAuthenticated) {
      startLogin();
      return;
    }
    try {
      await save.mutateAsync({ question: result.question, numberA: result.numberA, numberB: result.numberB, numberC: result.numberC, ritualNonce: result.ritualNonce, recordId: result.recordId, interpretation });
      setSaved(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "归档失败，请稍后重试。");
    }
  }

  return <main className="min-h-screen overflow-hidden ritual-bg text-[#f6ecd9]">
    <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-6 md:px-8">
      <Link href="/" className="group inline-flex items-center gap-3 text-[#f4e6cb] transition hover:text-white"><span className="war-seal">杀</span><span className="font-display text-xl tracking-[.26em]">塔罗杀</span></Link>
      <nav className="flex items-center gap-4 text-sm text-[#d8c6a7]">
        <a href="#how" className="hidden transition hover:text-[#f9ebcc] sm:inline">起卦方式</a>
        <Link href="/history" className="inline-flex items-center gap-2 transition hover:text-[#f9ebcc]"><Archive className="h-4 w-4" /> 档案</Link>
      </nav>
    </header>

    <section className="relative mx-auto grid max-w-7xl gap-10 px-5 pb-20 pt-10 md:px-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:pb-28 lg:pt-16">
      <div className="relative z-10">
        <div className="hero-hexagram" aria-hidden="true"><span>乾</span><span>兑</span><span>离</span><span>震</span><span>巽</span><span>坎</span><span>艮</span><span>坤</span></div>
        <div className="ornament-line mb-7"><span>THREE KINGDOMS ORACLE</span></div>
        <p className="font-mono text-[11px] tracking-[.24em] text-[#c9ab72]">以三国杀牌面为引 · 以三数起象为经</p>
        <h1 className="mt-5 max-w-3xl font-display text-5xl leading-[1.08] tracking-[.1em] text-[#fff4df] md:text-7xl">牌落风云，<br /><em className="font-normal text-[#d8af62]">象答此心。</em></h1>
        <p className="mt-7 max-w-xl font-serif text-lg leading-9 text-[#d4c4a7]">从一副完整洗乱的经典标准牌池中抽取三张牌，让三国人物、兵法牌意与梅花易数的体用变动，在同一场叙事里相逢。</p>
        <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-[#d8bc7d]/25 bg-[#131421]/60 px-4 py-2 text-xs text-[#e9d5a9]"><LockKeyhole className="h-3.5 w-3.5 text-[#d9b669]" /> {disclaimer}</div>
      </div>

      <form onSubmit={beginRitual} className="mist-panel card-back relative z-10 rounded-[1.5rem] p-6 shadow-2xl md:p-8">
        <div className="flex items-start justify-between gap-5 border-b border-[#d9bd7b]/20 pb-5">
          <div><p className="font-mono text-[10px] tracking-[.21em] text-[#cbad6d]">THE QUESTION</p><h2 className="mt-2 font-display text-2xl tracking-[.14em]">安放此问</h2></div>
          <MoonStar className="h-7 w-7 text-[#d7b36a]" strokeWidth={1.25} />
        </div>
        <label className="mt-6 block"><span className="mb-2 block text-sm text-[#e5d5b8]">你此刻想问什么？</span><Textarea value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={300} placeholder="例如：我该如何推进眼前的创作计划？" className="min-h-[112px] resize-none border-[#d5b978]/30 bg-[#080a11]/65 text-base leading-7 text-[#fff1d8] placeholder:text-[#80755f] focus-visible:ring-[#d2ae63]" /></label>
        <div className="ritual-numbers mt-6 grid grid-cols-3 gap-3"><NumberField label="数 · A" value={numbers.a} onChange={(value) => setNumbers((current) => ({ ...current, a: value }))} /><NumberField label="数 · B" value={numbers.b} onChange={(value) => setNumbers((current) => ({ ...current, b: value }))} /><NumberField label="数 · C" value={numbers.c} onChange={(value) => setNumbers((current) => ({ ...current, c: value }))} /></div>
        <p className="mt-3 text-xs leading-6 text-[#a99b83]">限 1–999。A、B 取上、下卦，C 取动爻；每次问事都会加入独立的仪式随机因子。</p>
        {error && <p className="mt-4 rounded-md border border-[#c86579]/40 bg-[#4b1d29]/40 px-3 py-2 text-sm text-[#ffc9d3]">{error}</p>}
        <Button type="submit" disabled={!ready || draw.isPending || streaming} className="mt-6 h-13 w-full bg-[#c49a52] text-base text-[#20180f] shadow-[0_10px_30px_rgba(185,141,63,.2)] transition hover:bg-[#e7c477] disabled:opacity-50">
          {draw.isPending || streaming ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 牌堆正在回应</> : <><Sparkles className="mr-2 h-4 w-4" /> 启动三牌问事</>}
        </Button>
      </form>
      <div className="pointer-events-none absolute -right-16 top-0 h-80 w-80 rounded-full bg-[#693245]/15 blur-3xl" />
    </section>

    <section id="how" className="border-y border-[#d7bd83]/15 bg-[#0b0d17]/60"><div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 md:grid-cols-3 md:px-8"><div><p className="font-mono text-[10px] tracking-[.18em] text-[#c8a968]">01 · DRAW</p><h3 className="mt-2 font-display text-xl tracking-[.12em]">洗牌与正逆位</h3><p className="mt-3 text-sm leading-7 text-[#bfb096]">问题、三数与独立随机因子共同形成可回溯的牌序；每张牌另行决定正位或逆位。</p></div><div><p className="font-mono text-[10px] tracking-[.18em] text-[#c8a968]">02 · PLUM BLOSSOM</p><h3 className="mt-2 font-display text-xl tracking-[.12em]">三数起象</h3><p className="mt-3 text-sm leading-7 text-[#bfb096]">严格按乾一、兑二、离三、震四、巽五、坎六、艮七、坤八取上、下卦，C 数取动爻。</p></div><div><p className="font-mono text-[10px] tracking-[.18em] text-[#c8a968]">03 · INTERPRET</p><h3 className="mt-2 font-display text-xl tracking-[.12em]">一脉解读</h3><p className="mt-3 text-sm leading-7 text-[#bfb096]">塔罗式三牌叙事、梅花体用与六壬意象旁注围绕同一牌面相互参照。</p></div></div></section>

    {result && <section ref={resultRef} className="relative mx-auto max-w-7xl scroll-mt-8 px-5 py-20 md:px-8">
      <div className="ornament-line mb-7"><span>THE REVELATION</span></div>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="font-mono text-[11px] tracking-[.2em] text-[#c9ad75]">问：{result.question}</p><h2 className="mt-3 font-display text-4xl tracking-[.12em] md:text-5xl">三牌已现</h2></div><p className="max-w-md text-sm leading-7 text-[#bfb096]">本次以 156 张牌池洗牌；归档后保留仪式摘要 <span className="font-mono text-[#d9b669]">{result.seedFingerprint}</span>。</p></div>
      <div className="mt-10 grid gap-7 md:grid-cols-3">{result.cards.map((item, index) => <OracleCard key={item.card.id} card={item.card} orientation={item.orientation} index={index + 1} />)}</div>

      <div className="mt-14 grid gap-7 lg:grid-cols-[.85fr_1.15fr]">
        <article className="mist-panel rounded-[1.35rem] p-6 md:p-8"><div className="flex items-center gap-3"><Stars className="h-5 w-5 text-[#d6b263]" /><div><p className="font-mono text-[10px] tracking-[.18em] text-[#c9ad75]">梅花易数</p><h3 className="mt-1 font-display text-2xl tracking-[.12em]">卦象脉络</h3></div></div><div className="mt-7 grid grid-cols-3 gap-3"><div className="sigil"><span>本卦</span><b>{result.plum.primary.name}</b></div><div className="sigil"><span>互卦</span><b>{result.plum.mutual.name}</b></div><div className="sigil"><span>变卦</span><b>{result.plum.changed.name}</b></div></div><div className="mt-6 rounded-xl border border-[#d8bd7c]/20 bg-[#090b12]/40 p-4 text-sm leading-7 text-[#d7c6a8]"><p>上卦：{result.plum.upper.symbol} {result.plum.upper.name}　下卦：{result.plum.lower.symbol} {result.plum.lower.name}　·　第 {result.plum.movingLine} 爻动</p><p className="mt-2">体：{result.plum.body.name}（{result.plum.body.element}）　用：{result.plum.use.name}（{result.plum.use.element}）</p><p className="mt-2 text-[#efd9a7]">{result.plum.relation.kind}：{result.plum.relation.summary}</p></div></article>
        <article className="mist-panel rounded-[1.35rem] p-6 md:p-8"><div className="flex items-center justify-between gap-4"><div><p className="font-mono text-[10px] tracking-[.18em] text-[#c9ad75]">关联解读 · 塔罗 / 梅花易数 / 六壬意象</p><h3 className="mt-1 font-display text-2xl tracking-[.12em]">解语正在抵达</h3></div>{streaming && <Loader2 className="h-5 w-5 animate-spin text-[#d9b669]" />}</div>{notice && <p className="mt-5 rounded-md border border-[#d6b96f]/30 bg-[#463a22]/35 px-3 py-2 text-sm text-[#e6d29d]">{notice}</p>}<div className="prose ritual-prose mt-6 max-w-none">{interpretation ? <Streamdown>{interpretation}</Streamdown> : <p className="animate-pulse text-[#bfb096]">正在将牌面与卦象合为一线……</p>}</div><div className="mt-8 flex flex-col gap-3 border-t border-[#d8bd7c]/20 pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="inline-flex items-center gap-2 text-xs leading-6 text-[#c7b79a]"><CircleHelp className="h-4 w-4 shrink-0 text-[#d9b669]" />{disclaimer}</p><Button onClick={saveRecord} disabled={!interpretation || streaming || save.isPending || saved} variant="outline" className="border-[#d0ad64]/45 bg-transparent text-[#f0d89e] hover:bg-[#c49a52] hover:text-[#20180f]">{saved ? <><Check className="mr-2 h-4 w-4" /> 已归档</> : save.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 归档中</> : isAuthenticated ? "归档本次问事" : "登录后归档"}</Button></div></article>
      </div>
      <div className="mt-12 text-center"><Link href="/history" className="inline-flex items-center gap-2 text-sm text-[#d9bd7b] transition hover:text-[#fff0d0]">查看占卜档案 <ArrowRight className="h-4 w-4" /></Link></div>
    </section>}
  </main>;
}
