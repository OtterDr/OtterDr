import { join } from 'path';
import * as vscode from 'vscode';
import { ExtensionContext, ExtensionMode, Uri, Webview } from 'vscode';
import { MessageHandlerData } from '@estruyf/vscode';
import { readFileSync } from 'fs';
import { errorListener, errorSelection } from './errorListening';
import { otterTranslation } from './aiTranslator';
import { encode } from 'html-entities';
import { getApiKey, setApiKey, deleteApiKey } from './auth';

export function activate(context: vscode.ExtensionContext) {
  console.log('🔴 OtterDr ACTIVATING!');

  // !!OtterViewProvider class is created later, outside of the activate function!!
  // Creates a new Instance of the otterview
  const provider = new OtterViewProvider(context.extensionUri);

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

  // Register a command for Status Bar Item: For displaying the OtterDr error analysis on a separate tab & For highlighting & selecting text in code, sending error to backend and receiving response
  context.subscriptions.push(
    vscode.commands.registerCommand('otterDr.openWebview', async () => {
      const errorSelectionResult = errorSelection();
      if (!errorSelectionResult) {
        console.log('No error was selected');
        return;
      }

    //import our apikey
    const apiKey = await getApiKey(context);
    if (!apiKey) {
      vscode.window.showErrorMessage('API key required');
      return;
     }

    //create progress view window
    vscode.window.withProgress(
      //withProgress gives the loading bar
      {
        location: vscode.ProgressLocation.Notification,
        title: `OtterDr is now diving into your code...🤿🪸`,
        cancellable: false,
      },

      async () => {
        // waiting for the response from ai
        const aiResponse = await otterTranslation(
          //invoke our aitranslator
          errorSelectionResult,
          apiKey,
        );

        // Create and show a new webview only after getting the ai response
        const panel = vscode.window.createWebviewPanel(
          'webview-id', // Identifies the type of the webview. Used internally
          'OtterDr Diagnosis 🦦', // Title of the panel displayed to the user
          vscode.ViewColumn.Two, // Editor column to show the new webview panel in. (Opens it on the side as a split editor 'tab'!)
          {
            enableScripts: true, //Enable Javascript/React in the webview
            localResourceRoots: [context.extensionUri],
          },
        );

    const nonce = getNonce();
    panel.webview.html = `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${panel.webview.cspSource} 'unsafe-inline'; img-src ${panel.webview.cspSource} data:; script-src 'nonce-${nonce}';">
    </head>

    <body>
      <h2>OtterDr says 🦦</h2>

      <h3>What happened:</h3>
      <p>${encode(aiResponse.whatHappened)}</p>

      <h3>Next Steps 👣:</h3>
      <ol>
        ${aiResponse.nextSteps.map((step) => `<li>${encode(step)}</li>`).join('')}
      </ol>

      <h3>Otter thoughts 💭:</h3>
      <p>${encode(aiResponse.otterThoughts)}</p>
    </body>
    </html>`;
        },
      );
    }),
  );

  // Create a new status bar item that we can now manage (Also lets commands above run when clicked) -- Completed!
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

  // command to listen for changes to the api key so ai doesn't use old one if changed
  context.subscriptions.push(
    context.secrets.onDidChange(async (event) => {
      if (event.key === 'openai.apiKey') {
        vscode.window.showInformationMessage(
          'OtterDr: API Key update detected',
        );
      }
    }),
  );
  // command to set a new API key
  context.subscriptions.push(
    vscode.commands.registerCommand('otterDr.setApiKey', async () => {
      await setApiKey(context);
    }),
  );

  // command to delete API key
  context.subscriptions.push(
    vscode.commands.registerCommand('otterDr.deleteApiKey', async () => {
      await deleteApiKey(context);
    }),
  );
}

//CLASS
//Creating OtterViewProvider (Displays otter image)
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
      // Allow scripts in the webview
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
    console.log('Sending error count:', count);
    console.log('View exists?', !!this._view);
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const nonce = getNonce();

    const imageUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'assets', 'Default Image.png'),
    );
    // add any other paths in here that we want to include and ref via variable in HTML, like...
    // const confusedOtter = webview.asWebviewUri(vscode.Uri.oinPath(this._extensionUri, 'assets', 'confused.png'));

    //

    // assign each script we want to run to a specific variable, then pass that variable in to the html instead of the script itself
    // if we have to directly write script inside of html, include nonce with it

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <!-- Important: Content security policy should be set here for security -->
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data:; script-src 'nonce-${nonce}'; style-src ${webview.cspSource} 'unsafe-inline';">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>OtterDr Webview</title>
      </head>

      <body>
        <!-- DO WE STILL NEED THE DIV WITH ROOT ID BELOW? -->
        <div id="root"></div> 
        <img id="otter-img" src ="${imageUri}" alt= "Otter image">
      
        <script nonce="${nonce}">
          const vscode = acquireVsCodeApi();
          const imgElement = document.getElementById('otter-img');
          
          window.addEventListener('message', event => {
            const message = event.data;
            if (message.type === 'UPDATE_ERROR_COUNT') {
              const count = message.count;
              
              console.log("Otter do something about these errors - you have: ", count);
              // DO THINGS HERE TO CHANGE IMAGE BASED ON ERRORS
              
            }
          });

          console.log("Webview script loaded");
        </script>
          
      </body>
      </html>`;
  }
}

//funcion to generate a random nonce to attach to our scripts
function getNonce() {
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
// // this method is called when your extension is deactivated
export function deactivate() {}

//  =============== Some Notes =================
//  webviewView = instance of vscode.WebviewView; represents a custom view you registered
// webviewView.webview = VERY important for images! The actual webview object inside that container. Can render JS, HTML, CSS, images (with some rules) and behaves like a sandboxed browser
// webviewView.webview.html --> Is a property (NOT function), when you assign string to it VS Code loads it as full HTML doc
// this._getHtmlForWebview --> The
