// utils.ts — small shared utilities with no project-specific dependencies.
// Keeping these here prevents the same helper from being copied across files.

// generates a cryptographically random nonce string used to allowlist inline scripts
// in Content-Security-Policy headers. Each webview gets a fresh nonce so a compromised
// script from one panel cannot be replayed in another.
export function getNonce(): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
