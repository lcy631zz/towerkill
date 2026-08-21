import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
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
  it("清晰展示牌名、类型、花色点数、象征与正位状态", () => {
    render(<OracleCard card={testCard} orientation="upright" index={2} />);

    expect(screen.getByText("五谷丰登")).toBeTruthy();
    expect(screen.getByText("游戏牌")).toBeTruthy();
    expect(screen.getByText("#02")).toBeTruthy();
    expect(screen.getByText("游戏牌·锦囊", { exact: false })).toBeTruthy();
    expect(screen.getByText("资源显现、各取所需、分配")).toBeTruthy();
    expect(screen.getByText("正位 · 正着")).toBeTruthy();
  });

  it("逆位时旋转卡身并使用明确的倒着标识", () => {
    const { container } = render(<OracleCard card={testCard} orientation="reversed" index={1} />);

    expect(screen.getByText("逆位 · 倒着")).toBeTruthy();
    expect(container.querySelector(".oracle-card--reversed")).toBeTruthy();
  });
});
