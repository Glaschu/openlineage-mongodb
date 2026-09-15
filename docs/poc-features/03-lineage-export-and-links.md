# 03 — Lineage Export (CSV) and Shareable Links

## Why

Evidence leaves the tool in two forms: a **flat edge list** attached to change tickets
and regulator packs, and a **link** that reproduces the exact view for a colleague or
an auditor. Neither existed; the only export was "download the raw facet JSON".

Depends on: brief 01 (everything view-defining is already in the URL, which is what
makes copy-link trivial).

## Behavior spec

Two icon buttons in the column-level action bar:

### Export CSV

Downloads `column-lineage-{namespace}-{dataset}.csv` containing every edge of the
**currently loaded** graph (the full fetched subgraph — not filtered by
direction/isolate; the file is the evidence superset, the on-screen view is the lens).

Columns, in order:

```
source_namespace,source_dataset,source_column,target_namespace,target_dataset,target_column,transformation_type,transformation_description
```

Rules:

- One row per unique directed edge. Iterate nodes' `inEdges`, dedupe on
  `origin->destination` (the same edge appears on both endpoints' edge lists).
- Node ids parse as `datasetField:{namespace}:{dataset}:{column}`.
- **Transformation join**: the graph edges carry no transformation metadata. Join it
  from the center dataset's `columnLineage` facet: build a map keyed on the full
  6-tuple (source ns/ds/field + target ns/ds/field) → `{type, description}` from each
  entry's inputFields (per-inputField values win over entry-level). Edges not in the
  map get empty strings — only edges *into the center dataset* can be annotated in the
  POC; leave the columns present regardless so the file format is stable.
- **CSV escaping**: wrap a value in double quotes and double any inner quotes if it
  contains a comma, quote, or newline. Column names in banks contain commas in
  descriptions; do not skip this.
- Use a Blob + `file-saver` (or anchor download); MIME `text/csv;charset=utf-8`.

### Copy link

Copies `window.location.href` to the clipboard. That's the whole feature — it works
because brief 01 keeps selection/direction/depth/isolate in the URL. Guard
`navigator.clipboard?.` (insecure contexts on some bank intranets lack it; fall back to
a no-op rather than crashing — or a tiny prompt fallback if you want belt and braces).

Both buttons get tooltips: "Export visible lineage as CSV (edge list with
transformations)" / "Copy a shareable link to this exact view". Disable export until the
graph has loaded.

## API surface

None beyond what the page already fetched: the `/column-lineage` graph and the center
dataset's detail (for the transformation join). No new calls on click — export is
synchronous over in-memory data.

### Known limits

- PNG/image export was deliberately skipped in the POC: the canvas is a ReactFlow
  DOM/SVG hybrid and rasterizing it needs an extra dependency (`html-to-image`). If the
  bank wants image evidence, add that library and snapshot the flow viewport element —
  do not hand-roll SVG serialization.
- Transformation annotation only covers edges into the center dataset (see join rule).
  Full annotation needs per-edge provenance from the bank API.

## Implementation breakdown

1. `buildColumnLineageCsv(graph, centerDataset?): string` — pure function: header,
   dedupe, parse, join, escape. Unit-test heavily; this file goes to regulators.
2. `downloadColumnLineageCsv(graph, ns, name, centerDataset?)` — Blob + save.
3. Wire buttons into the action bar; page passes an `onExportCsv` callback bound to its
   already-fetched data.

## Tests

- Diamond graph (`a→b`, `d→b`, `b→c`): exactly 3 rows + header; no duplicate edges.
- Transformation join: an edge matching a facet entry gets its type/description; a
  non-matching edge gets empty strings; a description containing a comma round-trips
  quoted (`"copied, verbatim"`).
- Header string is byte-exact (downstream tooling will key on it).

## Acceptance criteria

- Export from a multi-hop graph opens cleanly in Excel: one row per edge, transformation
  columns populated for the center dataset's inputs.
- Copy link → paste in a new tab → identical view (selection, direction, isolate,
  depth, centering).

## Iteration ideas

- Export respecting the current direction/isolate filter as an option ("export visible
  paths only").
- Server-side export via the bank API's S3-backed snapshot endpoint for big graphs —
  same columns, async download, listed in an export history (audit trail).
- Add provenance columns (job, runId, lastSeen) when the bank API exposes them per edge.
