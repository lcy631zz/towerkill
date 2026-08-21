export type LocalAssetStatus = {
  desktopAvailable: boolean;
  active: boolean;
  folderName: string | null;
  cardCount: number;
  missingCount: number;
  cards: Record<string, string>;
};

declare global {
  interface Window {
    taluoshaAssets?: {
      getStatus: () => Promise<LocalAssetStatus>;
      chooseFolder: () => Promise<LocalAssetStatus>;
    };
  }
}

export {};
