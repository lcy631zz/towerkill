import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext() {
  return {
    user: null,
    req: { protocol: "https", headers: {} },
    res: {},
  } as TrpcContext;
}

describe("divination.draw", () => {
  it("返回三张带正逆位的牌、完整梅花结构和非空仪式随机因子", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.divination.draw({ question: "我该如何面对当前的选择？", numberA: 9, numberB: 16, numberC: 21 });

    expect(result.cards).toHaveLength(3);
    expect(result.cards.map((item) => item.orientation)).toEqual(expect.arrayContaining([expect.any(String)]));
    expect(result.cards.every((item) => ["upright", "reversed"].includes(item.orientation))).toBe(true);
    expect(result.plum.primary.name).toBeTruthy();
    expect(result.plum.mutual.name).toBeTruthy();
    expect(result.plum.changed.name).toBeTruthy();
    expect(result.ritualNonce).toHaveLength(32);
    expect(result.seedFingerprint).toHaveLength(16);
    expect(result.deck.totalCards).toBe(156);
  });
});

