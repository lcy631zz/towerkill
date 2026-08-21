import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("taluoshaAssets", {
  getStatus: () => ipcRenderer.invoke("assets:getStatus"),
  chooseFolder: () => ipcRenderer.invoke("assets:chooseFolder"),
});
