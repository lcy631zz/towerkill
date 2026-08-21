import React from "react";
import type { OracleCard as OracleCardData } from "@shared/standardDeck";
import { Crown, HeartPulse, ScrollText, Swords, UserRound } from "lucide-react";

type Props = {
  card: OracleCardData;
  orientation: "upright" | "reversed";
  index: number;
};

const typeIcons = {
  general: Crown,
  game: Swords,
  identity: UserRound,
  health: HeartPulse,
};

const typeLabels = { general: "武将", game: "游戏", identity: "身份", health: "体力" };

export function OracleCard({ card, orientation, index }: Props) {
  const Icon = typeIcons[card.kind];
  const reversed = orientation === "reversed";

  return (
    <article className="oracle-card-wrap group relative">
      <div className="absolute -inset-2 rounded-[1.5rem] bg-[radial-gradient(circle_at_50%_0%,rgba(204,164,89,.28),transparent_65%)] opacity-70 blur-xl transition group-hover:opacity-100" />
      <div className={`oracle-card relative min-h-[350px] overflow-hidden rounded-[1.25rem] border border-[#b18b42]/60 bg-[#12111c] p-1 shadow-[0_22px_40px_rgba(0,0,0,.32)] ${reversed ? "oracle-card--reversed" : ""}`}>
        <div className="flex h-full min-h-[340px] flex-col justify-between rounded-[1rem] border border-[#e5cb89]/30 bg-[linear-gradient(145deg,#242033_0%,#161522_48%,#1e1520_100%)] p-5 text-[#f5ead5]">
          <div className="flex items-start justify-between gap-3 border-b border-[#d6ba75]/25 pb-4">
            <div>
              <p className="font-mono text-[10px] tracking-[.24em] text-[#d2b678]">第 {String(index).padStart(2, "0")} 张 · {typeLabels[card.kind]}</p>
              <h3 className="mt-2 font-display text-3xl tracking-[.16em] text-[#fff5e5]">{card.name}</h3>
            </div>
            <Icon className="mt-1 h-5 w-5 text-[#e2bf71]" strokeWidth={1.5} />
          </div>

          <div className="my-6 flex flex-1 flex-col items-center justify-center text-center">
            <div className="grid h-24 w-24 place-items-center rounded-full border border-[#dcbf78]/35 bg-[#0d0d15]/60 shadow-inner">
              <ScrollText className="h-9 w-9 text-[#e4c57b]" strokeWidth={1.1} />
            </div>
            <p className="mt-5 max-w-[15rem] font-serif text-lg leading-relaxed text-[#f0dfbe]">{card.symbolism}</p>
          </div>

          <div className="space-y-2 border-t border-[#d6ba75]/25 pt-4 text-xs leading-relaxed text-[#cbbd9f]">
            <p className="font-medium text-[#e8d8b9]">{card.subtype}{card.suit ? ` · ${card.suit}${card.rank}` : ""}</p>
            {card.faction && <p>势力：{card.faction}　体力：{card.hp}</p>}
            {card.skills && <p>技能：{card.skills}</p>}
            {card.effect && <p>牌效：{card.effect}</p>}
            {card.story && <p className="line-clamp-2">典故：{card.story}</p>}
          </div>
        </div>
      </div>
      <div className={`absolute bottom-3 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full border px-3 py-1 text-[10px] font-semibold tracking-[.16em] ${reversed ? "border-[#b34c67]/60 bg-[#421a2a]/95 text-[#ffc8d3]" : "border-[#5c9b87]/60 bg-[#15372f]/95 text-[#c4f2df]"}`}>
        {reversed ? "逆位 · 倒着" : "正位 · 正着"}
      </div>
    </article>
  );
}
