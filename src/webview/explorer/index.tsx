// index.tsx — entry point for the OtterDr sidebar React webview bundle.
// Webpack compiles this file (and everything it imports) into dist/webview/webview.bundle.js,
// which is loaded by the <script> tag injected in OtterViewProvider._getHtmlForWebview.

import * as React from "react";
import { createRoot } from 'react-dom/client';
import { APP } from "./App";

// mount the React app into the #root div that _getHtmlForWebview places in the HTML body
const elm = document.getElementById("root");
if (elm) {
  const root = createRoot(elm);
  root.render(<APP />);
}

// Webpack Hot Module Replacement — reloads the webview bundle during development
// without requiring a full VS Code window reload when source files change
// @ts-expect-error
if (import.meta.webpackHot) {
  // @ts-expect-error
  import.meta.webpackHot.accept();
}
