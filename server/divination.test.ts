import { describe, expect, it } from "vitest";
import { calculatePlumBlossom, createRitualSeed, drawThree, getTrigram } from "../shared/divination";
import { standardDeck, standardDeckMeta } from "../shared/standardDeck";

describe("梅花易数映射", () => {
  it("严格遵循乾一、兑二、离三、震四、巽五、坎六、艮七、坤八", () => {
    expect(getTrigram(1).name).toBe("乾");
    expect(getTrigram(8).name).toBe("坤");
    expect(getTrigram(9).name).toBe("乾");
    expect(getTrigram(14).name).toBe("坎");
  });

  it("从三数稳定得出本卦、互卦、变卦、体用与动爻", () => {
    const result = calculatePlumBlossom(1, 2, 4);
    expect(result.primary.name).toBe("天泽履");
    expect(result.movingLine).toBe(4);
    expect(result.body.name).toBe("兑");
    expect(result.use.name).toBe("乾");
    expect(result.mutual.name).toBe("风火家人");
    expect(result.changed.name).toBe("风泽中孚");
    expect(result.relation.kind).toBe("比和");
  });
});

describe("仪式洗牌", () => {
  it("相同输入与同一随机因子会稳定复现抽牌与正逆位", () => {
    const cards = ["曹操", "杀", "桃", "主公", "3/4 体力"];
    const seed = createRitualSeed("是否应当开始", 17, 23, 5, "ritual-2026");
    expect(drawThree(cards, seed)).toEqual(drawThree(cards, seed));
  });

  it("随机因子不同会生成不同有效种子", () => {
    expect(createRitualSeed("同一问题", 1, 2, 3, "first")).not.toBe(
      createRitualSeed("同一问题", 1, 2, 3, "second"),
    );
  });
});

describe("经典标准牌池", () => {
  it("包含已定义的四类牌和 156 个可唯一抽取的实体牌实例", () => {
    expect(standardDeckMeta).toMatchObject({ gameCards: 108, generalCards: 27, identityCards: 10, healthCards: 11, totalCards: 156 });
    expect(standardDeck).toHaveLength(156);
    expect(new Set(standardDeck.map((card) => card.id)).size).toBe(156);
    expect(standardDeck.filter((card) => card.kind === "game")).toHaveLength(108);
    expect(standardDeck.filter((card) => card.kind === "general")).toHaveLength(27);
    expect(standardDeck.filter((card) => card.kind === "identity")).toHaveLength(10);
    expect(standardDeck.filter((card) => card.kind === "health")).toHaveLength(11);
  });
});
