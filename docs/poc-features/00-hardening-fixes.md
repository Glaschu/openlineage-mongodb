# 00 — Hardening Fixes (do first)

Small defects found while building the POC. None are features, but real sparse data
(jobs with no runs, datasets with no lineage) triggers them immediately, so land these
before any feature work.

## 1. Dashboard crash: job with no run history

**Symptom**: `Uncaught TypeError: reduce of empty array with no initial value` from the
dashboard's job run item; the whole dashboard error-screens.

**Cause**: computing "longest run" via `latestRuns.reduce((acc, run) => …)` with no
initial value. Any job that is registered but has never run (or whose runs were
TTL-expired) has `latestRuns: []`, and `Array.reduce` throws on an empty array without
an initial value.

**Fix**:

```ts
const longestRun = useMemo(
  () =>
    job.latestRuns && job.latestRuns.length > 0
      ? job.latestRuns.reduce((acc, run) => (acc.durationMs > run.durationMs ? acc : run))
      : undefined,
  [job.latestRuns]
)
```

And guard the per-run bar height against division by zero / null duration (running jobs
have `durationMs: null`):

```ts
height={
  longestRun && longestRun.durationMs > 0
    ? ((run.durationMs ?? 0) / longestRun.durationMs) * 40
    : 2
}
```

**Tests**: render the item with `latestRuns: []` (must not throw, still shows the job
name and the "LAST 10 RUNS" label) and with one run whose `durationMs` is `null`
(no NaN heights).

## 2. Dead local @font-face sources

**Symptom**: console noise on every load — `downloadable font: rejected by sanitizer`
for `fonts/Karla/*.ttf`, `fonts/SourceCodePro/*.ttf`.

**Cause**: `@font-face` rules in the global CSS reference `.ttf` files that are not
shipped in `public/`; the dev server answers those URLs with the SPA's HTML fallback,
which the browser's font sanitizer rejects. The real fonts load from the Google Fonts
`<link>` in `index.html`.

**Fix**: remove the dead `url(...)` sources; keep `src: local('Karla')` /
`local('Source Code Pro')` only (or delete the @font-face blocks entirely if the bank
build self-hosts fonts properly — preferred on a locked-down network where Google Fonts
may be blocked; in that case actually ship the woff2 files and point @font-face at them).

## 3. API version drift

**Symptom**: UI built against `/api/v1` while the server maps `/api/v2` (or vice versa)
— every call 404s.

**Fix**: the API base path must come from one place. In the POC it is a build-time
constant in two spots (`vite.config.ts` `__API_URL__` define and a duplicate
`API_URL` in the shared fetch module) — both must agree. For the bank build, replace
the build-time constant with runtime config (a `/config` endpoint or injected
`window.__CONFIG__`) so one artifact deploys to dev/uat/prod.

## 4. Type fix: columnLineage facet input fields

The dataset response's `columnLineage[].inputFields[]` entries identify the upstream
dataset via a property named **`name`** (per the OpenLineage ColumnLineage facet spec),
not `dataset`. The POC's TS types had this wrong and nothing noticed because the facet
was only ever rendered as raw JSON. Correct shape:

```ts
interface ColumnLineageInputField {
  namespace: string
  name: string   // upstream dataset name
  field: string
  transformationDescription?: string | null
  transformationType?: string | null
}

interface ColumnLineageEntry {
  name: string   // output column
  inputFields: ColumnLineageInputField[]
  transformationDescription: string | null
  transformationType: string | null
}

// Dataset.columnLineage: ColumnLineageEntry[]
```

Briefs 02/03/05 depend on this type being right.

## Acceptance criteria

- Dashboard renders with a mix of jobs having 0, 1, and 10 runs; no console errors.
- No font sanitizer warnings in the console.
- A single config value controls the API base path.
- `columnLineage` facet types compile and match a real API response.
