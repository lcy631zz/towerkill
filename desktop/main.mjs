import { app, BrowserWindow, dialog, ipcMain, net, protocol } from "electron";
import { fork } from "node:child_process";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadAssetPack } from "./assetManifest.mjs";

const port = Number(process.env.TALUOSHA_PORT || 37821);
let serverProcess;
let assetPack = { folderPath: null, cards: {}, missing: [] };

function assetStatus() {
  return {
    desktopAvailable: true,
    active: Boolean(assetPack.folderPath),
    folderName: assetPack.folderPath ? path.basename(assetPack.folderPath) : null,
    cardCount: Object.keys(assetPack.cards).length,
    missingCount: assetPack.missing.length,
    cards: Object.fromEntries(Object.keys(assetPack.cards).map((cardId) => [cardId, `taluosha-asset://card/${encodeURIComponent(cardId)}`])),
  };
}

function assetConfigPath() {
  return path.join(app.getPath("userData"), "local-card-assets.json");
}

async function restoreAssetPack() {
  try {
    const saved = JSON.parse(await fs.readFile(assetConfigPath(), "utf8"));
    if (typeof saved?.folderPath === "string") assetPack = await loadAssetPack(saved.folderPath);
  } catch {
    assetPack = { folderPath: null, cards: {}, missing: [] };
  }
}

async function chooseAssetFolder() {
  const selected = await dialog.showOpenDialog({ title: "选择三国杀卡图素材文件夹", properties: ["openDirectory"] });
  if (selected.canceled || !selected.filePaths[0]) return assetStatus();
  assetPack = await loadAssetPack(selected.filePaths[0]);
  await fs.writeFile(assetConfigPath(), JSON.stringify({ folderPath: assetPack.folderPath }, null, 2), "utf8");
  return assetStatus();
}

function waitForServer(retries = 50) {
  return new Promise((resolve, reject) => {
    const tryOnce = (remaining) => {
      const req = http.get(`http://127.0.0.1:${port}/`, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => remaining > 0 ? setTimeout(() => tryOnce(remaining - 1), 180) : reject(new Error("Local server did not start")));
      req.setTimeout(800, () => req.destroy());
    };
    tryOnce(retries);
  });
}

async function createWindow() {
  const serverPath = path.join(app.getAppPath(), "dist", "index.js");
  serverProcess = fork(serverPath, [], {
    cwd: app.getAppPath(),
    env: { ...process.env, NODE_ENV: "production", PORT: String(port), ELECTRON_RUN_AS_NODE: "1" },
    stdio: "ignore",
  });
  serverProcess.on("error", (error) => dialog.showErrorBox("塔罗杀启动失败", error.message));
  try {
    await waitForServer();
    const window = new BrowserWindow({ width: 720, height: 620, minWidth: 460, minHeight: 420, resizable: true, title: "塔罗杀", autoHideMenuBar: true, webPreferences: { contextIsolation: true, nodeIntegration: false, preload: path.join(app.getAppPath(), "desktop", "preload.mjs") } });
    await window.loadURL(`http://127.0.0.1:${port}`);
  } catch (error) {
    dialog.showErrorBox("塔罗杀启动失败", error instanceof Error ? error.message : "未知错误");
    app.quit();
  }
}

app.whenReady().then(async () => {
  protocol.handle("taluosha-asset", (request) => {
    const cardId = decodeURIComponent(new URL(request.url).pathname.slice(1));
    const assetPath = assetPack.cards[cardId];
    return assetPath ? net.fetch(pathToFileURL(assetPath).toString()) : new Response("Not found", { status: 404 });
  });
  ipcMain.handle("assets:getStatus", assetStatus);
  ipcMain.handle("assets:chooseFolder", async () => chooseAssetFolder());
  await restoreAssetPack();
  await createWindow();
});
app.on("window-all-closed", () => app.quit());
app.on("before-quit", () => serverProcess?.kill());
