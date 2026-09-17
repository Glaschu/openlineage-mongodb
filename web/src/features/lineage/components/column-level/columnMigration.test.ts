// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'

import {
  buildColumnMigrationEvidenceMarkdown,
  columnMigrationEvidenceFilename,
  combineColumnMigrationImpact,
  describeColumnMember,
  summariseColumnMigration,
} from './columnMigration'
import type { ColumnImpactRow } from './columnImpact'

const capturedAt = new Date('2026-09-17T09:30:00.000Z')

const row = (overrides: Partial<ColumnImpactRow>): ColumnImpactRow => ({
  id: 'datasetField:analytics:report:revenue',
  direction: 'downstream',
  namespace: 'analytics',
  dataset: 'report',
  column: 'revenue',
  hops: 1,
  transformation: '',
  via: 'total',
  owner: '',
  ...overrides,
})

const MEMBERS = ['datasetField:analytics:orders:total', 'datasetField:analytics:orders:tax']

describe('describeColumnMember', () => {
  it('reads a column id as dataset and column', () => {
    expect(describeColumnMember('datasetField:analytics:orders:total')).toEqual({
      namespace: 'analytics',
      dataset: 'orders',
      column: 'total',
      label: 'orders.total',
    })
  })
})

describe('combineColumnMigrationImpact', () => {
  it('lists a column reached from two members once, naming both', () => {
    const rows = combineColumnMigrationImpact(MEMBERS, [
      { member: MEMBERS[0], rows: [row({ hops: 3 })] },
      { member: MEMBERS[1], rows: [row({ hops: 1 })] },
    ])

    expect(rows).toHaveLength(1)
    expect(rows[0].reachedFrom).toEqual(['orders.total', 'orders.tax'])
    expect(rows[0].hops).toBe(1)
  })

  it('marks a column that is itself part of the change', () => {
    const rows = combineColumnMigrationImpact(MEMBERS, [
      { member: MEMBERS[0], rows: [row({ id: MEMBERS[1], dataset: 'orders', column: 'tax' })] },
    ])

    expect(rows[0].inSet).toBe(true)
  })

  it('takes the transformation from the shortest path, not the first seen', () => {
    const rows = combineColumnMigrationImpact(MEMBERS, [
      { member: MEMBERS[0], rows: [row({ hops: 4, transformation: 'AGGREGATION' })] },
      { member: MEMBERS[1], rows: [row({ hops: 1, transformation: 'IDENTITY' })] },
    ])

    expect(rows[0].transformation).toBe('IDENTITY')
  })
})

describe('summariseColumnMigration', () => {
  it('counts what breaks separately from what feeds in', () => {
    const rows = combineColumnMigrationImpact(MEMBERS, [
      {
        member: MEMBERS[0],
        rows: [
          row({ id: 'd:1', direction: 'downstream', owner: 'payments-data-eng' }),
          row({ id: 'd:2', direction: 'downstream', owner: 'Unclaimed' }),
          row({ id: 'u:1', direction: 'upstream', owner: 'retail-data-eng' }),
        ],
      },
    ])

    const summary = summariseColumnMigration(MEMBERS, rows)

    expect(summary.external).toBe(3)
    expect(summary.downstream).toBe(2)
    expect(summary.upstream).toBe(1)
    expect(summary.teamsToCoordinate).toEqual(['payments-data-eng', 'retail-data-eng'])
  })

  // A column nothing reads still cannot be moved without what feeds it, so the
  // upstream count has to survive a zero downstream count.
  it('still counts upstream when nothing reads the changing columns', () => {
    const rows = combineColumnMigrationImpact(MEMBERS, [
      {
        member: MEMBERS[0],
        rows: [
          row({ id: 'u:1', direction: 'upstream' }),
          row({ id: 'u:2', direction: 'upstream' }),
        ],
      },
    ])

    const summary = summariseColumnMigration(MEMBERS, rows)

    expect(summary.downstream).toBe(0)
    expect(summary.upstream).toBe(2)
  })
})

describe('buildColumnMigrationEvidenceMarkdown', () => {
  const build = (rows: ColumnImpactRow[], depth = 3) => {
    const combined = combineColumnMigrationImpact(MEMBERS, [{ member: MEMBERS[0], rows }])
    return buildColumnMigrationEvidenceMarkdown({
      members: MEMBERS,
      rows: combined,
      summary: summariseColumnMigration(MEMBERS, combined),
      depth,
      url: 'http://localhost:1337/datasets/column-level/analytics/orders?view=migration',
      capturedAt,
    })
  }

  it('leads with what breaks, because that is what has to be acted on', () => {
    const doc = build([row({ direction: 'downstream' }), row({ id: 'u:1', direction: 'upstream' })])

    expect(doc.indexOf('## Breaks if these columns change')).toBeLessThan(
      doc.indexOf('## These columns are derived from')
    )
    expect(doc).toContain('| Columns that read these (downstream) | 1 |')
  })

  it('lists the columns being changed', () => {
    const doc = build([row({})])

    expect(doc).toContain('- `orders.total` in `analytics`')
    expect(doc).toContain('- `orders.tax` in `analytics`')
  })

  it('does not treat silence as safety', () => {
    const doc = build([row({ direction: 'upstream' })])

    expect(doc).toContain('That is not a guarantee nothing does')
  })

  it('carries the transformation caveat, since a dash is not "unchanged"', () => {
    expect(build([row({})])).toContain('not that the value passes through unchanged')
  })

  it('names the owners of what breaks', () => {
    const doc = build([row({ direction: 'downstream', owner: 'payments-data-eng' })])

    expect(doc).toContain('### Owners of affected columns')
    expect(doc).toContain('`payments-data-eng` — 1')
  })
})

describe('columnMigrationEvidenceFilename', () => {
  it('names the file for the change and date', () => {
    expect(columnMigrationEvidenceFilename(capturedAt)).toBe('column-change-evidence-2026-09-17.md')
  })
})
