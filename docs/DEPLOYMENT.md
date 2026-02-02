# MappingStudio — Deployment & LLM Impact

## Does the LLM make the app heavy?

**No.** MappingStudio does **not** bundle or run an LLM. It only **calls** an LLM over HTTP when you enable it (via `app.llm.api-url` or `app.llm.api-key`).

- **App size and resources**: The backend and frontend are unchanged in size and CPU/RAM use. LLM support is a small HTTP client and a few classes that call an external or local endpoint when configured.
- **Heavy part is separate**: If you run your **own** LLM (e.g. Ollama, vLLM), that process runs **outside** MappingStudio—on the same machine or on a separate server. That process can be GPU/RAM-heavy; MappingStudio itself stays light.

**Summary**: The app stays light. The LLM is optional and runs elsewhere (cloud API or your own LLM server).

---

## Deployment options

| Mode | What you deploy | LLM runs where | App server |
|------|------------------|----------------|------------|
| **No LLM** | Backend + frontend only | — | Light (default) |
| **External LLM** (OpenAI, Azure) | Backend + frontend only | Cloud (their servers) | Light; only env vars (API key, URL) |
| **Own LLM** (Ollama, vLLM) | Backend + frontend + (optional) separate LLM server | Same box or **separate LLM server** | Light if LLM is on another server |

### Recommended for production (with own LLM)

- Deploy **MappingStudio** (backend + frontend) on your app server as usual—no extra weight.
- Run the **LLM** (Ollama, vLLM, etc.) on a **separate** machine or container if you need it. Point `app.llm.api-url` to that server (e.g. `http://llm-server:11434/v1/chat/completions`). That way:
  - App server stays light and easy to scale.
  - LLM server can be scaled (CPU/GPU/RAM) independently.

### Same-server deployment (with own LLM)

- You can run Ollama (or another LLM) on the **same** server as MappingStudio. That server will need more CPU/RAM (and optionally GPU) for the LLM; MappingStudio’s own footprint stays the same.

---

## Summary

| Question | Answer |
|----------|--------|
| Does LLM make the app heavy? | No. The app does not run the LLM; it only calls an API. App size and base resource use are unchanged. |
| Deployment with LLM? | Same as without: deploy backend + frontend. With external LLM, set env vars. With own LLM, run the LLM elsewhere (recommended) or on the same server. |
| Heavier server needed? | Only if you run the LLM process on that server. Keep the LLM on a separate host to keep the app server light. |
