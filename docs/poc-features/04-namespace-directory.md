# 04 — Namespace Directory

## Why

With hundreds of teams the flat namespace dropdown (every namespace in one Autocomplete,
grouped only by URI scheme) stops working as the navigation model, and ownership is
invisible. The directory is a browsable page: namespaces grouped by owning team, with
filtering, pinning, and recents. It does not replace the app's namespace-scoping
mechanism — it is a better front door into it.

## Behavior spec

New route `/directory`, new sidenav entry ("Directory").

### Layout

- **Header**: title, subtitle `"{N} namespaces across {M} teams"`, and a filter box
  (320px, right-aligned) — placeholder "Filter by name, team, or description".
- **PINNED** section — user's favorited namespaces (only if any).
- **RECENT** section — last-visited namespaces (only if any).
- **One section per team**, sorted alphabetically, except **`Unclaimed` always sorts
  last** — unclaimed namespaces are the ownership-hygiene backlog, not the front page.
  Section header: team name uppercase + count chip.
- Cards in a responsive grid (3-up desktop, 2-up tablet, 1-up mobile).
- Empty filter result: "No namespaces match your filter."

### Namespace card

- Name (monospace, bold), description or "No description" underneath.
- Star toggle (top-right) → pin/unpin. Accessible labels: "pin {ns}" / "unpin {ns}".
- Chips: owner team (warning color when `Unclaimed`), and a scheme chip parsed from the
  name (`postgres://…` → `POSTGRES`; `foo:bar` → `FOO`; none otherwise).
- Buttons: **Datasets** and **Jobs**.

### Opening a namespace

Card buttons do three things, in order:
1. Set the app's selected namespace (the existing global mechanism — Redux slice
   persisted to localStorage in the POC app — so every namespace-scoped page just works).
2. Record the namespace into recents.
3. Navigate to `/datasets` or `/jobs`.

### Filtering

Client-side, case-insensitive substring across **name, owner, and description**
simultaneously. PINNED/RECENT sections respect the filter too. The full list is already
in memory; do not debounce or server-round-trip at this scale (revisit past ~2,000
namespaces).

### Preferences persistence

localStorage, two keys:

- `mq_favorite_namespaces`: `string[]` of namespace names (toggle add/remove)
- `mq_recent_namespaces`: `string[]`, most-recent-first, deduped, capped at 8

Wrap reads in try/catch and validate it's an array of strings (corrupt storage must not
crash the page). Isolate in a small `preferences.ts` module — this is the seam that
moves server-side once SSO identity exists.

## API surface

- `GET /namespaces` — existing; the only call. Fields used: `name`, `ownerName`,
  `description`. Cache aggressively (namespaces change rarely; POC uses 1h staleTime).

### How ownership gets populated (context, not UI work)

`ownerName` comes from the server's governance path: producers posting lineage events
with an `x-user` header claim their **job** namespaces; dataset/storage namespaces stay
`Unclaimed` unless explicitly claimed. Expect a realistic mix — that's what makes the
Unclaimed-last rule and warning chip meaningful.

## Implementation breakdown

1. `preferences.ts` — favorites/recents (pure, unit-testable).
2. `NamespaceCard` — presentational, callbacks in.
3. `DirectoryPage` — fetch, filter (memoized), group-by-team (memoized, Map preserving
   insertion order after sort), three section types reusing one card grid renderer.
4. Route + sidenav entry.

## Tests

- Grouping: teams alphabetical, Unclaimed last.
- Filter matches across all three fields; sections hide when empty.
- Pin toggle updates the PINNED section and persists across remount.
- Open records recent and navigates with the namespace selected.
- Corrupt localStorage (non-JSON, non-array) → page renders, prefs treated as empty.

## Acceptance criteria

- 50+ namespaces across several teams render grouped and instantly filterable.
- Pin/recents survive reload.
- Clicking "Datasets" on any card lands on the datasets page already scoped to that
  namespace.

## Iteration ideas

- Swap group key from flat `ownerName` to Domain ▸ Team once the bank API's namespace
  registry metadata (domain, environment, criticality) exists — the grouping code is
  the only thing that changes.
- Environment chips + a prod-by-default filter.
- Per-card dataset/job counts and lineage-coverage badge (needs cheap count endpoints —
  don't N+1 the list).
- Move preferences server-side keyed on the SSO user; merge localStorage on first load.
