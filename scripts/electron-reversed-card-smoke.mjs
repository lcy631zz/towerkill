import { app, BrowserWindow, ipcMain, net, protocol } from "electron";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadAssetPack } from "../desktop/assetManifest.mjs";

const projectRoot = path.resolve(import.meta.dirname, "..");
const devUrl = process.env.TALUOSHA_SMOKE_URL || "http://127.0.0.1:3000";

const imageBytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL9WQAAAABJRU5ErkJggg==", "base64");
const imageCardIds = Array.from({ length: 108 }, (_, index) => `game-${String(index + 1).padStart(3, "0")}`);
let assetPath = "";

function assetStatus(assetPack) {
  return {
    desktopAvailable: true,
    active: true,
    folderName: path.basename(assetPack.folderPath),
    cardCount: Object.keys(assetPack.cards).length,
    missingCount: assetPack.missing.length,
    cards: Object.fromEntries(Object.keys(assetPack.cards).map((cardId) => [cardId, `taluosha-asset://card/${cardId}`])),
  };
}

async function main() {
  await app.whenReady();
  const assetFolder = await mkdtemp(path.join(os.tmpdir(), "taluosha-electron-ui-assets-"));
  await mkdir(path.join(assetFolder, "cards"));
  assetPath = path.join(assetFolder, "cards", "game.png");
  await writeFile(assetPath, imageBytes);
  await writeFile(path.join(assetFolder, "manifest.json"), JSON.stringify({ schemaVersion: 1, cards: Object.fromEntries(imageCardIds.map((cardId) => [cardId, "cards/game.png"])) }));
  const assetPack = await loadAssetPack(assetFolder);
  protocol.handle("taluosha-asset", (request) => {
    const cardId = decodeURIComponent(new URL(request.url).pathname.slice(1));
    return net.fetch(pathToFileURL(assetPack.cards[cardId]).toString());
  });
  ipcMain.handle("assets:getStatus", () => assetStatus(assetPack));
  ipcMain.handle("assets:chooseFolder", () => assetStatus(assetPack));

  const window = new BrowserWindow({
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(projectRoot, "desktop", "preload.cjs"),
    },
  });

  await window.loadURL(devUrl);
  const verification = await window.webContents.executeJavaScript(`(async () => {
    const waitFor = async (predicate, timeout = 5000) => {
      const started = Date.now();
      while (!predicate()) {
        if (Date.now() - started > timeout) throw new Error("Timed out waiting for renderer state");
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
    };
    const setValue = (node, value) => {
      const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(node), "value");
      descriptor.set.call(node, value);
      node.dispatchEvent(new Event("input", { bubbles: true }));
    };
    const question = document.querySelector("textarea");
    const inputs = [...document.querySelectorAll('input[type="number"]')];
    setValue(question, "桌面逆位渲染验证");
    [444, 555, 666].forEach((value, index) => setValue(inputs[index], String(value)));
    await waitFor(() => !document.querySelector("button[type=submit]").disabled);

    await waitFor(() => document.querySelector(".asset-panel")?.textContent.includes("已加载"));

    const observed = { upright: null, reversed: null };
    for (let attempt = 1; attempt <= 20; attempt += 1) {
      const priorFingerprint = document.querySelector(".status-line")?.textContent || "";
      document.querySelector("button[type=submit]").click();
      await waitFor(() => {
        const trace = [...document.querySelectorAll(".orientation-audit")].find((node) => node.textContent.includes("[TRACE]"));
        const fingerprint = document.querySelector(".status-line")?.textContent || "";
        return Boolean(trace) && fingerprint !== priorFingerprint;
      });
      const cards = [...document.querySelectorAll(".sgs-card")].map((node) => ({
        orientation: node.dataset.orientation,
        hasReversedClass: node.classList.contains("sgs-card--reversed"),
        usesLocalImage: node.classList.contains("sgs-card--image"),
        transform: getComputedStyle(node).transform,
      }));
      const uprightImageCard = cards.find((card) => card.orientation === "upright" && card.usesLocalImage);
      const reversedImageCard = cards.find((card) => card.orientation === "reversed" && card.usesLocalImage);
      if (uprightImageCard) observed.upright = uprightImageCard;
      if (reversedImageCard) observed.reversed = reversedImageCard;
      if (observed.upright && observed.reversed) return { attempt, cards, observed, trace: [...document.querySelectorAll(".orientation-audit")].find((node) => node.textContent.includes("[TRACE]"))?.textContent };
      await waitFor(() => !document.querySelector("button[type=submit]").disabled);
    }
    throw new Error("Twenty desktop draws did not return both upright and reversed local-image cards");
  })()`);

  if (!verification.observed.upright || !verification.observed.reversed || verification.observed.upright.hasReversedClass || verification.observed.upright.transform !== "none" || !verification.observed.reversed.hasReversedClass || verification.observed.reversed.transform === "none") {
    throw new Error(`Electron reversed-card verification failed: ${JSON.stringify(verification)}`);
  }

  console.log(`Electron reversed-card smoke test passed on draw ${verification.attempt}`);
  console.log(verification.trace);
  await window.close();
  protocol.unhandle("taluosha-asset");
  await rm(path.dirname(assetPath), { recursive: true, force: true });
  app.quit();
}

main().catch((error) => {
  console.error(error);
  app.exit(1);
});
