// ── API base ──────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_BASE || "https://op-note-dictator-server-production.up.railway.app";

// ── Download PDF for one or more handouts ─────────────────────────
async function downloadHandoutPDF(handouts, lang) {
  const items = Array.isArray(handouts) ? handouts : [handouts];
  try {
    const payload = {
      handouts: items.map(h => ({
        title: h.title[lang] || h.title.en,
        content: h.content[lang] || h.content.en,
      })),
      lang,
    };
    const res = await fetch(`${API_BASE}/api/education-pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("PDF generation failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = items.length === 1
      ? `${(items[0].title.en || "Handout").replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_")}.pdf`
      : "Patient_Education.pdf";
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error("PDF download error:", e);
    // Fallback: basic print
    const content = items.map(h => (h.content[lang] || h.content.en)).join("\n\n---\n\n").replace(/\[PAGE_BREAK\]\n?/g, "").replace(/\[IMAGE[^\]]*\]\n?/g, "");
    const title = items[0].title[lang] || items[0].title.en;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
<style>
  body { font-family: Georgia, serif; max-width: 700px; margin: 40px auto; padding: 0 24px; color: #1a1a1a; line-height: 1.7; font-size: 13pt; }
  pre { white-space: pre-wrap; font-family: Georgia, serif; font-size: 13pt; line-height: 1.7; }
  @media print { body { margin: 0.5in; } }
</style></head><body>
<pre>${content}</pre>
<script>window.print();<\/script>
</body></html>`);
    win.document.close();
  }
}

export { downloadHandoutPDF };
