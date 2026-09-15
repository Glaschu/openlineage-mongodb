# Web UI Design: Bank-Scale Lineage (Barclays)

Scope: **the web UI only** (`web/`). The bank runs its own API built on this server as the
base, extended with S3 storage functionality and Alation connections. The UI designed here
targets that API. Where the UI needs something the *base* API doesn't provide, it is listed
in §11 as an API contract requirement — not designed here.

Target environment: hundreds of teams, hundreds of namespaces, BCBS 239 regulatory use.
Primary capability: **lineage, and specifically column-level lineage tracking**.

---

## 1. Who uses it and for what

| Persona | Primary jobs |
|---|---|
| **Risk / finance analyst** (largest group) | "Where does this column in my report come from?" "Is this figure derived from approved sources?" Starts from a **column name / CDE**, not a namespace. |
| **Data engineer** | "If I change this column, what breaks downstream?" Impact analysis before change tickets; debugging failed pipeline runs. |
| **Data steward / CDO office** | Lineage coverage per domain, Alation mapping curation, ownership hygiene across hundreds of namespaces. |
| **Auditor / regulator support** | Evidence: "show me the lineage of this report as of Q1, exportable." |

Design consequence: **search-first, column-first**. Browsing by namespace is the fallback,
not the front door — with 500+ namespaces, the current namespace dropdown can't be the
primary navigation.

---

## 2. Current UI assessment

### What exists (and is worth keeping)

- Solid graph foundation: custom SVG zoom/pan canvas + ELK layout
  (`web/src/features/lineage/components/graph/`), separate table-level and column-level
  views, depth control, detail drawers.
- Feature-based structure (`features/{dashboard,datasets,jobs,lineage,search,alation,…}`)
  with react-query for data and small Redux slices for UI state — scales fine as a codebase.
- Alation mapping management already exists (`features/alation/AlationMappingsPage.tsx`:
  suggest/accept/reject with status filter).
- i18n (en/es/fr/pl/zh), paging components, tags UI, dataset versions.

### What breaks at hundreds of namespaces / bank usage

1. **Namespace dropdown is the navigation model.** `NamespaceSelect.tsx` loads *all*
   namespaces into one Autocomplete, groups only by URI scheme, and a single global
   "selected namespace" (Redux) scopes Datasets/Jobs pages. At 500+ entries this is
   unusable, and ownership/team/domain are invisible.
2. **Column lineage is rendered, not explained.** The column-level drawer
   (`ColumnLevelDrawer.tsx`) shows the schema plus the **raw `columnLineage` facet as a
   JSON tree** (`MqJsonView`). The dataset page's column-lineage tab
   (`DatasetColumnLineage.tsx`) does the same — with a *"payload too big to render,
   download instead"* fallback above 500 KB. Analysts and auditors cannot consume raw
   facet JSON; the >500 KB fallback shows the scale wall has already been hit.
3. **Upstream-only column graph, no direction concept in the UI.** The column-level view
   has only a depth control (`ActionBar.tsx`). No upstream/downstream toggle, no way to ask
   the #1 bank question: *what consumes this column?* (Base API limitation too — §11.)
4. **No column-first entry point.** Route is `/datasets/column-level/:namespace/:name` —
   dataset-centric. The "center on column" logic in `ColumnLevel.tsx` is commented out;
   search cannot find columns at all.
5. **No identity, team, or ownership anywhere in the UI.** No "my team" view; the
   dashboard is global; nothing shows who owns a namespace or dataset.
6. **No provenance affordances.** Edges in both graphs carry no information (which job,
   which run, what transformation) — `transformationType`/`transformationDescription`
   exist in the facet data but are never surfaced except inside raw JSON.
7. **Ops/scale polish**: hardcoded `FEATURE_FLAGS` (`shared/config/featureFlags.ts`),
   language switch does `window.location.reload()`, ELK layout runs on the main thread
   (a `web-worker-stub.ts` exists but elkjs isn't workerized), Marquez branding.

---

## 3. Information architecture

### 3.1 Navigation model

```
┌────────────────────────────────────────────────────────────────┐
│  [logo]  Omnisearch (Cmd-K) ............... [env: PROD ▾] [JG] │
├──────┬─────────────────────────────────────────────────────────┤
│ Home │  Home        = My Team: namespaces, recent runs, alerts │
│ Lin. │  Lineage     = column/table lineage explorer (the core) │
│ Data │  Datasets    = directory: Domain ▸ Team ▸ Namespace     │
│ Jobs │  Jobs        = same directory pattern                   │
│ Evt  │  Events      = (engineers/admins)                       │
│ Alat │  Alation     = mappings curation (stewards)             │
│ Gov  │  Governance  = coverage, ownership, evidence (CDO)      │
└──────┴─────────────────────────────────────────────────────────┘
```

Changes from today:
- **Omnisearch replaces the search page as the front door** (Cmd-K, always in header).
  Result groups: **Columns**, Datasets, Jobs, Namespaces. A column hit deep-links straight
  into the column lineage view centered on that column.
- **Namespace dropdown → directory page.** Datasets/Jobs pages get a left-rail tree
  *Domain ▸ Team ▸ Namespace* (registry metadata from the bank API), with type-ahead
  filter, favorites (pin), and recents. The global "selected namespace" Redux slice
  (`features/namespaces/slice.ts`) becomes "selected scope" = domain | team | namespace.
- **Environment filter in the header** (prod default; dev/uat opt-in) so production
  lineage isn't drowned out. Persisted per user.
- **Home = My Team**, not global metrics: your namespaces' recent runs, failures,
  lineage-coverage score, and your pinned datasets. Identity comes from the SSO headers
  the bank proxy injects (§9). The current global DataOps dashboard remains as a tab for
  platform admins.
- **New Governance section** for stewards/CDO: coverage dashboards and evidence exports
  (§8) — this is the BCBS-facing surface.

### 3.2 URLs (deep-linkable, evidence-friendly)

Every view state must be a URL — auditors paste links into tickets:

```
/lineage/column/{ns}/{dataset}?column=sort_code&direction=down&depth=3&asOf=2026-03-31
/lineage/table/{ns}/{dataset}?depth=5
/directory?domain=retail&team=payments
/governance/coverage?domain=risk
```

The column-level view already syncs `depth` and `column` to search params — extend the
pattern to `direction` and `asOf`, never component state alone.

---

## 4. The column lineage explorer (the core of this design)

Today's `ColumnLevel.tsx` (dataset+column nodes, ELK, drawer) is the base. Target UX:

### 4.1 Entry and focus

- **Column-first entry**: from omnisearch, from a dataset's schema table (each field row
  gets a lineage icon), or from an Alation deep link. The view opens **centered on the
  single selected column** showing its neighborhood — *not* every column of the dataset.
  (Re-enable and finish the commented-out `centerOnPositionedNode` logic in
  `ColumnLevel.tsx`.)
- Dataset-first entry (current behavior) remains: all columns of one dataset, collapsed
  by default to columns that *have* lineage, with a "show unmapped columns" toggle —
  unmapped columns are a data-quality signal, not noise.

### 4.2 Controls (ActionBar)

| Control | Detail |
|---|---|
| **Direction** | Upstream / Downstream / Both segmented control. Default **Both** at depth 1–2; the URL carries it. |
| **Depth** | Stepper as today, default 2, max bounded by server caps. |
| **As-of date** | Optional date picker → `asOf` param (BCBS point-in-time). Banner when viewing historical state: *"Lineage as of 31 Mar 2026"*. |
| **Trace path** | Mode: pick column A, then column B → dim everything except connecting paths. This is the regulator question "show me how A reaches B" as one interaction. |
| **Export** | CSV edge list (with provenance columns) + PNG of the current viewport. Goes into change tickets and evidence packs. |

### 4.3 Nodes and edges

- **Dataset container nodes** show namespace chip + owning team (registry metadata) and
  are **color-coded by domain** with a legend — cross-team boundaries are exactly what
  bank users need to see at a glance.
- **Column nodes** get badges from tags: `PII`, `CDE`, `BCBS` (tag infra already exists in
  `DatasetTags`/`shared/api/tags-*`). CDE columns get a distinct outline — they're the
  columns auditors care about.
- **Edge click → provenance panel** (replaces nothing; new): transformation type +
  description, the asserting job (link to job page), last-seen run + timestamp. This
  answers "*how* is this derived?" without reading JSON.
- **Honest truncation**: when the API caps the graph (`truncated: true` / per-node
  `hasMore`), render **"+N upstream" / "+N downstream" pill handles** on boundary nodes
  that fetch-and-expand on click. Never silently drop nodes. Expansion appends to the
  graph client-side (react-query cache keyed by node+direction+depth).

### 4.4 The drawer (replace raw JSON)

`ColumnLevelDrawer.tsx` currently shows schema + raw facet JSON. Redesign — selecting a
**column** shows:

1. **Derivation card**: "`branch_code` ← IDENTITY ← `retail.accounts.sort_code`
   (job: `accounts_to_rwa`, last seen 2d ago)" — one card per direct input, human-readable.
2. **Consumers card**: direct downstream columns, same format (needs downstream API).
3. **Tags & classification** (PII/CDE chips, editable by stewards).
4. **Alation card**: mapping status + deep link to the Alation catalog entry (§7).
5. Raw facet JSON stays, collapsed at the bottom, for engineers.

Selecting a **dataset** keeps schema table + adds owner/team, source, "open in Alation",
"open table-level lineage".

### 4.5 Impact analysis view (new, sibling of the graph)

A graph is wrong for "list everything downstream of this column" when the answer is 400
rows. Add a **table view toggle** (graph ⇄ table) on the lineage explorer: flat,
sortable, filterable list of transitive downstream columns — dataset, column, domain,
team, hops, last-seen — with CSV export. This is the change-management artifact engineers
attach to tickets. Backed by the impact endpoint (§11); paginate server-side.

---

## 5. Table-level lineage at scale

- **Semantic zoom**: zoomed out, collapse datasets into **namespace group nodes** (edge =
  "12 connections"); zoom in or double-click to expand. The group-node machinery exists
  (`TableLineageGroupNode.tsx`, currently behind the hidden `showGroupByParentToggle`
  flag) — generalize from parent-job grouping to namespace/domain grouping.
- Same honest-truncation pattern, namespace color legend, and export as the column view.
- Node click keeps the existing drawer; add owner/team and Alation link there too.

---

## 6. Search and discovery

- **Omnisearch (Cmd-K)** in the header, replacing the current search-page-in-header
  embed (`Header.tsx` renders `SearchPage` directly today). Grouped results with keyboard
  navigation; **Columns group first** when the query matches column names (needs column
  search API — §11).
- Result rows show namespace + owning team + env chip so identical dataset names across
  environments/teams are distinguishable.
- Recent searches and pinned items per user.
- Empty-query state = launcher: recents, favorites, "my team's datasets".

---

## 7. Alation surfaces (bank extension)

The bank API brings Alation connectivity; the UI should use it everywhere, not only on
the mappings admin page:

- **Dataset pages and lineage drawers**: Alation mapping status chip
  (`SUGGESTED / ACCEPTED / REJECTED / unmapped`) + **"Open in Alation"** deep link.
  Unmapped datasets show a one-click "suggest mapping" for stewards.
- **Column drawer**: linked Alation column/glossary term when the mapping exists — this is
  how a lineage column connects to the bank's business glossary (CDE definitions live in
  Alation; lineage lives here).
- **Mappings page** (`AlationMappingsPage.tsx`) stays the curation workbench; add bulk
  accept, filter by domain/team (directory metadata), and mapping-coverage counts.
- Governance coverage dashboard (§8) includes "% datasets with accepted Alation mapping".

---

## 8. Governance & evidence section (new, BCBS-facing)

- **Coverage dashboard**: per domain/team/namespace — % datasets with column lineage,
  % CDE columns mapped, % datasets with accepted Alation mappings, stale lineage
  (last-seen > N days). Drill-down to the offending datasets. This is both the CDO
  compliance view and the adoption lever for hundreds of teams.
- **Evidence exports**: "export lineage snapshot" for a namespace/report dataset —
  triggers the bank API's S3-backed export, shows export history with download links
  (the S3 storage functionality the bank API adds). Every export logged and listed —
  the audit trail is visible in the UI.
- **Archived history access**: run/event pages get a "load older from archive" affordance
  where hot-store TTLs have expired, backed by the bank API's S3 retrieval — the UI must
  distinguish *"no data"* from *"data archived, click to retrieve"* (slow path, show
  async/loading state, possibly job-based polling).
- **Ownership hygiene**: list of `Unclaimed` namespaces per domain, nudging owners.

---

## 9. Identity, flags, branding, and other cross-cutting work

- **Identity**: the bank fronts the UI with SSO; the SPA reads the authenticated user
  (and team/groups) from a `/me`-style endpoint or proxy-injected context. UI uses it for:
  My-Team home, steward-only actions (tagging, Alation accept/reject), hiding admin
  surfaces. **No auth logic in the SPA itself** — display-level gating only; enforcement
  is the API's job.
- **Config-driven runtime settings**: replace hardcoded `FEATURE_FLAGS` and build-time
  `__API_URL__` (`vite.config.ts`) with a runtime `/config` fetch (or injected
  `window.__CONFIG__`) so the bank can point one build at dev/uat/prod and toggle
  features without rebuilds — standard bank deployment requirement.
- **Branding/theming**: `shared/theme/theme.ts` is already central; parameterize palette +
  logo (Sidenav hardcodes the Marquez SVG) so the bank skin is a theme, not a fork.
  Keep light/dark.
- **i18n**: keep the infra; fix language switching to not `window.location.reload()`
  (Sidenav). UK English default; trim unused locales from the bank build.
- **Accessibility**: bank-internal tools are subject to accessibility policy. The custom
  SVG graph needs keyboard navigation (tab through nodes, arrow keys along edges) and the
  table/impact view (§4.5) doubles as the screen-reader-friendly representation of any
  graph.
- **Performance**:
  - Move ELK layout into a web worker (elkjs supports it; `web-worker-stub.ts` suggests
    this was anticipated). Layout of 500+ node graphs must not freeze the canvas.
  - Virtualize long lists (datasets/jobs directories, impact table) — `MqPaging` server
    paging already exists for tables; keep server caps authoritative for graphs.
  - React-query cache per (node, direction, depth) so expand-on-demand is incremental,
    plus `staleTime` on lineage queries (lineage changes slowly intra-day).

---

## 10. What stays as-is

- Graph rendering stack (ZoomPanSvg, ELK, node renderer maps) — extended, not replaced.
- Feature-folder structure, react-query + slim Redux, MUI + Mq* component library.
- Jobs/Runs pages, Events page, dataset versions/assertions/tags tabs.
- Alation mappings workbench (extended per §7).

---

## 11. API contract the UI requires (for the bank API team)

The base API (this repo) provides: table lineage BFS (`/lineage`), upstream-only column
lineage (`/column-lineage`), namespaces, search (name regex), tags, stats, Alation
mappings. The UI above additionally needs:

| # | Requirement | Used by |
|---|---|---|
| 1 | Column lineage **direction** param (upstream/downstream/both) — requires a reverse-traversable column edge store server-side | §4.2 |
| 2 | **Server caps + truncation metadata** (`truncated`, per-node `hasMore{Up,Down}`) and node-scoped expand queries | §4.3 |
| 3 | **Edge provenance** in responses: transformation type/description, asserting job, runId, lastSeen | §4.3, §4.4 |
| 4 | **Impact endpoint**: paginated flat transitive-downstream list for a column | §4.5 |
| 5 | **Column search**: `q` → (namespace, dataset, column, type, tags) | §6 |
| 6 | **Namespace registry metadata**: domain, team, environment, criticality, contacts (+ directory/grouping query) | §3, §5 |
| 7 | **`asOf`** historical lineage queries | §4.2, §8 |
| 8 | **Coverage stats** per scope (datasets w/ lineage %, CDE columns mapped %, stale edges) | §8 |
| 9 | **S3 archive access**: list/retrieve archived runs & events; trigger + list snapshot exports | §8 |
| 10 | **`/me`** (identity, teams, roles) + runtime `/config` (flags, API base) | §9 |
| 11 | Alation deep-link URLs + mapping status on dataset/column reads (not only the mappings list) | §7 |

⚠ Known base-API behaviors the UI must not paper over: column lineage facets expire with a
90-day TTL in the base server, and column traversal is upstream-only — items 1–3 and 7
exist precisely because of this. Also note current **version drift**: the repo's
controllers map `/api/v2` while the shipped web build targets `/api/v1`
(`vite.config.ts: __API_URL__`) — pin the contract version with the bank API team first.

---

## 12. Phased roadmap (UI workstreams)

| Phase | Scope | Depends on API items |
|---|---|---|
| **1. Column lineage explorer** | Direction toggle, column-first entry + centering, provenance edge panel, derivation cards replacing raw-JSON drawer, truncation/expand, CSV/PNG export | 1, 2, 3 |
| **2. Find things at scale** | Omnisearch w/ column results, namespace directory + favorites/recents + env filter, My-Team home, runtime config/flags, branding | 5, 6, 10 |
| **3. Impact & trace** | Impact table view, trace-path mode, PII/CDE badges, Alation chips/deep links on datasets & columns | 4, 11 |
| **4. Governance & evidence** | Coverage dashboards, as-of viewing, snapshot exports + history, archive retrieval UX, ownership hygiene | 7, 8, 9 |

Phase 1 is deliberately the column-lineage core: it converts the existing graph from a
visualization into the analysis tool the bank is adopting this for.
