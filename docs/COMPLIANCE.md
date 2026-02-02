# MappingStudio — HIPAA & Licensing Notes

This document is for awareness only and does not constitute legal advice. Consult your legal and compliance teams for your specific use.

For a full description of **safety measures**, **how PHI-safe the app is**, and **Excel parsing security**, see [SAFETY.md](SAFETY.md).

---

## HIPAA

- **When HIPAA applies**: If you use MappingStudio with **Protected Health Information (PHI)** (e.g. real member data, patient identifiers, clinical data), HIPAA rules apply to you and your vendors.
- **External LLM (e.g. OpenAI)**:
  - Sending **PHI** to an external API (e.g. OpenAI) **without a Business Associate Agreement (BAA)** is generally **not HIPAA-compliant**.
  - OpenAI’s standard API is **not** HIPAA-compliant for PHI; they offer **HIPAA-eligible** options (e.g. Azure OpenAI with BAA, or enterprise BAA) that you must use if PHI is sent to them.
- **HIPAA-safe use of MappingStudio**:
  1. **Do not enable the external LLM** when handling PHI: leave `OPENAI_API_KEY` unset. The app works fully without it (learned + default logic suggestions only).
  2. **Or** point the LLM to a **HIPAA-eligible** endpoint (e.g. Azure OpenAI with BAA) and ensure your agreement and configurations meet HIPAA requirements.
  3. **Do not send PHI in prompts**: The optional LLM feature sends only **field names/keys** (e.g. "NM109", "SSN") and mapping logic text—not live patient data. Keeping real PHI out of prompts reduces exposure but does not by itself make the vendor HIPAA-compliant; you still need a BAA if PHI is in scope.

---

## External API (e.g. OpenAI) & Licensing

- **Your product**: MappingStudio is a separate product. Using the OpenAI **API** (HTTP calls) does not change the license of your code; you are not distributing OpenAI’s code.
- **OpenAI terms**: Your use of their API is governed by **OpenAI’s Terms of Use** and **API usage policies**. You may build commercial products that call the API, provided you comply with those terms (e.g. acceptable use, attribution if required, no implied endorsement).
- **Data**: Under standard OpenAI terms, API data may be used for things like abuse monitoring; for zero retention / enterprise terms, you need the appropriate agreement with OpenAI (or use Azure OpenAI under your contract).
- **Recommendation**: Treat the LLM as **optional**. Ship with no API key; customers who want AI-assisted suggestions can configure a key or a compliant endpoint. That keeps MappingStudio usable as a standalone product without imposing a specific vendor or license on the end user.

---

## Training Import (Excel) Security

- **Isolation**: Excel import for “training” (mapping spec import) is **isolated** in the `com.mappingstudio.ai.training` package. No other app code processes uploaded file content; only the scanner and parser in that package touch the file, and only sanitized (source, target, logic) strings are passed to the rest of the app.
- **Scanning before processing**: Every uploaded Excel file is **scanned** before parsing:
  - **Size limit**: Configurable max file size (default 5 MB) to prevent zip bombs and oversized uploads.
  - **Magic bytes**: File must start with ZIP magic bytes (XLSX is ZIP); non-ZIP uploads are rejected.
  - **Bounded read**: The parser reads from a **bounded** stream so the server never consumes more than the allowed size, even if the client sends a lying Content-Length.
  - **Zip-bomb detection**: POI’s zip-bomb detection is enabled with a **stricter** ratio for training import only.
- **Safe parsing**: Row/column/cell length limits are enforced; formulas are **not** evaluated (only cached values or empty). All cell values are trimmed and truncated to config limits before being stored.
- **Recommendation**: Keep `app.training` limits in `application.yml` (e.g. `max-file-size-bytes`, `max-rows`) appropriate for your environment. Rejected files return HTTP 403 with a clear message.

---

## Summary

| Topic | Guidance |
|-------|----------|
| **HIPAA** | Do not send PHI to external APIs without a BAA. For PHI, either disable the LLM or use a HIPAA-eligible LLM (e.g. Azure OpenAI with BAA). |
| **Licensing** | Using the OpenAI API does not alter your product’s license. Comply with OpenAI’s terms for API use. |
| **Safe default** | LLM is **off** by default (`OPENAI_API_KEY` unset). The product is fully functional without any external AI. |
| **Training import** | Excel import is isolated; files are scanned (size, magic bytes, bounded read, zip-bomb) and parsed with strict limits. No malware path via training upload. |
