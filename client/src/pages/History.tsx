import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, BookOpen, Loader2, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { Streamdown } from "streamdown";

export default function History() {
  const { isAuthenticated, loading } = useAuth();
  const history = trpc.divination.history.useQuery(undefined, { enabled: isAuthenticated });

  return (
    <main className="min-h-screen ritual-bg text-[#f6ecd9]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 md:px-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#d9c5a0] transition hover:text-[#fff5e5]">
          <ArrowLeft className="h-4 w-4" /> 返回问事台
        </Link>
        <span className="font-display text-xl tracking-[.24em] text-[#f5e4c3]">塔罗杀</span>
      </header>

      <section className="mx-auto max-w-5xl px-5 pb-20 pt-8 md:px-8">
        <div className="ornament-line mb-8"><span>PERSONAL ARCHIVE</span></div>
        <h1 className="font-display text-4xl tracking-[.12em] md:text-6xl">占卜档案</h1>
        <p className="mt-4 max-w-2xl leading-8 text-[#c8b99b]">仅保存你登录后主动归档的娱乐占卜。每一条均保留三数、牌面、卦象与解读，方便回看当时的思考线索。</p>

        {loading ? <div className="mt-16 grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-[#dfbd70]" /></div> : !isAuthenticated ? (
          <div className="mist-panel mt-12 rounded-[1.5rem] p-8 text-center md:p-12">
            <BookOpen className="mx-auto h-8 w-8 text-[#d9b96f]" strokeWidth={1.4} />
            <h2 className="mt-5 font-display text-2xl tracking-[.14em]">档案等待开启</h2>
            <p className="mx-auto mt-3 max-w-md leading-7 text-[#c8b99b]">登录后可查看并保存属于你的占卜记录。</p>
            <Button onClick={startLogin} className="mt-7 bg-[#c49a52] text-[#20180f] hover:bg-[#e5c277]">登录查看档案</Button>
          </div>
        ) : history.isLoading ? <div className="mt-16 grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-[#dfbd70]" /></div> : history.data?.length ? (
          <div className="mt-10 space-y-5">
            {history.data.map((record) => {
              const cards = record.cards as Array<{ card: { name: string; subtype: string }; orientation: "upright" | "reversed" }>;
              const plum = record.plum as { primary: { name: string }; mutual: { name: string }; changed: { name: string }; relation: { kind: string } };
              return <article key={record.id} className="mist-panel rounded-[1.25rem] p-6 md:p-8">
                <div className="flex flex-col gap-3 border-b border-[#d8bd7c]/20 pb-5 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-mono text-[10px] tracking-[.18em] text-[#c8a968]">{new Date(record.createdAt).toLocaleString("zh-CN")}</p>
                    <h2 className="mt-2 font-serif text-xl leading-relaxed text-[#fff1d8]">“{record.question}”</h2>
                  </div>
                  <span className="rounded-full border border-[#d8bd7c]/30 px-3 py-1 font-mono text-[10px] tracking-wider text-[#d8bd7c]">档案 #{String(record.id).padStart(4, "0")}</span>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto]">
                  <div className="flex flex-wrap gap-2">
                    {cards.map((item, index) => <span key={`${item.card.name}-${index}`} className="rounded-md border border-[#dcc181]/20 bg-[#090b12]/45 px-3 py-2 text-sm text-[#e9dcc3]">{item.card.name} · {item.orientation === "upright" ? "正位" : "逆位"}</span>)}
                  </div>
                  <p className="text-sm leading-7 text-[#cdbd9e]">本卦 {plum.primary.name}　·　互卦 {plum.mutual.name}　·　变卦 {plum.changed.name}<br />体用：{plum.relation.kind}</p>
                </div>
                <div className="prose ritual-prose mt-6 max-w-none border-t border-[#d8bd7c]/20 pt-5"><Streamdown>{record.interpretation}</Streamdown></div>
              </article>;
            })}
          </div>
        ) : (
          <div className="mist-panel mt-12 rounded-[1.5rem] p-10 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-[#d9b96f]" strokeWidth={1.4} />
            <h2 className="mt-5 font-display text-2xl tracking-[.14em]">尚无归档</h2>
            <p className="mt-3 text-[#c8b99b]">完成一次问事后，将解读归档到这里。</p>
            <Link href="/" className="mt-6 inline-flex rounded-md bg-[#c49a52] px-4 py-2 text-sm font-medium text-[#20180f] transition hover:bg-[#e5c277]">开始第一次问事</Link>
          </div>
        )}
      </section>
    </main>
  );
}
