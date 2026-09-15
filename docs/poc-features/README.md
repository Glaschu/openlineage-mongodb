# POC Feature Briefs — Bank Lineage UI

Each file in this folder is a self-contained implementation brief for one feature proven
in the OpenLineage-MongoDB POC. They are written to be handed to a coding agent (or
engineer) working on the bank's version of the app, one at a time, without needing the
POC repo open.

Every brief follows the same structure:

- **Why** — the user problem, in bank terms
- **Behavior spec** — exact UX, URL contracts, edge cases
- **API surface** — which endpoints it uses (all exist in the Marquez-style base API;
  no backend changes required unless flagged)
- **Implementation breakdown** — components, state, algorithms, in build order
- **Tests** — what to assert
- **Acceptance criteria** — the definition of done
- **Iteration ideas** — where to take it once the bank API (S3, Alation extensions)
  is in play

## Recommended build order

| # | Brief | Depends on |
|---|---|---|
| 0 | [00-hardening-fixes.md](00-hardening-fixes.md) | nothing — do first, removes crashes the other work will trip over |
| 1 | [01-column-lineage-explorer.md](01-column-lineage-explorer.md) | nothing |
| 2 | [02-derivation-cards-drawer.md](02-derivation-cards-drawer.md) | 1 (shares the selection URL contract) |
| 3 | [03-lineage-export-and-links.md](03-lineage-export-and-links.md) | 1 |
| 4 | [04-namespace-directory.md](04-namespace-directory.md) | nothing |
| 5 | [05-governance-coverage.md](05-governance-coverage.md) | nothing |
| 6 | [06-omnisearch.md](06-omnisearch.md) | 1 (deep-links into the explorer) |

## Shared conventions (apply to every brief)

- **All view state lives in the URL.** Selected column, direction, depth, isolate —
  everything must survive a copy-paste of the address bar. Auditors and change tickets
  depend on shareable links.
- **Client-side only.** Each feature works against the existing API. Where the base API
  is the limiting factor (e.g. no downstream column traversal, no column search), the
  brief says so explicitly under "Known limits" — those are asks for the bank API team,
  not blockers.
- **Stack assumptions**: React + TypeScript, MUI, @tanstack/react-query for server
  state, a small Redux slice for cross-page UI state, react-router v6 with
  `useSearchParams`. Adjust idioms to the target repo, keep the behavior contracts.
- **Demo data**: `tools/generate_openlineage_events.py` in the POC repo generates
  chained pipelines with columnLineage facets. Flags: `--domain <team>` prefixes all
  namespaces (one estate per team), `--user <name>` sends `x-user` so job namespaces
  get an owner. Useful to replicate the test bed on any environment.
