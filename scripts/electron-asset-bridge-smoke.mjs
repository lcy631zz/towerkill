import { app, BrowserWindow, ipcMain, net, protocol } from "electron";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadAssetPack } from "../desktop/assetManifest.mjs";

const projectRoot = path.resolve(import.meta.dirname, "..");

async function main() {
  await app.whenReady();
  const assetFolder = await mkdtemp(path.join(os.tmpdir(), "taluosha-electron-assets-"));
  await mkdir(path.join(assetFolder, "cards"));
  await writeFile(path.join(assetFolder, "cards", "game-001.png"), Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL9WQAAAABJRU5ErkJggg==", "base64"));
  await writeFile(path.join(assetFolder, "manifest.json"), JSON.stringify({ schemaVersion: 1, cards: { "game-001": "cards/game-001.png" } }));
  const assetPack = await loadAssetPack(assetFolder);

  protocol.handle("taluosha-asset", (request) => {
    const cardId = decodeURIComponent(new URL(request.url).pathname.slice(1));
    const assetPath = assetPack.cards[cardId];
    return assetPath ? net.fetch(pathToFileURL(assetPath).toString()) : new Response("Not found", { status: 404 });
  });
  ipcMain.handle("assets:getStatus", () => ({
    desktopAvailable: true,
    active: true,
    folderName: path.basename(assetFolder),
    cardCount: 1,
    missingCount: 0,
    cards: { "game-001": "taluosha-asset://card/game-001" },
  }));

  const window = new BrowserWindow({
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(projectRoot, "desktop", "preload.cjs"),
    },
  });
  window.webContents.on("console-message", (_event, _level, message) => console.error(`[renderer] ${message}`));
  window.webContents.on("preload-error", (_event, preloadPath, error) => console.error(`[preload] ${preloadPath}: ${error.message}`));
  await window.loadURL("data:text/html,<main>asset bridge smoke test</main>");
  const status = await window.webContents.executeJavaScript(`(async () => {
    if (!window.taluoshaAssets) return { error: "bridge unavailable" };
    try {
      const value = await window.taluoshaAssets.getStatus();
      const imageLoaded = await new Promise((resolve) => {
        const image = new Image();
        image.onload = () => resolve(true);
        image.onerror = () => resolve(false);
        image.src = value.cards["game-001"];
      });
      return { ...value, imageLoaded };
    }
    catch (error) { return { error: String(error) }; }
  })()`);
  if (status.error) throw new Error(status.error);
  if (!status.desktopAvailable || status.cards["game-001"] !== "taluosha-asset://card/game-001" || !status.imageLoaded) {
    throw new Error("Electron 本地素材桥接未返回预期状态");
  }
  console.log("Electron local asset bridge smoke test passed");
  await window.close();
  protocol.unhandle("taluosha-asset");
  await rm(assetFolder, { recursive: true, force: true });
  app.quit();
}

main().catch((error) => {
  console.error(error);
  app.exit(1);
});
