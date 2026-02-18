import * as vscode from 'vscode';

// function to access the stored api key
export async function getApiKey(
  context: vscode.ExtensionContext,
): Promise<string | undefined> {
  let apiKey = await context.secrets.get('openai.apiKey');

  // if key isn't found, prompt user to input key
  if (!apiKey) apiKey = await promptAndStoreApiKey(context);
  return apiKey;
};

// function to prompt user to input API key and store in vscode secretStorage
export async function promptAndStoreApiKey(context: vscode.ExtensionContext) {
  const key = await vscode.window.showInputBox({
    prompt: 'Enter your OpenAI API key',
    placeHolder: 'sk-XXX...',
    password: true, // hides input as user types
    ignoreFocusOut: true, // prevents accidental dismissal
    validateInput: (value) => {
      if (value && value.trim().length > 0) return null;
      return 'API key cannot be empty';
    },
  });
  if (key) {
    await context.secrets.store("openai.apiKey", key.trim());
    vscode.window.showInformationMessage("API key saved securely");
    return key.trim();
  }
  return undefined;
};

// function to allow user to delete API key
export async function deleteHandler(context: vscode.ExtensionContext) {
    await context.secrets.delete("openai.apiKey");
    vscode.window.showInformationMessage("API key deleted");
};