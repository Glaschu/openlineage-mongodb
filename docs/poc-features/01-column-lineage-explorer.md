# 01 — Column Lineage Explorer: Selection, Direction, Isolate, Centering

## Why

The column-level lineage graph renders every column of every dataset in range, with no
way to ask the two questions bank users actually have: *where does this column come
from* (ancestry) and *what does this column feed* (impact). This feature turns the graph
from a picture into an analysis tool: click a column, trace its paths, hide everything
else.

## Behavior spec

### Selection model

- **Click** on a column node selects it. Selection is written to the URL (see contract
  below) — it is the single source of truth. **Hover must not write to the URL**
  (the previous behavior wrote search params on mouseenter, which spams history and
  makes links unstable); hover only applies a local glow.
- Clicking a column also opens the dataset detail drawer (existing behavior, keyed off
  the `dataset` param).
- A **chip in the action bar** shows the selected column with an ✕ that clears
  selection (removes `column`, `columnName`, `isolate` params).

### URL contract

All on the column-level route's query string, additive to the existing `depth` param:

| Param | Values | Meaning |
|---|---|---|
| `column` | `datasetField:{namespace}:{dataset}:{field}` | selected column node id |
| `columnName` | the bare field name | display convenience |
| `direction` | `upstream` \| `downstream` \| `both` (default `both`) | trace direction relative to the selected column |
| `isolate` | `true` \| absent | hide nodes not on the traced paths |
| `dataset`, `namespace` | existing | drawer target |

A pasted URL must reproduce the exact view: selection, highlight, direction, isolation,
and centering.

### Direction semantics (important)

Given the selected column node, compute the reachable set:

- **upstream** = transitive closure following `inEdges` to their **origins** (ancestors)
- **downstream** = transitive closure following `outEdges` to their **destinations**
  (descendants)
- **both** = union of the two, *not* undirected reachability. Undirected BFS pulls in
  "siblings" (other columns derived from a shared ancestor) which are not on any lineage
  path through the selected column. This distinction is the whole point for audit users.

The reachable set always includes the start node. Implement as two plain BFS walks over
the already-fetched graph (the API returns the whole subgraph; no extra calls needed).

Watch for an existing bug if porting old Marquez code: the legacy `findConnectedNodes`
followed `edge.destination` for *inbound* edges (there's a `// todo fix this broken`
comment in upstream Marquez). Inbound edges must follow `origin`.

### Rendering rules

- Columns **in** the reachable set: normal rendering; edges where *both* endpoints are
  in the set are colored with the theme primary color; all other edges grey.
- Columns **not** in the set (when a selection exists): dimmed to ~30% opacity
  (restore full opacity on hover so they remain discoverable).
- Selected column: primary-colored border + glow.
- **Isolate on**: nodes outside the reachable set are removed from the layout input
  entirely (not just hidden) so ELK re-lays-out a compact path view. Dataset container
  nodes with zero remaining columns disappear naturally. Edges to removed nodes are
  filtered too.
- Direction/isolate controls are **disabled when no column is selected** (tooltip:
  "Select a column to trace its lineage").

### Centering

After layout completes: if `column` is set, center the viewport on that node (zoom 1);
otherwise fit the whole graph. Re-run on changes to node count, selection, direction,
or isolate. In the POC this is a ~300 ms `setTimeout` after layout settles; if the graph
component exposes a layout-complete callback, use that instead.

### Action bar additions

Right-hand cluster, left of the existing depth field:
`[Upstream | Both | Downstream]` toggle group → writes `direction`;
`Isolate` switch → writes `isolate`. Both keyboard-accessible.

## API surface

- `GET /column-lineage?nodeId=dataset:{ns}:{name}&depth={n}` — existing, unchanged.
  Response: `{ graph: [{ id, type, data: {namespace, dataset, field, fieldType}, inEdges: [{origin, destination}], outEdges: [{origin, destination}] }] }`
  Normalize `inEdges`/`outEdges` to `[]` at the fetch boundary — the server can omit them.

### Known limits (bank API asks, do not block on them)

- The base API traverses **upstream only** from the center dataset, so "downstream"
  here means *within the loaded subgraph*. True global impact analysis needs a reverse
  index server-side. The UI is already correct for whenever that lands — direction is
  just a parameter.

## Implementation breakdown (build order)

1. **`getDirectedNodeIds(graph, startId, direction): Set<string>`** — pure function,
   two BFS walks as specced. Unit-test first (see Tests).
2. **Layout builder** — extend the existing graph→ELK transform with
   `(graph, selectedColumnId, direction, isolate)`. Attach `selected` / `dimmed`
   booleans to each column node's data; color edges; filter when isolating.
3. **Column node renderer** — click handler writes the four params; render
   selected/dimmed states; remove any param writes from hover.
4. **Action bar** — toggle group + switch + selection chip, all reading/writing
   `useSearchParams`. Use copy-on-write (`new URLSearchParams(searchParams)`) so params
   compose with existing ones.
5. **Page component** — read params, pass through to layout builder, centering effect.

## Tests

- `getDirectedNodeIds` on the diamond graph `a→b→c`, `d→b`:
  - upstream of `b` = `{b, a, d}`
  - downstream of `b` = `{b, c}`
  - **both of `a` = `{a, b, c}` — must NOT include `d`** (the sibling-exclusion case)
  - unknown/null start → empty set
- Column node: click writes all four params; hover writes nothing; `dimmed` renders at
  reduced opacity; `selected` renders highlighted.
- Action bar: toggles disabled without selection; chip clear removes `column`,
  `columnName`, `isolate`.

## Acceptance criteria

- Click a column in a ≥3-hop chain: its ancestry and impact paths highlight, the rest
  dims, the view centers on it.
- Switch to Upstream: only ancestors stay highlighted. Isolate: canvas shows only the
  path nodes, re-laid-out.
- Copy the URL into a new tab: identical view.
- No URL/history churn while moving the mouse over the graph.

## Iteration ideas

- When the bank API adds true downstream traversal: pass `direction` to the fetch
  instead of filtering client-side; everything else stays.
- Trace-path mode: select column A then B, highlight only connecting paths
  (intersection of A's downstream set and B's upstream set).
- Badge column nodes from field tags (PII / CDE) once tags are populated.
