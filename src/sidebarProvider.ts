// sidebarProvider.ts — the WebviewViewProvider that manages the OtterDr sidebar panel.
// Owns the React webview lifecycle: creates the HTML shell, handles messages from the
// React app, caches state for late-joining webviews, and forwards equip actions to GameManager.

import * as vscode from 'vscode';
import { GameState } from './gameState';
import { ITEM_CATALOG } from './catalog';
import { getNonce } from './utils';

export class OtterViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'otterDr.otterView';
  private _view?: vscode.WebviewView;

  // caches the last broadcast state so a webview that wasn't open during a broadcast
  // still receives the correct data when it first resolves
  private _latestState: GameState | null = null;

  // set by activate() to route equip actions through GameManager without a direct import,
  // which would create a circular dependency between sidebarProvider and gameManager
  public onEquipItem?: (slot: string, itemId: string | null) => void;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      // restrict the webview to loading resources only from within this extension
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
    this.activateMessengerListener();
  }

  // used by tests/dev utilities to push arbitrary messages into the webview
  public testerReact(type: string, payload: unknown): void {
    this._view?.webview.postMessage({ type, payload });
  }

  // handles all messages from the sidebar React app.
  // 'renderReady' — App.tsx sends this after mounting; safe to push state now.
  // 'EQUIP_ITEM'  — forwarded to GameManager so the webview never touches game state directly.
  public activateMessengerListener(): void {
    this._view?.webview.onDidReceiveMessage((message) => {
      switch (message.type) {
        case 'renderReady':
          // React app has mounted and is ready to receive postMessage — send the cached snapshot
          if (this._latestState) {
            this.sendStateToWebview(this._latestState);
          }
          break;
        case 'EQUIP_ITEM':
          this.onEquipItem?.(message.slot, message.itemId);
          break;
      }
    });
  }

  // called by GameManager via the broadcast callback on every state change.
  // always updates _latestState so late-joining webviews get fresh data.
  public sendStateToWebview(state: GameState): void {
    this._latestState = state;
    this._view?.webview.postMessage({ type: 'GAME_STATE_UPDATE', payload: state });
  }

  // pushes the current active-file error count to the webview to trigger the otter's mood change
  public sendErrorCountToWebview(count: number): void {
    this._view?.webview.postMessage({ type: 'UPDATE_ERROR_COUNT', payload: count });
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const nonce = getNonce();

    // resolve webview-safe URIs for the three otter emote images
    const defaultImage = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'assets', 'otter', 'default_otter.png'),
    );
    const happyImage = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'assets', 'otter', 'happy_otter.png'),
    );
    const confusedImage = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'assets', 'otter', 'confused_otter.png'),
    );

    // the React bundle built from src/webview/index.tsx
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'webview.bundle.js'),
    );

    // build background URI map — baked into window.otterAssets so App.tsx can resolve
    // background image URLs without calling back to the extension host
    const bgUriMap: Record<string, string> = {};
    for (const item of ITEM_CATALOG) {
      if (item.slot === 'backgrounds' && item.assetPath) {
        bgUriMap[item.id] = webview.asWebviewUri(
          vscode.Uri.joinPath(this._extensionUri, item.assetPath),
        ).toString();
      }
    }

    // build color filter map — baked into window.otterAssets so App.tsx can apply
    // the correct CSS filter for the equipped fur color without a round-trip
    const colorFilterMap: Record<string, string> = {};
    for (const item of ITEM_CATALOG) {
      if (item.slot === 'colors' && item.cssFilter) {
        colorFilterMap[item.id] = item.cssFilter;
      }
    }

    // build overlay data map for cosmetics that layer on top of the otter (hats, glasses, accessories).
    // each entry includes the webview-safe URI plus optional CSS size/position values from the catalog,
    // so standalone cropped PNGs can be sized and placed without needing to redo the art as same-canvas.
    const overlayDataMap: Record<string, {
      uri: string; width: string; height: string; top: string; left: string;
      emoteOffsets?: {
        default?:  { top: string; left: string };
        happy?:    { top: string; left: string };
        confused?: { top: string; left: string };
      };
    }> = {};
    for (const item of ITEM_CATALOG) {
      if (['hats', 'glasses', 'accessories'].includes(item.slot) && item.assetPath) {
        overlayDataMap[item.id] = {
          uri: webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, item.assetPath),
          ).toString(),
          width:        item.overlayWidth        ?? 'auto',
          height:       item.overlayHeight       ?? 'auto',
          top:          item.overlayTop          ?? '0',
          left:         item.overlayLeft         ?? '0',
          emoteOffsets: item.overlayEmoteOffsets ?? {},
        };
      }
    }

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="Content-Security-Policy"
            content="default-src 'none';
            img-src ${webview.cspSource} data:;
            style-src ${webview.cspSource} 'unsafe-inline';
            script-src 'nonce-${nonce}';">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body>
      <div id="root"></div>
      <script nonce="${nonce}">
        // acquireVsCodeApi() must be called before the bundle loads so window.tsvscode
        // is available the moment App.tsx's useEffect runs
        window.tsvscode = acquireVsCodeApi();
        window.otterAssets = {
          defaultImage: "${defaultImage}",
          happyImage: "${happyImage}",
          confusedImage: "${confusedImage}",
          bgUris: ${JSON.stringify(bgUriMap)},
          colorFilters: ${JSON.stringify(colorFilterMap)},
          overlayData: ${JSON.stringify(overlayDataMap)}
        };
      </script>
      <script nonce="${nonce}" src="${scriptUri}"></script>
    </body>
    </html>`;
  }
}
