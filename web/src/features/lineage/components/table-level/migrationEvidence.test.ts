// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'

import { buildMigrationEvidenceMarkdown, migrationEvidenceFilename } from './migrationEvidence'
import { summariseMigration } from './migrationSet'
import type { MigrationSetRow } from './migrationSet'

const capturedAt = new Date('2026-09-17T09:30:00.000Z')

const row = (overrides: Partial<MigrationSetRow>): MigrationSetRow => ({
  id: 'dataset:analytics:orders',
  direction: 'downstream',
  type: 'DATASET',
  namespace: 'analytics',
  name: 'orders',
  hops: 1,
  updatedAt: '',
  state: '',
  owner: '',
  inSet: false,
  reachedFrom: ['job:etl:mover'],
  ...overrides,
})

const build = (members: string[], rows: MigrationSetRow[], depth = 5) =>
  buildMigrationEvidenceMarkdown({
    members,
    rows,
    summary: summariseMigration(members, rows),
    depth,
    url: 'http://localhost:1337/lineage/job/etl/mover?view=migration',
    capturedAt,
  })

describe('buildMigrationEvidenceMarkdown', () => {
  it('leads with the decision: what moves, what it touches, who to ask', () => {
    const doc = build(
      ['job:etl:mover'],
      [row({ owner: 'payments-data-eng' }), row({ id: 'x', owner: 'Unclaimed' })]
    )

    expect(doc).toContain('| Objects moving | 1 |')
    expect(doc).toContain('| Affected outside the set | 2 |')
    expect(doc).toContain('| Teams to coordinate with | payments-data-eng |')
    expect(doc).toContain('| Affected objects with no owner | 1 |')
  })

  it('says "none" rather than leaving the coordination cell blank', () => {
    const doc = build(['job:etl:mover'], [row({ owner: 'Unclaimed' })])

    expect(doc).toContain('| Teams to coordinate with | none |')
  })

  it('names every member that reaches a shared dependency', () => {
    const doc = build(
      ['job:etl:a', 'job:etl:b'],
      [row({ reachedFrom: ['job:etl:a', 'job:etl:b'] })]
    )

    expect(doc).toContain('`a`, `b`')
  })

  it('lists what moves, by type and qualified name', () => {
    const doc = build(['job:etl:mover', 'dataset:raw:seed'], [row({})])

    expect(doc).toContain('- JOB `etl.mover`')
    expect(doc).toContain('- DATASET `raw.seed`')
  })

  it('separates dependencies already inside the move, and says they need no coordination', () => {
    const doc = build(
      ['job:etl:a', 'job:etl:b'],
      [row({ id: 'job:etl:b', name: 'b', namespace: 'etl', inSet: true })]
    )

    expect(doc).toContain('## Dependencies already inside the set')
    expect(doc).toContain('they need no coordination')
  })

  it('states when a move is self-contained instead of showing an empty table', () => {
    const doc = build(['job:etl:a'], [])

    expect(doc).toContain('The move is self-contained as far as recorded lineage shows')
    expect(doc).not.toContain('### Owners to coordinate with')
  })

  it('explains how members were combined, since a hop count now spans several traces', () => {
    const doc = build(['job:etl:a'], [row({})], 7)

    expect(doc).toContain('within 7 hops')
    expect(doc).toContain('traced independently')
    expect(doc).toContain('shortest distance from any of them')
  })
})

describe('migrationEvidenceFilename', () => {
  it('names the file for the set and the capture date', () => {
    expect(migrationEvidenceFilename(capturedAt)).toBe('migration-set-evidence-2026-09-17.md')
  })
})
