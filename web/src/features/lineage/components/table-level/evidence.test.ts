// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'

import { buildEvidenceMarkdown, evidenceFilename } from './evidence'
import type { ImpactRow } from './impact'

const capturedAt = new Date('2026-09-17T09:30:00.000Z')

const row = (overrides: Partial<ImpactRow>): ImpactRow => ({
  id: 'id',
  direction: 'downstream',
  type: 'DATASET',
  namespace: 'analytics',
  name: 'orders',
  hops: 1,
  updatedAt: '2026-09-14T22:06:33.925Z',
  state: '',
  ...overrides,
})

const build = (rows: ImpactRow[], depth = 3) =>
  buildEvidenceMarkdown({
    nodeType: 'job',
    namespace: 'spark-jobs',
    name: 'transform_task_9_4',
    depth,
    url: 'http://localhost:1337/lineage/job/spark-jobs/transform_task_9_4?depth=3',
    rows,
    capturedAt,
  })

describe('buildEvidenceMarkdown', () => {
  it('states what was traced, when, and how to reproduce it', () => {
    const doc = build([row({})])

    expect(doc).toContain('# Lineage impact: transform_task_9_4')
    expect(doc).toContain('| Captured | 2026-09-17T09:30:00.000Z |')
    expect(doc).toContain('| Depth requested | 3 |')
    expect(doc).toContain(
      'Reproduce this view: http://localhost:1337/lineage/job/spark-jobs/transform_task_9_4?depth=3'
    )
  })

  it('counts each direction and the furthest hop', () => {
    const doc = build([
      row({ direction: 'upstream', hops: 1 }),
      row({ direction: 'upstream', hops: 4 }),
      row({ direction: 'downstream', hops: 2 }),
    ])

    expect(doc).toContain('| Upstream objects | 2 |')
    expect(doc).toContain('| Downstream objects | 1 |')
    expect(doc).toContain('| Furthest hop | 4 |')
  })

  it('groups objects by namespace, busiest first', () => {
    const doc = build([
      row({ namespace: 'warehouse' }),
      row({ namespace: 'analytics' }),
      row({ namespace: 'analytics' }),
    ])

    const summary = doc.slice(doc.indexOf('## Objects by namespace'))
    expect(summary.indexOf('`analytics` — 2')).toBeLessThan(summary.indexOf('`warehouse` — 1'))
  })

  it('lists impacted objects nearest first', () => {
    const doc = build([row({ name: 'far', hops: 5 }), row({ name: 'near', hops: 1 })])

    expect(doc.indexOf('`near`')).toBeLessThan(doc.indexOf('`far`'))
  })

  it('escapes pipes so a name cannot break the table', () => {
    const doc = build([row({ name: 'weird|name' })])

    expect(doc).toContain('weird\\|name')
  })

  it('states the limits of what it covers, including what absence does not prove', () => {
    const doc = build([row({})], 2)

    expect(doc).toContain('## Scope of this evidence')
    expect(doc).toContain('within 2 hops')
    expect(doc).toContain('their absence is not evidence that none exist')
    expect(doc).toContain('Hop counts are shortest paths')
  })

  it('says depth in the singular when it is one', () => {
    expect(build([row({})], 1)).toContain('within 1 hop of')
  })

  it('distinguishes an isolated object from an under-deep query', () => {
    const doc = build([])

    expect(doc).toContain('No upstream or downstream objects were found')
    expect(doc).toContain('did not reach its neighbours')
    expect(doc).not.toContain('## Impacted objects')
  })
})

describe('ownership in the evidence pack', () => {
  it('counts the teams involved and the objects nobody owns', () => {
    const doc = build([
      row({ owner: 'retail-data-eng' }),
      row({ owner: 'retail-data-eng' }),
      row({ owner: 'Unclaimed' }),
      row({ owner: '' }),
    ])

    expect(doc).toContain('| Owning teams | 1 |')
    expect(doc).toContain('| Objects in unclaimed namespaces | 2 |')
  })

  it('lists real teams before unclaimed, and says why unclaimed matters', () => {
    const doc = build([row({ owner: 'Unclaimed' }), row({ owner: 'markets-data-eng' })])

    const section = doc.slice(doc.indexOf('## Ownership'))
    expect(section.indexOf('`markets-data-eng`')).toBeLessThan(section.indexOf('`Unclaimed`'))
    expect(doc).toContain('a change here has no owner to consult')
  })

  it('says nothing about unclaimed objects when every object has an owner', () => {
    const doc = build([row({ owner: 'retail-data-eng' })])

    expect(doc).toContain('| Objects in unclaimed namespaces | 0 |')
    expect(doc).not.toContain('no owner to consult')
  })

  it('names the owner on every row of the table', () => {
    const doc = build([row({ owner: 'payments-data-eng', name: 'ledger' })])

    expect(doc).toContain('| `payments-data-eng` | `ledger` |')
  })
})

describe('evidenceFilename', () => {
  it('names the file after the object and the capture date', () => {
    expect(evidenceFilename('spark-jobs', 'transform_task_9_4', capturedAt)).toBe(
      'lineage-evidence-spark-jobs-transform_task_9_4-2026-09-17.md'
    )
  })
})
