// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'

import { buildColumnEvidenceMarkdown, columnEvidenceFilename } from './columnEvidence'
import type { ColumnImpactRow } from './columnImpact'

const capturedAt = new Date('2026-09-17T09:30:00.000Z')

const row = (overrides: Partial<ColumnImpactRow>): ColumnImpactRow => ({
  id: 'datasetField:analytics:orders:total',
  direction: 'upstream',
  namespace: 'analytics',
  dataset: 'orders',
  column: 'total',
  hops: 1,
  transformation: '',
  via: 'revenue',
  ...overrides,
})

const build = (rows: ColumnImpactRow[], depth = 2) =>
  buildColumnEvidenceMarkdown({
    namespace: 'analytics',
    dataset: 'summary',
    column: 'revenue',
    depth,
    url: 'http://localhost:1337/datasets/column-level/analytics/summary?column=x',
    rows,
    capturedAt,
  })

describe('buildColumnEvidenceMarkdown', () => {
  it('identifies the field and how to reproduce the view', () => {
    const doc = build([row({})])

    expect(doc).toContain('# Column lineage: summary.revenue')
    expect(doc).toContain('| Column | `revenue` |')
    expect(doc).toContain('| Captured | 2026-09-17T09:30:00.000Z |')
    expect(doc).toContain('Reproduce this view: http://localhost:1337/datasets/column-level')
  })

  it('separates derivation from consumption, derivation first', () => {
    const doc = build([
      row({ direction: 'upstream', dataset: 'orders' }),
      row({ direction: 'downstream', dataset: 'board_report' }),
    ])

    expect(doc.indexOf('## Derived from')).toBeLessThan(doc.indexOf('## Consumed by'))
    expect(doc).toContain('| Derived from | 1 column |')
    expect(doc).toContain('| Consumed by | 1 column |')
  })

  it('says how much of the lineage carries a recorded transformation', () => {
    const doc = build([
      row({ transformation: 'IDENTITY' }),
      row({ dataset: 'other', transformation: '' }),
    ])

    expect(doc).toContain('| Transformations recorded | 1 of 2 |')
  })

  it('explains that a dash is missing metadata, not an unchanged value', () => {
    const doc = build([row({})])

    expect(doc).toContain('A dash means no transformation was recorded for that edge')
    expect(doc).toContain('not that the value passed through unchanged')
  })

  it('states plainly when a field has no recorded derivation', () => {
    const doc = build([row({ direction: 'downstream' })])

    expect(doc).toContain('this field has no recorded derivation within the requested depth')
  })

  it('states plainly when nothing consumes the field', () => {
    const doc = build([row({ direction: 'upstream' })])

    expect(doc).toContain('nothing recorded consumes this field within the requested depth')
  })

  it('groups the columns it found by the dataset they live in', () => {
    const doc = build([
      row({ dataset: 'orders' }),
      row({ dataset: 'orders', column: 'tax' }),
      row({ dataset: 'refunds' }),
    ])

    const summary = doc.slice(doc.indexOf('## Columns by dataset'))
    expect(summary.indexOf('`analytics.orders` — 2')).toBeLessThan(
      summary.indexOf('`analytics.refunds` — 1')
    )
  })

  it('carries the shared scope caveats', () => {
    const doc = build([row({})], 4)

    expect(doc).toContain('within 4 hops')
    expect(doc).toContain('their absence is not evidence that none exist')
  })
})

describe('columnEvidenceFilename', () => {
  it('names the file after the field and the capture date', () => {
    expect(columnEvidenceFilename('analytics', 'summary', 'revenue', capturedAt)).toBe(
      'column-evidence-analytics-summary-revenue-2026-09-17.md'
    )
  })
})
