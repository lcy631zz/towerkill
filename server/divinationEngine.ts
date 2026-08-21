import { calculatePlumBlossom, createRitualSeed, drawThree, hashToUint32 } from "../shared/divination";
import { standardDeck, standardDeckMeta } from "../shared/standardDeck";

export type DivinationInput = {
  question: string;
  numberA: number;
  numberB: number;
  numberC: number;
};

export function makeSeedFingerprint(seed: number, ritualNonce: string) {
  const seedPart = seed.toString(16).padStart(8, "0");
  const noncePart = hashToUint32(ritualNonce).toString(16).padStart(8, "0");
  return `${seedPart}${noncePart}`;
}

export function buildDivinationResult(input: DivinationInput, ritualNonce: string) {
  const seed = createRitualSeed(input.question, input.numberA, input.numberB, input.numberC, ritualNonce);
  return {
    ...input,
    ritualNonce,
    seedFingerprint: makeSeedFingerprint(seed, ritualNonce),
    cards: drawThree(standardDeck, seed),
    plum: calculatePlumBlossom(input.numberA, input.numberB, input.numberC),
    deck: standardDeckMeta,
  };
}
