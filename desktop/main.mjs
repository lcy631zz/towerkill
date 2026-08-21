import { app, BrowserWindow, dialog } from "electron";
import { fork } from "node:child_process";
import http from "node:http";
import path from "node:path";

const port = Number(process.env.TALUOSHA_PORT || 37821);
let serverProcess;

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
    const window = new BrowserWindow({ width: 720, height: 620, minWidth: 460, minHeight: 420, resizable: true, title: "塔罗杀", autoHideMenuBar: true, webPreferences: { contextIsolation: true, nodeIntegration: false } });
    await window.loadURL(`http://127.0.0.1:${port}`);
  } catch (error) {
    dialog.showErrorBox("塔罗杀启动失败", error instanceof Error ? error.message : "未知错误");
    app.quit();
  }
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());
app.on("before-quit", () => serverProcess?.kill());
