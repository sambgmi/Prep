import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const rootEl = document.getElementById("root");
if (rootEl) {
  const root = createRoot(rootEl);
  root.render(<App />);
} else {
  console.error("Root element not found: please ensure index.html has a #root element");
}
