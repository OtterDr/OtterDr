// extension.ts — VS Code extension entry point.
// Responsible only for wiring together the major pieces: GameManager, OtterViewProvider,
// the diagnosis panel, and the wardrobe panel. All rendering and game logic lives in
// their own modules (sidebarProvider, diagnosisPanel, wardrobe, gameManager).

import * as vscode from 'vscode';
import { errorListener } from './errorListening';
import { GameManager } from './gameManager';
import { OtterViewProvider } from './sidebarProvider';
import { openDiagnosisPanel, resolveLanguageModel } from './diagnosisPanel';
import { renderWardrobeHTML } from './wardrobe';

// only one wardrobe panel can be open at a time — tracked here so the broadcast
// callback in the GameManager closure can reach it
let wardrobePanel: vscode.WebviewPanel | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log('🔴 OtterDr ACTIVATING!');

  const provider = new OtterViewProvider(context.extensionUri);

  //Providing users with the option to change the default model
  // Register a command so users can change model from the Command Palette (Ctrl+Shift+P / Cmd+Shift+P)

  context.subscriptions.push(
    vscode.commands.registerCommand('otterDr.changeModel', async () => {
      const selectedModel = await resolveLanguageModel(context, true);

      if (selectedModel) {
        vscode.window.showInformationMessage(
          `OtterDr active model changed to ${selectedModel.name}! 🦦`,
        );
      }
    }),
  );

  // GameManager owns all XP, unlock, and equip logic.
  // The callback forwards every state change to the sidebar and (if open) the wardrobe panel,
  // without either panel needing a direct reference to GameManager.
  const gameManager = new GameManager(context, (state) => {
    provider.sendStateToWebview(state);
    wardrobePanel?.webview.postMessage({ type: 'GAME_STATE_UPDATE', state });
  });

  // route equip actions from the sidebar through GameManager so they are validated,
  // persisted, and broadcast back — the sidebar never writes game state directly
  provider.onEquipItem = (slot, itemId) => gameManager.equipItem(slot, itemId);

  // push persisted state into the sidebar immediately so cosmetics and XP are
  // visible before the user has triggered any diagnosis
  gameManager.sendInitialState();

  // register the sidebar WebviewView (shown in the Explorer panel)
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      OtterViewProvider.viewType,
      provider,
    ),
  );

  // watch for diagnostic changes in the active editor and update the otter's mood
  context.subscriptions.push(
    errorListener((count) => provider.sendErrorCountToWebview(count)),
  );

  // triggered by the status bar — runs the AI diagnosis flow
  context.subscriptions.push(
    vscode.commands.registerCommand('otterDr.openWebview', () =>
      openDiagnosisPanel(context, (count) =>
        gameManager.onErrorsDiagnosed(count),
      ),
    ),
  );

  // status bar button — clicking it triggers the diagnosis command
  const statusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  statusBar.command = 'extension.allCommands';
  statusBar.text = '🦦 OtterDr';
  statusBar.show();
  context.subscriptions.push(statusBar);

  // allCommands lets the status bar trigger multiple commands in sequence if needed
  context.subscriptions.push(
    vscode.commands.registerCommand('extension.allCommands', async () => {
      await vscode.commands.executeCommand('otterDr.openWebview');
    }),
  );

  // opens the wardrobe in an editor tab; reveals the existing panel if already open
  context.subscriptions.push(
    vscode.commands.registerCommand('otterDr.openWardrobe', () => {
      if (wardrobePanel) {
        wardrobePanel.reveal(vscode.ViewColumn.Two);
        return;
      }

      wardrobePanel = vscode.window.createWebviewPanel(
        'otterDr.wardrobe',
        'OtterDr Wardrobe 🦦',
        vscode.ViewColumn.Two,
        { enableScripts: true, localResourceRoots: [context.extensionUri] },
      );

      wardrobePanel.webview.html = renderWardrobeHTML(
        wardrobePanel.webview,
        context.extensionUri,
      );

      wardrobePanel.webview.onDidReceiveMessage((message) => {
        // wardrobe JS is ready — send current game state so cards render with correct lock/equip state
        if (message.type === 'WEBVIEW_READY') {
          gameManager.sendInitialState();
        }
        // user clicked a cosmetic card — persist the choice and broadcast to all panels
        if (message.type === 'EQUIP_ITEM') {
          gameManager.equipItem(message.slot, message.itemId);
        }
      });

      wardrobePanel.onDidDispose(
        () => {
          wardrobePanel = undefined;
        },
        null,
        context.subscriptions,
      );
    }),
  );
}

// called by VS Code when the extension is deactivated — subscriptions are disposed automatically
export function deactivate() {}
