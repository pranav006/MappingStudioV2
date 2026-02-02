# Using Your Own LLM

**Do AI suggestions require an LLM?** No. Suggestions work **without any LLM**:
- **Rule-based analysis**: The app analyzes source and target field names/keys (e.g. ID, name, date, code, amount) and suggests mappings accordingly (direct, trim+uppercase, null-safe, name title-case, amount as number, etc.).
- **Learned**: From your past usage (accepted/rejected/edited logic stored in the app).
- **Defaults**: Built-in “Direct Mapping” and “Standard Clean” (e.g. `target.X = source.Y;`).
An LLM is **optional** and adds more/varied suggestions when configured.

MappingStudio’s AI-assisted mapping logic works with **any OpenAI-compatible chat API**. The LLM is used **only for mapping logic suggestions** (field names → code snippets) that feed into Excel generation; **no PHI is sent**.

- **Offline use**: The app works **fully offline** when the LLM is used **only if** the LLM runs locally (e.g. Ollama on the same machine or on your LAN). Using an external API (OpenAI, Azure, etc.) requires internet.
- **Own LLM on-prem**: Run your own LLM so no data leaves your environment and you can work without internet.

---

## How it works

- The backend calls a **single endpoint** with a POST body: `{ "model": "...", "messages": [{ "role": "user", "content": "..." }] }`.
- It expects a response like: `{ "choices": [{ "message": { "content": "..." } }] }`.
- **No API key** is required when the URL points to your own service (e.g. local Ollama). Auth is only sent when `app.llm.api-key` is set.

---

## Option 1: Ollama (local, free)

[Ollama](https://ollama.ai) runs open-source models locally and exposes an OpenAI-compatible API.

1. Install Ollama and pull a model, e.g.:
   ```bash
   ollama pull llama2
   ```
2. Set only the URL and model (no API key):
   ```bash
   export OPENAI_API_URL=http://localhost:11434/v1/chat/completions
   export OPENAI_MODEL=llama2
   ```
3. Restart the MappingStudio backend. AI suggestions will use your local model.

---

## Option 2: Other OpenAI-compatible endpoints

You can point MappingStudio to:

- **vLLM** (self-hosted): e.g. `http://your-server:8000/v1/chat/completions`
- **Azure OpenAI** (your tenant): use your Azure endpoint URL and set `api-key` to your Azure key
- **LiteLLM** (proxy to many providers): use your LiteLLM server URL
- **Any server** that implements the [OpenAI Chat Completions](https://platform.openai.com/docs/api-reference/chat/create) request/response shape

Set:

- `OPENAI_API_URL` (or `app.llm.api-url`) to your endpoint
- `OPENAI_MODEL` (or `app.llm.model`) to the model name your server expects
- `OPENAI_API_KEY` only if your endpoint requires authentication

---

## Option 3: Training or fine-tuning your own model

- You can **train or fine-tune** a model (e.g. on mapping examples) and serve it via any of the above (Ollama, vLLM, your own API).
- As long as the HTTP API is OpenAI-compatible, MappingStudio needs **no code changes**—only config: `app.llm.api-url` and `app.llm.model` (and `app.llm.api-key` if required).

---

## Summary

| Scenario              | Set `api-url` to                         | Set `api-key`? | Offline? |
|-----------------------|------------------------------------------|----------------|----------|
| Own LLM (Ollama, etc.)| Your server URL (e.g. `http://localhost:11434/v1/chat/completions`) | No (optional)  | Yes      |
| OpenAI / Azure        | Provider URL                             | Yes            | No (needs internet) |

Using your own LLM keeps data on your side, avoids sending it to external APIs, and lets the app work **offline** when the LLM is used.

---

## Weight and deployment

- **MappingStudio does not run or bundle an LLM.** It only calls an LLM API (external or your own). So the app itself does **not** get heavier; it stays the same size and resource use.
- **Deployment**: Deploy backend + frontend as usual. For your own LLM, run it on a **separate** server and set `api-url` to that server—so the app server stays light. See **docs/DEPLOYMENT.md** for more.
