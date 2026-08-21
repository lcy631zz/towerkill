import React from "react";
import type { OracleCard as OracleCardData } from "@shared/standardDeck";

type Props = { card: OracleCardData; orientation: "upright" | "reversed"; index: number };

const label = { general: "武将牌", game: "游戏牌", identity: "身份牌", health: "体力牌" };

export function OracleCard({ card, orientation, index }: Props) {
  const reversed = orientation === "reversed";
  const corner = card.kind === "general" ? (card.faction || "群") : (card.suit || "◎");
  const rank = card.kind === "general" ? `${card.hp ?? "?"} 体力` : (card.rank || "—");

  return <article className={`sgs-card oracle-card ${reversed ? "oracle-card--reversed" : ""}`} aria-label={`第 ${index} 张：${card.name}，${reversed ? "逆位倒着" : "正位正着"}`}>
    <header className="sgs-card__top"><span>{label[card.kind]}</span><b>#{String(index).padStart(2, "0")}</b></header>
    <div className="sgs-card__corner"><strong>{corner}</strong><small>{rank}</small></div>
    <div className="sgs-card__name">{card.name}</div>
    <div className="sgs-card__art" aria-hidden="true"><span>{card.kind === "general" ? "将" : card.kind === "game" ? "牌" : card.kind === "identity" ? "身份" : "血"}</span></div>
    <div className="sgs-card__body">
      <p className="sgs-card__type">{card.subtype}{card.suit ? ` · ${card.suit}${card.rank}` : ""}</p>
      {card.skills && <p><b>技能：</b>{card.skills}</p>}
      {card.effect && <p><b>效果：</b>{card.effect}</p>}
      {card.story && <p><b>典故：</b>{card.story}</p>}
      <p className="sgs-card__symbol">{card.symbolism}</p>
    </div>
    <footer className={reversed ? "card-state card-state--reverse" : "card-state"}>{reversed ? "逆位 · 倒着" : "正位 · 正着"}</footer>
  </article>;
}
