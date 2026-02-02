# MappingStudio — Safety Measures & PHI Safety

This document describes the safety measures built into the app, how PHI-safe the application is, and the Excel parsing security controls. It is for awareness only and does not constitute legal advice. For HIPAA and licensing details, see [COMPLIANCE.md](COMPLIANCE.md).

---

## Overview

MappingStudio is a **mapping specification** tool: you define source and target schemas (e.g. EDI segments/elements, field names) and write or suggest mapping logic (e.g. `target.X = source.Y;`). The app does **not** process live patient or member data by design—it works with schema metadata, field keys, and logic text. Optional features (LLM suggestions, Excel training import) are designed with isolation and limits so that malware or unintended data exposure is minimized.

---

## How PHI-Safe Is This App?

### What the app stores and processes

| Data | Where used | PHI risk |
|------|------------|----------|
| **Project names, schema names** | Dashboard, project list | Low by design. You can avoid putting PHI in project names. |
| **Field keys and titles** (e.g. NM109, SSN) | Source/target trees, mapping ledger, suggestions | **Metadata only.** The app never requires or processes actual SSN/member values—only the field identifiers and labels. |
| **Mapping logic and comments** | Ledger, composer, export | You control the text. Avoid pasting real PHI into comments or logic. |
| **AI learning** (source field, target field, logic) | Stored for suggestions | Same as above—field keys and logic text only, no live PHI. |
| **Excel training import** | Only columns: Source Field, Mapping Logic, Target Field | Only these three columns are read; values are sanitized and length-limited. Do not put PHI in the Excel if you want zero PHI in the app. |

### What the app does **not** do with PHI

- **No live data processing**: The app does not load, transform, or transmit actual member/patient records. It builds mapping *specifications* (rules), not data pipelines that handle PHI.
- **LLM (optional)**: When enabled, the LLM receives only **field names/keys and mapping logic text** (e.g. “Map NM109 to SSN”)—**not** live patient data. Keeping PHI out of project names, comments, and logic keeps it out of prompts. A BAA is still required if PHI is in scope for your use; see [COMPLIANCE.md](COMPLIANCE.md).

### PHI-safe deployment recommendations

1. **Leave the LLM off** when handling PHI: do not set `OPENAI_API_KEY`. The app works fully with rule-based and learned suggestions only.
2. **Or use a HIPAA-eligible LLM** (e.g. Azure OpenAI with a BAA) and keep PHI out of prompts (field keys and logic only).
3. **Restrict access**: Use a strong `APP_ACCESS_KEY` and limit who can reach the backend. All `/api/*` endpoints require the access key (header or query).
4. **Control what you put in**: Do not store PHI in project names, mapping comments, or Excel training files if you want the app to remain PHI-free.
5. **Data at rest**: Projects and mappings are stored in the app database (e.g. SQLite). Ensure the server and database are protected and access-controlled in your environment.

**Summary**: The app is **specification-focused** and does not process live PHI by design. It becomes PHI-safe when you (1) do not put PHI in project/metadata/comments/logic, (2) do not send PHI to external APIs (disable LLM or use a BAA-covered endpoint), and (3) protect access and the database per your policies.

---

## Safety Measures in the App

### Access control

- **API protection**: All `/api/*` requests require a shared **access key** (`X-Access-Key` header or `accessKey` query for GET). Unauthorized requests receive 401. The key is configurable via `app.access-key` / `APP_ACCESS_KEY`.
- **No built-in user database**: The app uses a single shared key. For multi-user or audit requirements, use your own auth (e.g. reverse proxy, SSO) in front of the app.

### Optional LLM (no PHI in prompts)

- **Off by default**: No API key is configured by default; no external AI calls are made.
- **Narrow prompt content**: When the LLM is enabled, the backend sends only **source/target field keys and titles** and asks for mapping logic suggestions. It does **not** send project data, member IDs, or live records.
- **Configurable endpoint**: You can point the LLM to your own or a HIPAA-eligible endpoint; see [OWN_LLM.md](OWN_LLM.md) and [COMPLIANCE.md](COMPLIANCE.md).

### Training import (Excel) isolation

- **Single entry point**: Excel upload for “training” (mapping spec import) goes only through the **isolated** `com.mappingstudio.ai.training` package. No other part of the app parses or processes the uploaded file content.
- **Scan-before-parse**: Every file is validated (size, type, magic bytes) and read through a bounded stream before any parsing. See [Excel parsing safety measures](#excel-parsing-safety-measures) below.

### Error handling and rejection

- **Training file rejection**: Files that fail validation (size, format, zip-bomb, etc.) are rejected with **HTTP 403** and a clear message. The server does not process invalid or suspicious uploads.
- **No raw upload path**: Uploaded Excel is never passed to the rest of the app; only sanitized (source, target, logic) strings are persisted.

---

## Excel Parsing Safety Measures

Excel files uploaded for **training import** (Import spec (Excel)) are handled with strict limits and no execution of content.

### 1. Isolation

- **Package**: All Excel reading and validation for training lives in `com.mappingstudio.ai.training`.
- **Single facade**: Only `TrainingImportService` accepts the uploaded file. It calls the scanner, then the parser, then passes only **sanitized** (source, target, logic) strings to `AiTrainerService`. No other class receives the raw file or POI objects.

### 2. Scanning before processing

Every uploaded file is **scanned** before any parsing:

| Check | Purpose |
|-------|---------|
| **File size limit** | Configurable max size (default 5 MB). Prevents zip bombs and oversized uploads. |
| **Extension** | Only `.xlsx` is accepted. |
| **Magic bytes** | File must start with ZIP magic bytes (XLSX is a ZIP archive). Non-ZIP files are rejected. |
| **Bounded read** | The parser reads from a **bounded input stream** that stops after the configured max bytes. The server never reads beyond the limit, even if the client sends a larger or lying Content-Length. |
| **Zip-bomb detection** | Apache POI’s zip-bomb detection is used with a **stricter** inflation ratio for training import only, then restored so other features are unaffected. |

### 3. Safe parsing

| Control | Implementation |
|--------|----------------|
| **Max rows** | Only the first N data rows are processed (configurable, default 10,000). |
| **Max columns** | Only the first N columns are read (configurable, default 32). |
| **Column usage** | Only three columns are used: **Source Field**, **Mapping Logic**, **Target Field**. All other columns are ignored. |
| **Cell length limits** | Each value is trimmed and **truncated** to configurable max lengths (e.g. source/target 500 chars, logic 5,000 chars) before being stored. |
| **No formula evaluation** | Formulas are **not** evaluated. Only cached numeric value or an empty string is used; formula text is never executed. This avoids formula-based attacks. |
| **No macros** | `.xlsx` (Office Open XML) does not execute VBA macros in this code path; the parser only reads cell values and structure. |

### 4. Configuration

All limits are configurable in `application.yml` under `app.training`:

```yaml
app:
  training:
    max-file-size-bytes: 5242880   # 5 MB
    max-rows: 10000
    max-columns: 32
    max-source-length: 500
    max-target-length: 500
    max-logic-length: 5000
```

Tuning these for your environment is recommended (e.g. lower max rows or file size for higher security).

### 5. Rejected files

- Invalid or suspicious files (wrong size, wrong format, failed zip-bomb check, etc.) cause a **SecurityException**.
- The API returns **HTTP 403** with a JSON body: `{ "error": "Training file rejected", "message": "<reason>" }`.
- No data from rejected files is stored or passed to the rest of the app.

---

## Summary Table

| Area | Safety measure |
|------|----------------|
| **PHI** | App is specification-only; no live PHI processing. LLM gets only field keys/titles and logic text. Keep PHI out of names/comments/logic and use BAA if PHI in scope. |
| **Access** | All `/api/*` require access key. Use strong key and restrict network access. |
| **LLM** | Optional; off by default. No PHI in prompts. Use HIPAA-eligible endpoint if needed. |
| **Excel import** | Isolated package; scan (size, magic bytes, bounded read, zip-bomb); parse with row/column/cell limits; no formula eval; only sanitized strings to DB. Rejected files return 403. |
| **Malware / virus** | No arbitrary file execution. Excel is parsed with strict limits and no formula evaluation; upload path is isolated and size-bounded. |

For HIPAA and licensing, see [COMPLIANCE.md](COMPLIANCE.md). For running your own LLM, see [OWN_LLM.md](OWN_LLM.md).
