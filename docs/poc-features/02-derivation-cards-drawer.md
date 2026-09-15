# 02 — Derivation Cards Drawer (replace raw facet JSON)

## Why

The column-level drawer used to show the dataset schema plus the **raw `columnLineage`
facet as a JSON tree**. Analysts and auditors cannot consume facet JSON; the dataset
page even had a "payload too big to render, download instead" fallback above 500 KB.
This feature renders the facet as human-readable derivation cards — "*this column is
IDENTITY-copied from that column, by this pipeline*" — which is the audit answer to
"how is this number derived?".

Depends on: brief 01's URL contract (`dataset`, `namespace`, `column`, `columnName`).

## Behavior spec

The drawer opens when the `dataset` search param is set (existing behavior). Content,
top to bottom:

1. **Header**: dataset icon, dataset name, namespace beneath it, close button (clears
   all search params — existing behavior, keep it).
2. **COLUMN section** — only when `columnName` is set:
   - Chip with the selected column name.
   - **DERIVED FROM** (upstream): one card per direct input field. Source of truth is
     the *dataset detail response's* `columnLineage` facet — find the entry whose
     `name === columnName`, render its `inputFields`. Each card shows:
     - `dataset.field` in monospace, namespace underneath
     - chips: `transformationType` (primary outline) and `transformationDescription`
       (plain outline). Per-inputField values win; fall back to the entry-level values
       (the facet allows both placements).
     - Empty state: "No upstream column lineage recorded for this column."
   - **FEEDS INTO** (downstream): one card per direct consumer, derived from the
     *loaded lineage graph* (passed into the drawer as a prop): find the node whose id
     equals the `column` param, map its `outEdges[].destination`, parse each id
     (`datasetField:{ns}:{ds}:{field}`). No transformation chips here — the consuming
     dataset's facet holds that info and isn't fetched in the POC.
     - Empty state: "No downstream consumers within the loaded graph. Increase depth to
       trace further." (Honest about the depth-bounded view.)
   - **Cards are clickable**: navigate to the referenced column's own column-level page,
     carrying `dataset`, `namespace`, `column`, `columnName` (and preserving `depth`).
     This is cross-dataset hop navigation — an analyst can walk a chain card by card.
3. **SCHEMA section**: existing fields table (name / type / description), with two
   changes: rows are clickable and **clicking a row selects that column** (writes the
   selection params, same as clicking a node); the selected row renders in the table's
   selected state. Subtext when nothing selected: "Select a row to trace a column."
4. **RAW COLUMN LINEAGE FACET**: the old JSON view survives for engineers, but demoted
   into a collapsed accordion at the bottom. Render only when the facet array is
   non-empty.

### Loading / empty

- While the dataset detail is loading: centered spinner (existing).
- Dataset with no fields: "No schema available" empty state.

## API surface

- `GET /namespaces/{ns}/datasets/{name}` — existing. Provides `fields[]` and the
  `columnLineage` facet (`ColumnLineageEntry[]`, see brief 00 §4 for the corrected
  type — inputFields use `name` for the dataset, not `dataset`).
- The lineage graph (for FEEDS INTO) comes from the page's existing
  `/column-lineage` fetch — pass it down as a prop; don't re-fetch.

## Implementation breakdown

1. Fix/confirm the `ColumnLineageEntry` types (brief 00 §4).
2. `ColumnRef` view model: `{ namespace, dataset, field, transformationType?,
   transformationDescription? }`. Two derivations:
   - `derivedFrom`: from `dataset.columnLineage` entry matching `columnName`
   - `feedsInto`: from graph node `outEdges`, parsing node ids
3. Card component (one, reused for both lists) with the click-through navigation.
4. Schema table row selection.
5. Accordion-wrap the JSON view.

The drawer takes the graph as an **optional** prop so it can still render standalone
(tests, other entry points) — both lists just go empty.

## Tests

- With a selected column and a facet entry: DERIVED FROM card shows
  `sourcedataset.sourcefield`, the transformation chips render, FEEDS INTO section
  renders.
- Clicking a schema row writes `column` + `columnName` params.
- Raw JSON only renders for a non-empty facet; it receives the facet array verbatim.
- No dataset / loading / empty-fields states.

## Acceptance criteria

- Selecting a mid-chain column shows both its inputs (with transformation chips) and
  its consumers; clicking a card lands on that column's page with it selected.
- An analyst can answer "where does this field come from and what uses it" without
  reading any JSON.
- Engineers can still get the raw facet from the accordion.

## Iteration ideas

- FEEDS INTO transformation chips: fetch the consuming dataset's detail lazily on card
  hover/expand (one call per distinct consumer dataset).
- Add the asserting job + run timestamp per card once the bank API exposes edge
  provenance.
- Alation chip per card (mapping status + deep link) via the bank's Alation extension.
