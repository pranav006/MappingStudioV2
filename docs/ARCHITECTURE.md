# MappingStudio — Architecture & Expectations

This document describes the application architecture, component responsibilities, main flows, and design expectations. For security, PHI, and deployment details see [SAFETY.md](SAFETY.md), [COMPLIANCE.md](COMPLIANCE.md), and [DEPLOYMENT.md](DEPLOYMENT.md).

---

## High-Level Overview

MappingStudio is a **mapping specification** tool: users define source and target schemas (EDI segments, JSON paths, XSD elements, etc.) and create mappings with **business logic** text (natural-language descriptions suitable for BAs), not executable code. The app does **not** run transformations on live data—it produces and stores mapping *specifications* that can be exported (e.g. Excel) or used elsewhere.

| Layer | Technology | Role |
|-------|------------|------|
| **Frontend** | React, Vite, Ant Design, Tailwind | Single-page app: projects, schema trees, mapping ledger, suggestions, export, access-key login |
| **Backend** | Spring Boot (Java 17+) | REST API, SQLite DB, EDI/custom schemas, AI suggestions, training import, export |
| **Data** | SQLite (`mappingstudio.db`) | Projects, mappings, custom schemas, AI learning table |

**API contract**: All `/api/*` endpoints require an **access key** (`X-Access-Key` header or `accessKey` query for GET), except `POST /api/auth/check` (login). CORS allows `http://localhost:*` and `http://127.0.0.1:*` for dev.

---

## Backend Package Structure & Responsibilities

```
com.mappingstudio
├── BackendApplication.java          # Spring Boot entry
├── config/                           # Global behavior
│   ├── AccessKeyFilter.java         # Protects /api/* with access key; allows /api/auth/check
│   └── WebConfig.java               # CORS for /api/**
├── controller/                       # REST entry points
│   ├── AuthController.java         # POST /api/auth/check — validate access key
│   ├── EdiSchemaController.java    # GET /api/edi/schemas, /api/edi/schema/{name}
│   ├── ProjectController.java      # CRUD projects, list with coverage %
│   ├── SchemaController.java       # Unified schemas: list, load by id, upload (custom)
│   └── (mapping → MappingController; export → ExportController)
├── mapping/
│   ├── MappingController.java      # Save, load by project, PATCH, DELETE mappings
│   └── MappingEntity.java          # JPA: projectId, projectName, source, target, logic, comments, reviewLater
├── model/
│   ├── ProjectEntity.java          # JPA: name, sourceSchema, targetSchema, status, updated; @Transient coverage
│   ├── CustomSchemaEntity.java     # JPA: uploaded schema (name, type, treeJson)
│   └── Mapping.java                # DTO if used
├── repository/                      # JPA repositories (Project, Mapping, CustomSchema, AiLearning)
├── edi/
│   └── EdiSchemaRegistry.java      # Load EDI schemas from classpath; leaf count for coverage
├── schema/
│   ├── SchemaService.java          # List EDI + custom; load by id (EDI key or custom-{id})
│   ├── SchemaUploadService.java    # Upload JSON/XSD/CSV/Excel → parse → tree → persist CustomSchema
│   └── SchemaTreeBuilders.java     # Build tree (title, key, children, isLeaf) from JSON/XSD/CSV/Excel
├── ai/
│   ├── AiController.java           # Import spec, learn accepted/rejected/edited, suggest
│   ├── AiSuggestionEngine.java     # Orchestrates: LLM (if enabled) else rule-based, then learned, then defaults
│   ├── AiTrainerService.java       # learnAccepted/Rejected/Edited → AiLearningEntity (no file handling)
│   ├── LlmMappingService.java      # Optional HTTP LLM; suggests business-logic text
│   ├── RuleBasedSuggestionService.java  # Name/key analysis when LLM off
│   └── training/                   # Isolated Excel handling for training import only
│       ├── TrainingImportService.java   # Single entry: validate → parse → trainer.learnAccepted only
│       ├── ExcelSpecScanner.java        # Size + magic-byte check; boundedStream()
│       ├── SafeExcelSpecParser.java    # Parse with row/column/length limits → SanitizedRow
│       ├── SanitizedRow.java            # record(source, target, logic)
│       ├── TrainingConfig.java         # app.training.* limits
│       └── BoundedInputStream.java      # Cap bytes read (zip-bomb protection)
├── export/
│   ├── ExportController.java       # GET Excel by project name or id
│   └── ExcelExportService.java     # Generate Excel (source, business logic, target, comments, review later)
└── ems/
    └── EmsGenerator.java           # EMS / codegen if used
```

**Design expectations**:

- **Single entry for training Excel**: Only `TrainingImportService` receives the uploaded file. No other code parses Excel or touches raw uploads; only sanitized (source, target, logic) strings leave the `ai.training` package.
- **Schemas**: EDI schemas live on classpath (`schemas/edi/*.json`). Custom schemas are uploaded via `SchemaController` → `SchemaUploadService` → `SchemaTreeBuilders` → `CustomSchemaEntity`. Schema list/load is unified in `SchemaService` (EDI by key, custom by `custom-{id}`).
- **Coverage**: Computed in `ProjectController` when listing projects. Coverage = distinct mapped targets / target schema leaf count (capped 99% when only one mapping so “ready for deployment” implies more than one field).
- **Business logic, not code**: Mapping “logic” is natural-language text (e.g. “Map NM109 to SSN in target”). Suggestions (LLM or rule-based) return such text; defaults are BA-style phrases. Export column is “Business Logic”.

---

## Main Flows

### 1. Auth

- Frontend calls `POST /api/auth/check` with `{ "accessKey": "…" }`. No key required for this call.
- If valid, frontend stores key and sends `X-Access-Key` (or `accessKey` for GET) on all other `/api/*` requests.
- `AccessKeyFilter` allows OPTIONS and `POST /api/auth/check`; all other `/api/*` require the configured key.

### 2. Projects & Mappings

- **List projects**: `GET /api/projects` → backend computes coverage per project (distinct targets / target schema leaf count) and sets transient `coverage` on each entity.
- **Create project**: `POST /api/projects` with name, sourceSchema, targetSchema (display names).
- **Mappings**: `POST /api/mappings/save`, `GET /api/mappings/project/{projectId}`, `PATCH /api/mappings/{id}`, `DELETE /api/mappings/{id}`. Entity: source, target, logic (business logic text), comments, reviewLater.

### 3. Schemas

- **List**: `GET /api/schemas` → EDI (id = key, kind = edi) + custom (id = custom-{id}, kind = custom).
- **Load**: `GET /api/schemas/{id}` → EDI from `EdiSchemaRegistry` or custom from DB; response includes `tree` (nested nodes: title, key, children, isLeaf).
- **Upload**: `POST /api/schemas/upload` (file, type, name) → `SchemaUploadService` parses by type (json_sample, xsd, csv_sample, excel_spec), builds tree via `SchemaTreeBuilders`, saves `CustomSchemaEntity`, returns id, name, tree.

### 4. AI Suggestions

- **Suggest**: `POST /api/ai/suggest` (source, target, sourceTitle, targetTitle) → `AiSuggestionEngine`:
  - If LLM enabled: `LlmMappingService` returns 2–4 short business-logic phrases.
  - Else: `RuleBasedSuggestionService` suggests from field names/keys.
  - Then: merge learned history from `AiLearningRepository` (by source/target).
  - If still empty: default BA-style suggestions (e.g. “Map X to Y in target”).
- **Learning**: `POST /api/ai/learn/accepted`, `/learn/rejected`, `/learn/edited` (source, target, logic) → `AiTrainerService` updates or creates `AiLearningEntity` (confidence, accept/reject/edit counts). No file or Excel involved here.

### 5. Training Import (Excel)

- **Import**: `POST /api/ai/import-spec` with multipart file.
- Flow: `AiController` → `TrainingImportService.importSpec(file)`:
  1. `ExcelSpecScanner.validateForTraining(file)` — size limit, .xlsx, ZIP magic bytes.
  2. `scanner.boundedStream(file)` → parser reads only up to `maxFileSizeBytes`.
  3. `SafeExcelSpecParser.parse(stream)` — row/column/string length limits → list of `SanitizedRow`.
  4. For each row: `AiTrainerService.learnAccepted(source, target, logic)`.
- No raw file or POI objects leave the `ai.training` package. On validation failure → 403 and error message.

### 6. Export

- `GET /api/export/excel/project/{projectId}` (or by project name) → `ExcelExportService` builds Excel with columns: Source Field, Business Logic, Target Field, Comments, Review later.

---

## Data Model (Persisted)

| Entity | Table | Main fields |
|--------|--------|-------------|
| Project | projects | id, name, sourceSchema, targetSchema, status, updated |
| Mapping | mappings | id, projectId, projectName, source, target, logic, comments, reviewLater |
| CustomSchema | custom_schemas | id, name, type, treeJson, createdAt |
| AiLearning | ai_learning | source/target/logic, confidence, accept/reject/edit counts |

`ProjectEntity.coverage` is **not** persisted; it is computed when listing projects.

---

## Configuration Expectations (`application.yml`)

| Key | Purpose |
|-----|---------|
| `app.access-key` | Shared key for /api/* (default `mappingstudio`; override with `APP_ACCESS_KEY`) |
| `app.training.*` | Max file size, max rows/columns, max lengths for source/target/logic (training import only) |
| `app.schema.max-file-size-bytes` | Max upload size for non-EDI schema files |
| `app.llm.*` | Optional LLM (api-key, api-url, model); empty = no LLM calls |

Database: SQLite, `jdbc:sqlite:./mappingstudio.db`, Hibernate `ddl-auto: update`.

---

## Summary of Expectations

1. **Access**: All API use (except login) requires the configured access key.
2. **Training Excel**: Only the `ai.training` package handles Excel; only sanitized (source, target, logic) strings are passed out; size and format are validated before parse.
3. **Schemas**: EDI from classpath; custom from uploads. Unified list/load by id (EDI key or custom-{id}).
4. **Coverage**: Percentage of target schema leaves that have at least one mapping; capped at 99% when only one distinct target is mapped.
5. **Business logic**: Mapping logic is descriptive text for BAs, not executable code; suggestions and export use “Business Logic” wording.
6. **No live PHI**: App works with schema metadata and mapping text; it does not process live member/patient data. See [SAFETY.md](SAFETY.md) and [COMPLIANCE.md](COMPLIANCE.md) for PHI and compliance.

For LLM setup and deployment, see [OWN_LLM.md](OWN_LLM.md) and [DEPLOYMENT.md](DEPLOYMENT.md).
