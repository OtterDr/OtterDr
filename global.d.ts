// global.d.ts — augments the Window interface with globals injected by the extension host.
// The sidebar HTML sets window.tsvscode and window.otterAssets before the React bundle loads,
// so these are always defined by the time App.tsx runs. Declaring them here gives TypeScript
// full type-safety in webview code without any runtime cost.

export {};

declare global {
  interface Window {
    // VS Code webview API — acquired via acquireVsCodeApi() in the HTML script block.
    // Used to send messages back to the extension host (e.g. 'renderReady', 'EQUIP_ITEM').
    tsvscode: {
      postMessage: (message: { type: string; payload?: any }) => void;
      getState: () => any;
      setState: (state: any) => void;
    };

    // cosmetic asset data baked into the sidebar HTML at generation time so the React app
    // can resolve image URLs and CSS filters without additional round-trips to the extension host.
    otterAssets: {
      defaultImage: string;                     // webview-safe URL for the neutral otter image
      happyImage: string;                       // webview-safe URL for the happy otter image
      confusedImage: string;                    // webview-safe URL for the confused otter image
      bgUris: Record<string, string>;           // item ID → webview-safe background image URL
      colorFilters: Record<string, string>;     // item ID → CSS filter string for fur color cosmetics
      overlayData: Record<string, {
        uri: string;
        width: string;
        height: string;
        top: string;
        left: string;
        emoteOffsets?: {
          default?:  { top: string; left: string };
          happy?:    { top: string; left: string };
          confused?: { top: string; left: string };
        };
      }>;
    };
  }

  const tsvscode: Window['tsvscode'];
}
