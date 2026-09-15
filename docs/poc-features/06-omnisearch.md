# 06 — ⌘K Omnisearch (datasets, jobs, columns)

## Why

At hundreds of namespaces, browsing is the fallback and search is the front door — and
bank users start from a **column/CDE name** ("where is sort_code?"), which the existing
search cannot answer at all. Omnisearch is a keyboard-first dialog over the existing
search endpoint, with column matching layered on client-side, deep-linking straight
into the column lineage explorer.

Depends on: brief 01 (column results deep-link using its URL contract).

## Behavior spec

### Invocation

- **⌘K / Ctrl-K** anywhere in the app toggles the dialog (a visible `⌘K` chip in the
  header advertises it). `preventDefault()` to beat the browser's address-bar binding.
  Esc closes (Dialog default). Closing clears the query.
- Dialog: fixed near the top (~80px), 600px wide, autofocused input with a search icon
  and a spinner while fetching.

### Querying

- Input debounced ~250 ms; queries only fire for non-empty text.
- **Datasets & jobs**: existing `GET /search?q={q}&sort=NAME&limit=20`; split results
  by `type` (`DATASET` / `JOB`).
- **Columns**: the base API has no column search. Client-side: fetch the **currently
  selected namespace's** datasets once per dialog session
  (`GET /namespaces/{ns}/datasets?limit=100`, cached ~5 min, only while the dialog is
  open), then case-insensitive substring match over every dataset's `fields[].name`.
- Cap each group at 6 rows.

### Results

Grouped list, in order: **COLUMNS** (sticky subheader), **DATASETS**, **JOBS** —
columns first because that's the differentiating group.

- Column row: `dataset.field` monospace, type chip, namespace right-aligned.
  Click → column-level page with the full selection contract:
  `/datasets/column-level/{ns}/{ds}?dataset={ds}&namespace={ns}&column=datasetField:{ns}:{ds}:{field}&columnName={field}`
  (URL-encode path segments; build query with `URLSearchParams`).
- Dataset/job row: name monospace, namespace right-aligned.
  Click → the table-level lineage page for that node (use the app's existing
  node-encoding helper for `/lineage/...` paths).
- Every result click closes the dialog and resets the query.
- No matches: `No matches for "{q}".`
- Empty query: hint line — "Columns are matched within {ns}. Esc to close." or
  "Select a namespace to enable column matching." when none selected.

## API surface

- `GET /search?q=&sort=NAME&limit=20` — existing. (Verify it exists on the target
  deployment: older builds predate the SearchController.)
- `GET /namespaces/{ns}/datasets?limit=100` — existing, for column matching.

### Known limits

- Column matching is scoped to one namespace and ≤100 datasets — a POC compromise,
  clearly hinted in the empty state. Bank-wide column search is an API ask
  (`/search/columns?q=` over an indexed `fields.name`); when it lands, replace the
  client matcher with that call and drop the scoping hint. The result rendering and
  deep links stay identical.

## Implementation breakdown

1. `useDebounced(value, 250)` — trivial hook (or reuse an existing one).
2. Global keydown effect (register on `window`, clean up on unmount; the component
   mounts once in the Header).
3. Column matcher: memo over `(debouncedQuery, datasets)`, early-exit at 6 hits.
4. Dialog + grouped list + row components; navigation handlers as above.
5. Mount in the Header next to the existing search; add the `⌘K` chip.

Gotcha from the POC: anything rendered in the Header sits **outside** route context in
some test setups — mock the omnisearch in Header unit tests, and test omnisearch itself
inside a router.

## Tests

- ⌘K opens, Esc closes, query resets on close.
- Typing ≥1 char fires a (mocked) search; results split into the right groups, capped
  at 6.
- Column match is case-insensitive substring over field names of the namespace's
  datasets; no namespace selected → no COLUMNS group and the hint shows.
- Column row click navigates with all four selection params; dataset row click
  navigates to the lineage path.

## Acceptance criteria

- From anywhere: ⌘K → type `col_7` → click the column hit → land on the column-level
  view with that column selected, highlighted, and centered.
- Dataset and job hits land on their lineage views.
- Search round-trip feels instant (debounce + caps; no layout jank as groups appear).

## Iteration ideas

- Bank-wide column search via the API ask above.
- Keyboard navigation (↑/↓ + Enter) across groups.
- Recents/favorites as the empty-query state (reuse brief 04's preferences module).
- Group result rows by namespace with owner chips when names collide across teams.
