import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
