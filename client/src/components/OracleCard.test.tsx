import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OracleCard } from "./OracleCard";

afterEach(cleanup);

const testCard = {
  id: "game-demo",
  kind: "game" as const,
  name: "五谷丰登",
  subtype: "游戏牌·锦囊",
  suit: "♥",
  rank: "3",
  effect: "亮出等同于现存角色数的牌，角色依次各获得一张。",
  symbolism: "资源显现、各取所需、分配",
};

describe("OracleCard", () => {
  it("清晰展示正位牌名、类型、花色点数与象征", () => {
    const { container } = render(<OracleCard card={testCard} orientation="upright" index={2} />);

    expect(screen.getByText("五谷丰登")).toBeTruthy();
    expect(screen.getByText("游戏牌")).toBeTruthy();
    expect(screen.getByText("#02")).toBeTruthy();
    expect(screen.getByText("游戏牌·锦囊", { exact: false })).toBeTruthy();
    expect(screen.getByText("资源显现、各取所需、分配")).toBeTruthy();
    expect(screen.queryByText(/正位|逆位|倒着/)).toBeNull();
    expect(container.querySelector(".sgs-card__top")).toBeTruthy();
    expect(container.querySelector(".sgs-card__corner")).toBeTruthy();
    expect(container.querySelector(".sgs-card__art")).toBeTruthy();
    expect(container.querySelector(".sgs-card__art-corner--left")).toBeTruthy();
    expect(container.querySelector(".sgs-card__art-corner--right")).toBeTruthy();
    expect(container.querySelector(".sgs-card__body")).toBeTruthy();
    expect(container.querySelector(".sgs-card__seal")?.textContent).toContain("塔罗杀");
    expect(container.querySelector('[data-orientation="upright"]')).toBeTruthy();
  });

  it("逆位时仅旋转整张卡，不显示额外状态标签", () => {
    const { container } = render(<OracleCard card={testCard} orientation="reversed" index={1} />);

    expect(container.querySelector(".sgs-card--reversed")).toBeTruthy();
    expect(container.querySelector('[data-orientation="reversed"]')).toBeTruthy();
    expect(screen.queryByText(/正位|逆位|倒着/)).toBeNull();
  });

  it("逆位时报告客户端方向、DOM 方向和实际倒置类，供结果区复核", async () => {
    const onRenderDiagnostic = vi.fn();
    render(<OracleCard card={testCard} orientation="reversed" index={1} onRenderDiagnostic={onRenderDiagnostic} />);

    await waitFor(() => expect(onRenderDiagnostic).toHaveBeenCalled());
    expect(onRenderDiagnostic).toHaveBeenLastCalledWith(expect.objectContaining({
      index: 1,
      clientOrientation: "reversed",
      dataOrientation: "reversed",
      hasReversedClass: true,
    }));
  });

  it("有本地素材映射时显示完整图片，逆位仍倒置整张卡", () => {
    const { container } = render(<OracleCard card={testCard} orientation="reversed" index={3} assetUrl="taluosha-asset://card/game-001" />);

    expect(screen.getByRole("img", { name: "五谷丰登 本地卡图" }).getAttribute("src")).toBe("taluosha-asset://card/game-001");
    expect(container.querySelector(".sgs-card--image.sgs-card--reversed")).toBeTruthy();
  });
});
