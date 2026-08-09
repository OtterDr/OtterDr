import * as vscode from 'vscode';
import { errorListener, errorSelection, ErrorFormat } from './errorListening';
import { otterTranslation, OtterResponse } from './aiTranslator';
import { GameState } from './gameState';
import { GameManager } from './gameManager';
import { encode } from 'html-entities';

// track current webview panel
let currentPanel: vscode.WebviewPanel | undefined = undefined;

let aiInProgress = false;
// cache keyed per individual error — not per batch — so any previously
// seen error is served from cache regardless of what else is selected
let cachedTranslations: Record<string, OtterResponse> = {};

// stable key excludes selectedText since that varies with highlight length;
// a change to errorContext (surrounding code) naturally busts the cache if the file changes
function getErrorKey(error: ErrorFormat): string {
  return `${error.fileSource}::${error.code}::${error.message}::${error.errorContext}`;
}

//Storing the default model key in this variable
const SAVED_MODEL_KEY = 'otterDr.selectedModelId';

//Helper function used to fetch, validate, and select the default language model

async function resolveLanguageModel(
  context: vscode.ExtensionContext,
  forceSelect: boolean = false,
): Promise<vscode.LanguageModelChat | undefined> {
  const models = await vscode.lm.selectChatModels({});
  console.log(
    'Available models:',
    models.map((m) => m.name),
  );
  //Handles if no models are installed
  if (models.length === 0) {
    const action = await vscode.window.showErrorMessage(
      'OtterDr needs a language model to work. Install one to get started.',
      'Get GitHub Copilot (No API key required)',
      'Input API Key',
    );
    if (action === 'Get GitHub Copilot (No API key required)') {
      vscode.env.openExternal(
        vscode.Uri.parse('vscode:extension/GitHub.copilot-chat'),
      );
    } else if (action === 'Input API Key') {
      //vscode.commands.executeCommand('workbench.extensions.search', 'AI');
      //How to accept an input in text?

    }
    return undefined;
  }

  //Check the stored preference if not forcing a new selection
  if (!forceSelect) {
    const savedModelId = context.globalState.get<string>(SAVED_MODEL_KEY);
    if (savedModelId) {
      const savedModel = models.find((m) => m.id === savedModelId);
      if (savedModel) {
        return savedModel;
      }
    }
  }

  //User selection / the default model selection if only one exists
  if (models.length === 1) {
    const singleModel = models[0];
    await context.globalState.update(SAVED_MODEL_KEY, singleModel.id);
    return singleModel;
  }

  //Dropdown of other models
  const quickPickItems = models.map((m) => ({
    label: m.name,
    description: `${m.vendor} (${m.family})`,
    model: m,
  }));

  const choice = await vscode.window.showQuickPick(quickPickItems, {
    placeHolder: forceSelect
      ? 'Select a new default AI model for OtterDr'
      : 'Select the AI language model for OtterDr to use',
  });

  if (choice) {
    await context.globalState.update(SAVED_MODEL_KEY, choice.model.id);
    return choice.model;
  }

  return undefined;
}


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
  // The callback forwards any state change to the sidebar without GameManager
  // needing a direct reference to OtterViewProvider (avoids circular imports).
  const gameManager = new GameManager(context, (state) =>
    provider.sendStateToWebview(state),
  );

  // route equip actions from the sidebar wardrobe UI through GameManager so
  // they are validated, persisted, and broadcast back as a single state update
  provider.onEquipItem = (slot, itemId) => gameManager.equipItem(slot, itemId);

  // push persisted state into the sidebar on first activation so cosmetics
  // and XP render correctly before the user interacts with anything
  gameManager.sendInitialState();

  // Returns the existing panel if open, otherwise creates a new split-editor panel
  const getOrCreatePanel = () => {
    if (currentPanel) {
      currentPanel.reveal(vscode.ViewColumn.Two);
    } else {
      currentPanel = vscode.window.createWebviewPanel(
        'webview-id',
        'OtterDr Diagnosis 🦦',
        vscode.ViewColumn.Two,
        {
          enableScripts: true, //Enable Javascript/React in the webview
          localResourceRoots: [context.extensionUri],
        },
      );
      // reset when current panel is closed
      currentPanel.onDidDispose(
        () => {
          currentPanel = undefined;
        },
        null,
        context.subscriptions,
      );
    }
    return currentPanel;
  };

  // For displaying the otter image on explorer
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      OtterViewProvider.viewType,
      provider,
    ),
  );

  // Initialize error listener for OtterViewProvider
  const errorCount = errorListener((count) => {
    provider.sendErrorCountToWebview(count);
  });

  context.subscriptions.push(errorCount);

  // Triggered by status bar click: checks cache before making an AI call,
  // then opens the diagnosis panel with the translated error response
  context.subscriptions.push(
    vscode.commands.registerCommand('otterDr.openWebview', async () => {
      // guard against overlapping AI calls while one is in progress
      if (aiInProgress) {
        vscode.window.showInformationMessage(
          'OtterDr is already fishing for a solution. 🦦',
        );
        return;
      }

      try {
        aiInProgress = true;

        const errorSelectionResult = errorSelection();
        if (!errorSelectionResult) {
          console.log('No error was selected');
          return;
        }

        const errors: ErrorFormat[] = JSON.parse(errorSelectionResult);
        // pre-sized so cached and fresh responses can be slotted back by original index
        const results: OtterResponse[] = new Array(errors.length);
        const uncachedErrors: ErrorFormat[] = [];
        // track original positions so fresh AI responses can be merged back in order with cached ones
        const uncachedIndices: number[] = [];

        // split errors into cached vs uncached — serve cached ones immediately
        errors.forEach((error, i) => {
          const key = getErrorKey(error);
          if (cachedTranslations[key]) {
            results[i] = cachedTranslations[key];
          } else {
            uncachedErrors.push(error);
            uncachedIndices.push(i);
          }
        });

        if (uncachedErrors.length === 0) {
          // every error was already cached — no AI call needed
          console.log('Using Cached Translation');
          const panel = getOrCreatePanel();
          panel.webview.html = renderHTML(panel.webview, results);
          return;
        }

        // request any available VS Code chat model (e.g. GitHub Copilot) — no API key needed
        //Model selection call
        const model = await resolveLanguageModel(context);
        if (!model) {
          return;
        }

        console.log('Using model: ', model.name);

        // show a progress notification while the AI call is in flight
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: `OtterDr is now diving into your code...🤿🪸`,
            cancellable: false,
          },

          async () => {
            // only send uncached errors to the AI
            const aiResponses = await otterTranslation(
              JSON.stringify(uncachedErrors),
              model,
            );

            // cache each new response individually and slot it into the correct position
            uncachedIndices.forEach((originalIdx, responseIdx) => {
              const key = getErrorKey(errors[originalIdx]);
              cachedTranslations[key] = aiResponses[responseIdx];
              results[originalIdx] = aiResponses[responseIdx];
            });

            const panel = getOrCreatePanel();
            panel.webview.html = `Hold your breath, OtterDr is taking a deep dive...🤿`;
            // render only after all responses are ready
            panel.webview.html = renderHTML(panel.webview, results);

            // increment the diagnosed count by the number of errors that required
            // a real AI call — cached errors don't count toward XP since no work was done
            await gameManager.onErrorsDiagnosed(uncachedErrors.length);
          },
        );
      } catch (err) {
        console.error('AI failed:', err);
        vscode.window.showErrorMessage('OtterDr Was Swept away by confusion.');
      } finally {
        aiInProgress = false;
      }
    }),
  );

  // Create a new status bar item that we can now manage (Also lets commands above run when clicked)
  const myStatusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  myStatusBarItem.command = 'extension.allCommands'; //allows the status bar to execute multiple
  context.subscriptions.push(myStatusBarItem);
  myStatusBarItem.text = '🦦 OtterDr';
  myStatusBarItem.show();

  // A command for simultaneously running multiple commands!
  context.subscriptions.push(
    vscode.commands.registerCommand('extension.allCommands', async () => {
      await vscode.commands.executeCommand('otterDr.openWebview');
      // Whatever is sent to backend should be in a JSON format
    }),
  );
}

// renders one diagnosis card per error; shows numbered headings when more than one is present
function renderHTML(webview: vscode.Webview, aiResponses: OtterResponse[]) {
  const nonce = getNonce();

  const cards = aiResponses
    .map(
      (aiResponse, i) => `
    <div class="error-card">
      ${
        aiResponses.length > 1
          ? `<h2>Error ${i + 1} of ${aiResponses.length} 🦦</h2>`
          : `<h2>OtterDr says 🦦</h2>`
      }
      <h3>What happened:</h3>
      <p>${encode(aiResponse.whatHappened)}</p>
      <h3>Next Steps 👣:</h3>
      <ol>
        ${aiResponse.nextSteps.map((step: string) => `<li>${encode(step)}</li>`).join('')}
      </ol>
      <h3>Otter thoughts 💭:</h3>
      <p>${encode(aiResponse.otterThoughts)}</p>
    </div>
  `,
    )
    .join('<hr>');

  return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} data:; script-src 'nonce-${nonce}';">
      <style>
        .error-card { margin-bottom: 1rem; }
        hr { border: none; border-top: 1px solid #444; margin: 1.5rem 0; }
      </style>
    </head>
    <body>${cards}</body>
    </html>`;
}

// OtterViewProvider renders the otter image in the explorer sidebar view
class OtterViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'otterDr.otterView';
  private _view?: vscode.WebviewView;

  // caches the last broadcast state so the webview gets current data even
  // if it was hidden when a previous broadcast fired (e.g. panel not yet open)
  private _latestState: GameState | null = null;

  // set by activate() to route equip actions from the wardrobe UI to GameManager.
  // Using an optional callback instead of a direct GameManager reference keeps
  // OtterViewProvider decoupled from game logic
  public onEquipItem?: (slot: string, itemId: string | null) => void;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      // Restricts webview to loading content only from our extension ("localResourceRoots defines a set of root URIs from which local content may be loaded" - https://code.visualstudio.com/api/extension-guides/webview#controlling-access-to-local-resources)
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // single message handler for all messages coming from the webview.
    // WEBVIEW_READY: fired by the webview script once acquireVsCodeApi() has run
    //   and the message listener is registered — only then is it safe to postMessage
    //   state back. Sending state before this point risks dropping it because the
    //   webview JS hasn't finished loading yet.
    // EQUIP_ITEM: forwarded to GameManager via callback so this provider never
    //   touches game state directly (keeps UI logic and game logic separate)

    //! Ask Delilah about this later --> I created a function for the onDidReceived
    // webviewView.webview.onDidReceiveMessage((message) => {
    //   if (message.type === 'WEBVIEW_READY') {
    //     // webview JS is ready — safe to send state now without it being dropped
    //     if (this._latestState) {
    //       this.sendStateToWebview(this._latestState);

    //     }
    //   }

    //   if (message.type === 'EQUIP_ITEM') {
    //     this.onEquipItem?.(message.slot, message.itemId);
    //   }
    // });

    this.activateMessengerListener();
  }

  public testerReact(type: string, payload: OtterResponse): void {
    this._view?.webview.postMessage({ type, payload });
  }

  //Moved out because it would get longer with the switch cases and gamefication logic
  //Placeholder for now, later we will add more
  public activateMessengerListener(): void {
    this._view?.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case 'EQUIP_ITEM':
          await this.onEquipItem?.(message.slot, message.itemId);
          break;
      }
    });
  }

  // called by GameManager via the broadcast callback whenever state changes.
  // caches the state locally so late-joining webviews receive it on resolveWebviewView
  public sendStateToWebview(state: GameState): void {
    this._latestState = state;
    this._view?.webview.postMessage({
      type: 'GAME_STATE_UPDATE',
      payload: state,
    });
  }

  // method to push error data to the webview
  public sendErrorCountToWebview(count: number) {
    if (this._view) {
      this._view.webview.postMessage({
        type: 'UPDATE_ERROR_COUNT',
        payload: count,
      });
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const nonce = getNonce();

    const defaultImage = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'assets', 'default_image.png'),
    );

    const happyImage = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'assets', 'happy_image.png'),
    );

    const confusedImage = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'assets', 'confused_image.png'),
    );

    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        'dist',
        'webview',
        'webview.bundle.js',
      ),
    );

    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'webview', 'styles.css'),
    );

    // For global.d.ts file; making the images global to be used in React (Look: "window.otterAssets")
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
        window.tsvscode = acquireVsCodeApi();
        window.otterAssets = {
          defaultImage: "${defaultImage}",
          happyImage: "${happyImage}",
          confusedImage: "${confusedImage}"
        };
      </script>
      <script nonce="${nonce}" src="${scriptUri}"></script>
    </body>
    </html>`;
  }
}

// function to generate a random nonce to attach to our scripts
function getNonce() {
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
// this method is called when your extension is deactivated
export function deactivate() {}
