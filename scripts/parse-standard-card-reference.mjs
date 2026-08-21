import { readFileSync, writeFileSync } from "node:fs";

const sourcePath = new URL("../standard_cards_pkg_reference.lua", import.meta.url);
const outputPath = new URL("../standard_card_specs_reference.json", import.meta.url);
const source = readFileSync(sourcePath, "utf8");
const suitMap = { Spade: "♠", Club: "♣", Heart: "♥", Diamond: "♦" };
const rankMap = { 1: "A", 11: "J", 12: "Q", 13: "K" };
const specs = [...source.matchAll(/extension:addCardSpec\("([a-z_]+)", Card\.(Spade|Club|Heart|Diamond), (\d+)\)/g)].map((match, index) => {
  const rank = Number(match[3]);
  return {
    sourceId: `game-${String(index + 1).padStart(3, "0")}`,
    key: match[1],
    suit: suitMap[match[2]],
    rank: rankMap[rank] ?? String(rank),
  };
});

writeFileSync(outputPath, `${JSON.stringify({ count: specs.length, specs }, null, 2)}\n`);
console.log(`Parsed ${specs.length} standard game-card specs.`);
