import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadAssetPack, validateManifest } from "./assetManifest.mjs";

const tempFolders: string[] = [];

async function createPack(manifest: unknown) {
  const folder = await mkdtemp(path.join(os.tmpdir(), "taluosha-assets-"));
  tempFolders.push(folder);
  await writeFile(path.join(folder, "manifest.json"), JSON.stringify(manifest), "utf8");
  return folder;
}

afterEach(async () => {
  await Promise.all(tempFolders.splice(0).map((folder) => rm(folder, { recursive: true, force: true })));
});

describe("local card asset manifest", () => {
  it("accepts valid entity IDs and image formats", () => {
    expect(validateManifest({ schemaVersion: 1, cards: { "game-001": "cards/sha.png", "general-015": "cards/sunquan.webp" } })).toEqual({ "game-001": "cards/sha.png", "general-015": "cards/sunquan.webp" });
  });

  it("rejects invalid card IDs and traversal paths", () => {
    expect(() => validateManifest({ schemaVersion: 1, cards: { sha: "cards/sha.png" } })).toThrow("实体牌 ID");
    expect(() => validateManifest({ schemaVersion: 1, cards: { "game-001": "../outside.png" } })).toThrow("越出了素材文件夹");
  });

  it("loads existing images and reports mapped images that are missing", async () => {
    const folder = await createPack({ schemaVersion: 1, cards: { "game-001": "cards/sha.png", "general-015": "cards/missing.png" } });
    await mkdir(path.join(folder, "cards"));
    await writeFile(path.join(folder, "cards", "sha.png"), "image", "utf8");
    const result = await loadAssetPack(folder);
    expect(Object.keys(result.cards)).toEqual(["game-001"]);
    expect(result.missing).toEqual(["general-015"]);
  });
});
