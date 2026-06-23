// FIX: removed unused named imports (ExtensionContext, ExtensionMode, Uri, Webview) and
// MessageHandlerData from @estruyf/vscode. That package pulls in vscode@1.1.37 (a legacy
// npm package) which ships its own vscode.d.ts and conflicts with @types/vscode@1.71.0,
// causing ~200 TS errors and hiding modern APIs like asWebviewUri and Uri.joinPath.
// The conflict is resolved in tsconfig.json via skipLibCheck + paths — see comments there.
import * as vscode from 'vscode';
import { errorListener, errorSelection } from './errorListening';
import { otterTranslation } from './aiTranslator';
import { encode } from 'html-entities';

// track current webview panel
let currentPanel: vscode.WebviewPanel | undefined = undefined;

let aiInProgress = false;
let cachedTranslations: Record<string, any> = {};

function getErrorKey(inputError: string): string {
  return inputError;
}
export function activate(context: vscode.ExtensionContext) {
  console.log('🔴 OtterDr ACTIVATING!');

  // !!OtterViewProvider class is created later, outside of the activate function!!
  const provider = new OtterViewProvider(context.extensionUri);

  // Returns the existing panel if open, otherwise creates a new split-editor panel
  const getOrCreatePanel = () => {
    if (currentPanel) {
      // if there's already a panel, show it in the target column
      currentPanel.reveal(vscode.ViewColumn.Two);
    } else {
      currentPanel = vscode.window.createWebviewPanel(
        'webview-id', // Identifies the type of the webview. Used internally
        'OtterDr Diagnosis 🦦', // Title of the panel displayed to the user
        vscode.ViewColumn.Two, // Editor column to show the new webview panel in. (Opens it on the side as a split editor 'tab'!)
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

        const errorKey = getErrorKey(errorSelectionResult);

        // serve cached response if this exact error was already translated
        if (cachedTranslations[errorKey]) {
          console.log('Using Cached Translation');

          const panel = getOrCreatePanel();
          panel.webview.html = renderHTML(
            panel.webview,
            cachedTranslations[errorKey],
          );
          return;
        }

        const models = await vscode.lm.selectChatModels({});
        console.log('Available models:', models.map(m => m.name));
        if (models.length === 0) {
          const action = await vscode.window.showErrorMessage(
            'OtterDr needs a VS Code language model to work. Install one to get started.',
            'Get GitHub Copilot',
            'Browse Extensions'
          );
          if (action === 'Get GitHub Copilot') {
            vscode.env.openExternal(vscode.Uri.parse('vscode:extension/GitHub.copilot-chat'));
          } else if (action === 'Browse Extensions') {
            vscode.commands.executeCommand('workbench.extensions.search', 'AI');
          }
          return;
        }

        const model = models[0];

        //create progress view window
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: `OtterDr is now diving into your code...🤿🪸`,
            cancellable: false,
          },

          async () => {
            const aiResponse = await otterTranslation(
              errorSelectionResult,
              model,
            );

            const panel = getOrCreatePanel();
            panel.webview.html = `Hold your breath, OtterDr is taking a deep dive...🤿`;
            // cache before rendering so repeated clicks skip the API call
            cachedTranslations[errorKey] = aiResponse;

            // render only after the response is ready so the panel never shows stale content
            panel.webview.html = renderHTML(panel.webview, aiResponse);
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

function renderHTML(webview: vscode.Webview, aiResponse: any) {
  const nonce = getNonce();
  return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} data:; script-src 'nonce-${nonce}';">
    </head>

    <body>
      <h2>OtterDr says 🦦</h2>

      <h3>What happened:</h3>
      <p>${encode(aiResponse.whatHappened)}</p>

     <h3>Next Steps 👣:</h3>
     <ol>
      ${aiResponse.nextSteps.map((step: string) => `<li>${encode(step)}</li>`).join('')}
     </ol>

     <h3>Otter thoughts 💭:</h3>
     <p>${encode(aiResponse.otterThoughts)}</p>
     </body>
     </html>`;
}

// OtterViewProvider renders the otter image in the explorer sidebar view
class OtterViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'otterDr.otterView';
  private _view?: vscode.WebviewView;

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
  }

  // method to push error data to the webview
  // CHANGE BELOW - only send a message telling otterView that there's an error, no error info
  public sendErrorCountToWebview(count: number) {
    if (this._view) {
      this._view.webview.postMessage({
        type: 'UPDATE_ERROR_COUNT',
        count: count,
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

    return /*html*/ `
    <!DOCTYPE html>
     <html lang="en">
     <head>
      <!-- Important: Content security policy should be set here for security -->
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data:; script-src 'nonce-${nonce}'; style-src ${webview.cspSource} 'unsafe-inline';">
       <meta charset="UTF-8">
       <meta name="viewport" content="width=device-width, initial-scale=1.0">
       <style>
          img {
            height: auto;
            cursor: pointer;
          }
        </style>
     </head>
     <body>
       <div id="root"></div>
       <img id="otter" src="${defaultImage}" alt="Otter image">
       <script nonce="${nonce}">
          let currentState = 'default';
          const img = document.getElementById("otter")
          const defaultSrc = "${defaultImage}";
          const happySrc = "${happyImage}";
          const confusedSrc = "${confusedImage}";

          img.addEventListener("click", () => {
          //change to happy image
          img.src= happySrc;
          //after 2 seconds go back to confused or default
          setTimeout(() => { img.src = currentState === 'confused' ? confusedSrc : defaultSrc}, 2000)});
       
          const vscode = acquireVsCodeApi();

          window.addEventListener('message', event => {
          const message = event.data;
          if (message.type === 'UPDATE_ERROR_COUNT') {
          const count = message.count;
          console.log("Otter do something about these errors - you have: ", count);
          
          if (count > 0) {
              currentState = 'confused';
              img.src = confusedSrc;    //show error/confused image
            } else {
              currentState = 'default';
              img.src = defaultSrc;
            }
          }
          });
        </script>
     </body>
     </html> `;
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

//  =============== Some Notes =================
//  webviewView = instance of vscode.WebviewView; represents a custom view you registered
// webviewView.webview = VERY important for images! The actual webview object inside that container. Can render JS, HTML, CSS, images (with some rules) and behaves like a sandboxed browser
// webviewView.webview.html --> Is a property (NOT function), when you assign string to it VS Code loads it as full HTML doc
// this._getHtmlForWebview --> The method. Usually returns a valid HTML in the form of a string
