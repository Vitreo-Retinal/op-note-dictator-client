import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import LeaApp from './LeaApp.jsx'
import { isLeaPath } from './lib/retinaRx.js'

// ── Auth token wrapper (added July 2026) ──────────────────────────────────
// After login, the server issues a token (stored in sessionStorage).
// This wrapper attaches it to every API call automatically, so the
// individual components don't need any changes.
const RAW_FETCH = window.fetch.bind(window);
window.fetch = (input, init = {}) => {
  const url = typeof input === "string" ? input : (input && input.url) || "";
  const token = sessionStorage.getItem("vra_token");
  if (token && (url.includes("railway.app") || url.startsWith("/api/"))) {
    init.headers = { ...(init.headers || {}), Authorization: `Bearer ${token}` };
  }
  return RAW_FETCH(input, init);
};

// LEA Hub (Oct 2026): the same client under /lea/ (retina-rx.vercel.app/lea/)
// runs LeaApp — Doctor + Tech only, signed in by the Retina-Rx front door.
// Every other path is the VRA hub, unchanged.
const Root = isLeaPath() ? LeaApp : App;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
