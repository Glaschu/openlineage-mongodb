# 05 — Governance: Lineage Coverage Page

## Why

For BCBS-style governance the question is not "show me lineage" but "**how complete is
our lineage, and where are the gaps**". This page gives the CDO/steward view per
namespace: % of datasets carrying column lineage, sampled field-level completeness, and
the explicit gap list to chase. It is also the adoption lever — teams see their score.

## Behavior spec

New route `/governance`, sidenav entry ("Coverage").

### Layout

- Header: title "Lineage Coverage", subtitle, and a namespace Autocomplete (right),
  **defaulting to the app's currently selected namespace**.
- Three metric cards:
  1. **DATASETS WITH COLUMN LINEAGE** — `X / Y` + progress bar + "% of datasets in this
     namespace carry a columnLineage facet"
  2. **FIELD-LEVEL COVERAGE (SAMPLED)** — `mappedFields / totalFields` + progress bar +
     "% of fields mapped across N sampled datasets"
  3. **LINEAGE GAPS** — count of datasets with no column lineage ("the backlog below")
- **DATASETS table**: name (link → that dataset's column-level lineage page), field
  count, status chip (`Tracked` primary / `Missing` warning), mapped fields
  (`m / n`, or `—` when not sampled), updated-at.
- States: loading bar while computing; error empty-state ("Could not compute coverage");
  "Pick a namespace" when none selected; "No datasets in this namespace".

## How coverage is computed (client-side — this is the key trick)

The Marquez-style **dataset list endpoint already encodes column-lineage presence**
without the payload: `columnLineage` is `[]` when the dataset has the facet and `null`
when it doesn't (the detail endpoint returns the full array). Verify this against the
target API before building — it's the load-bearing assumption.

Algorithm:

1. `GET /namespaces/{ns}/datasets?limit=500` → list.
2. Presence: `hasColumnLineage = dataset.columnLineage !== null`.
3. **Field-level sampling**: for up to 25 datasets that have lineage, fetch the detail
   (`GET /namespaces/{ns}/datasets/{name}`) in parallel (`Promise.all`, individual
   failures caught → excluded from the sample, not fatal). Mapped count = number of
   `columnLineage` entries; clamp to the dataset's field count when displaying (facets
   can reference fields not in the current schema).
4. Aggregate: totals, with-lineage count, sampled fields/mapped sums.

Label everything derived from step 3 as **sampled** in the UI — it is a sample, not a
census. Cache the computation (react-query, keyed on namespace, ~5 min staleTime).

## API surface

- `GET /namespaces` (picker)
- `GET /namespaces/{ns}/datasets?limit=500&offset=0`
- `GET /namespaces/{ns}/datasets/{name}` × ≤25

### Known limits

- One namespace at a time; cross-estate rollups would N×500 the calls. Fine for the POC.
- Per-CDE coverage (only the columns that matter) needs field tags populated.
- The honest end-state is a server-side coverage endpoint (the bank API ask:
  `GET /stats/lineage-coverage?namespace=…`); this page's UI is already shaped for it —
  swap the data hook, delete the client computation.

## Implementation breakdown

1. `computeNamespaceCoverage(namespace)` — async pure function returning
   `{ namespace, totalDatasets, datasetsWithColumnLineage, sampledDatasets,
   sampledFields, sampledMappedFields, datasets: DatasetCoverage[] }` where
   `DatasetCoverage = { name, namespace, updatedAt, fieldCount, hasColumnLineage,
   mappedFieldCount: number | null, tags }`.
2. `useNamespaceCoverage(namespace)` hook wrapping it (enabled only when set).
3. `MetricCard` presentational component (title, value, optional progress, hint).
4. Page: picker + cards + table + states.

## Tests

- Coverage math: mixed list (with/without lineage) → correct counts; detail-fetch
  failure excluded from sample; mapped clamped to field count; `percent(0,0) = 0`
  (no NaN on an empty namespace).
- Table rows link to the right column-level URL (encoded namespace/name).
- Default namespace comes from app selection; changing the picker recomputes.

## Acceptance criteria

- A namespace where every output dataset has the facet shows ~100% presence and a
  plausible sampled field percentage; raw-source namespaces list as gaps.
- The Missing list links straight into the lineage view of each gap dataset.
- An empty or unknown namespace shows a graceful state, never NaN.

## Iteration ideas

- Swap to the server-side coverage endpoint when available (keep the UI contract).
- CDE-weighted coverage once field tags exist (% of *CDE* columns mapped — the number
  regulators actually want).
- Stale-lineage column (last-seen vs now) when edge provenance exists.
- Alation mapping coverage card via the bank's Alation extension (% datasets with
  accepted mappings).
- Domain-level rollup view across namespaces (needs server aggregation).
