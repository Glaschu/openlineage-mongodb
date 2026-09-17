// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'

import { buildColumnImpactCsv, buildColumnImpactRows } from './columnImpact'
import { transformationKey } from './columnLineageUtils'
import type { ColumnLineageNode } from '@/shared/types/api'

const id = (dataset: string, column: string) => `datasetField:analytics:${dataset}:${column}`

const node = (dataset: string, column: string): ColumnLineageNode =>
  ({
    id: id(dataset, column),
    type: 'column',
    data: { namespace: 'analytics', dataset, field: column, column },
    inEdges: [],
    outEdges: [],
  } as unknown as ColumnLineageNode)

const link = (from: ColumnLineageNode, to: ColumnLineageNode) => {
  const edge = { origin: from.id, destination: to.id }
  from.outEdges.push(edge)
  to.inEdges.push(edge)
}

/** orders.total -> summary.revenue -> board_report.revenue */
const buildChain = () => {
  const source = node('orders', 'total')
  const middle = node('summary', 'revenue')
  const sink = node('board_report', 'revenue')
  link(source, middle)
  link(middle, sink)
  return { graph: [source, middle, sink], source, middle, sink }
}

describe('buildColumnImpactRows', () => {
  it('answers what a column feeds and what feeds it, with distance', () => {
    const { graph } = buildChain()

    const rows = buildColumnImpactRows(graph, id('summary', 'revenue'))

    expect(rows.map((row) => [row.direction, row.dataset, row.column, row.hops])).toEqual([
      ['upstream', 'orders', 'total', 1],
      ['downstream', 'board_report', 'revenue', 1],
    ])
  })

  it('reaches transitively and counts the hops', () => {
    const { graph } = buildChain()

    const rows = buildColumnImpactRows(graph, id('orders', 'total'))

    expect(rows.map((row) => [row.dataset, row.hops])).toEqual([
      ['summary', 1],
      ['board_report', 2],
    ])
  })

  it('names the column each row was reached through', () => {
    const { graph } = buildChain()

    const rows = buildColumnImpactRows(graph, id('orders', 'total'))

    expect(rows.find((row) => row.dataset === 'board_report')?.via).toBe('revenue')
  })

  it('carries the transformation for edges the facet describes', () => {
    const { graph } = buildChain()
    const transformations = new Map([
      [
        transformationKey(
          { namespace: 'analytics', dataset: 'orders', column: 'total' },
          { namespace: 'analytics', dataset: 'summary', column: 'revenue' }
        ),
        { type: 'AGGREGATION', description: 'sum' },
      ],
    ])

    const rows = buildColumnImpactRows(graph, id('orders', 'total'), transformations)

    expect(rows.find((row) => row.dataset === 'summary')?.transformation).toBe('AGGREGATION')
    // Nothing is claimed for edges the facet does not cover.
    expect(rows.find((row) => row.dataset === 'board_report')?.transformation).toBe('')
  })

  it('returns nothing without a selection or for an unknown column', () => {
    const { graph } = buildChain()

    expect(buildColumnImpactRows(graph, null)).toEqual([])
    expect(buildColumnImpactRows(graph, id('orders', 'nope'))).toEqual([])
    expect(buildColumnImpactRows(undefined, id('orders', 'total'))).toEqual([])
  })

  it('skips edges pointing at columns missing from the loaded graph', () => {
    const { graph, middle } = buildChain()
    middle.outEdges.push({ origin: middle.id, destination: id('ghost', 'col') })

    const rows = buildColumnImpactRows(graph, id('summary', 'revenue'))

    expect(rows.some((row) => row.dataset === 'ghost')).toBe(false)
  })

  it('terminates on a cycle', () => {
    const a = node('a', 'x')
    const b = node('b', 'y')
    link(a, b)
    link(b, a)

    const rows = buildColumnImpactRows([a, b], a.id)

    expect(rows).toHaveLength(2)
  })
})

describe('buildColumnImpactCsv', () => {
  it('writes the header and a row per impacted column', () => {
    const { graph } = buildChain()

    const csv = buildColumnImpactCsv(buildColumnImpactRows(graph, id('orders', 'total')))
    const lines = csv.split('\n')

    expect(lines[0]).toBe(
      'direction,namespace,owner,dataset,column,hops,via_column,transformation_type'
    )
    expect(lines[1]).toBe('downstream,analytics,,summary,revenue,1,total,')
    expect(lines).toHaveLength(3)
  })
})
