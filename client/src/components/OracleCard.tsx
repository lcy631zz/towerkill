import React from "react";
import type { OracleCard as OracleCardData } from "@shared/standardDeck";

type CardRenderDiagnostic = { index: number; clientOrientation: "upright" | "reversed"; dataOrientation: string | null; hasReversedClass: boolean; className: string };
type Props = { card: OracleCardData; orientation: "upright" | "reversed"; index: number; assetUrl?: string; onRenderDiagnostic?: (diagnostic: CardRenderDiagnostic) => void };

const label = { general: "武将牌", game: "游戏牌", identity: "身份牌", health: "体力牌" };

export function OracleCard({ card, orientation, index, assetUrl, onRenderDiagnostic }: Props) {
  const reversed = orientation === "reversed";
  const corner = card.kind === "general" ? (card.faction || "群") : (card.suit || "◎");
  const rank = card.kind === "general" ? `${card.hp ?? "?"} 体力` : (card.rank || "—");
  const cardRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    const node = cardRef.current;
    if (!node || !onRenderDiagnostic) return;
    onRenderDiagnostic({ index, clientOrientation: orientation, dataOrientation: node.dataset.orientation ?? null, hasReversedClass: node.classList.contains("sgs-card--reversed"), className: node.className });
  }, [index, onRenderDiagnostic, orientation]);

  if (assetUrl) return <article ref={cardRef} data-orientation={orientation} className={`sgs-card oracle-card sgs-card--${card.kind} sgs-card--image ${reversed ? "sgs-card--reversed" : ""}`} aria-label={`第 ${index} 张：${card.name}，${reversed ? "逆位倒着" : "正位正着"}`}>
    <img className="sgs-card__image" src={assetUrl} alt={`${card.name} 本地卡图`} />
  </article>;

  return <article ref={cardRef} data-orientation={orientation} className={`sgs-card oracle-card sgs-card--${card.kind} ${reversed ? "sgs-card--reversed" : ""}`} aria-label={`第 ${index} 张：${card.name}，${reversed ? "逆位倒着" : "正位正着"}`}>
    <header className="sgs-card__top"><span>{label[card.kind]}</span><b>#{String(index).padStart(2, "0")}</b></header>
    <div className="sgs-card__corner"><strong>{corner}</strong><small>{rank}</small></div>
    <div className="sgs-card__name">{card.name}</div>
    <div className="sgs-card__art" aria-hidden="true"><span className="sgs-card__art-mark">{card.kind === "general" ? "将" : card.kind === "game" ? "牌" : card.kind === "identity" ? "身份" : "血"}</span></div>
    <div className="sgs-card__body">
      <p className="sgs-card__type"><span>{card.subtype}</span>{card.suit && <span>{card.suit}{card.rank}</span>}</p>
      {card.skills && <p><b>技能：</b>{card.skills}</p>}
      {card.effect && <p><b>效果：</b>{card.effect}</p>}
      {card.story && <p><b>典故：</b>{card.story}</p>}
      <p className="sgs-card__symbol">{card.symbolism}</p>
    </div>
  </article>;
}
