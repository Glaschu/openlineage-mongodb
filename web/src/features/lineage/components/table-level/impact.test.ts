// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'

import { buildImpactCsv, buildImpactRows } from './impact'
import type { LineageGraph } from '@/shared/types/api'
import type { LineageNode } from '@/shared/types/lineage'

const dataset = (id: string, namespace: string, name: string, updatedAt = ''): LineageNode =>
  ({
    id,
    type: 'DATASET',
    data: { namespace, name, updatedAt },
    inEdges: [],
    outEdges: [],
  } as unknown as LineageNode)

const job = (id: string, namespace: string, name: string, state?: string): LineageNode =>
  ({
    id,
    type: 'JOB',
    data: { namespace, name, updatedAt: '', latestRun: state ? { state } : null },
    inEdges: [],
    outEdges: [],
  } as unknown as LineageNode)

const link = (from: LineageNode, to: LineageNode) => {
  const edge = { origin: from.id, destination: to.id }
  from.outEdges.push(edge)
  to.inEdges.push(edge)
}

/** raw -> loader -> staged -> report-job -> report */
const buildChain = (): { graph: LineageGraph; nodes: Record<string, LineageNode> } => {
  const raw = dataset('d:raw', 'landing', 'raw')
  const loader = job('j:loader', 'etl', 'loader', 'COMPLETED')
  const staged = dataset('d:staged', 'warehouse', 'staged', '2026-09-14T22:11:00Z')
  const reportJob = job('j:report', 'etl', 'report-builder', 'FAILED')
  const report = dataset('d:report', 'marts', 'report')

  link(raw, loader)
  link(loader, staged)
  link(staged, reportJob)
  link(reportJob, report)

  const nodes = { raw, loader, staged, reportJob, report }
  return { graph: { graph: Object.values(nodes) }, nodes }
}

describe('buildImpactRows', () => {
  it('lists everything reachable in both directions with its distance', () => {
    const { graph } = buildChain()

    const rows = buildImpactRows(graph, 'd:staged')

    expect(rows.map((row) => [row.direction, row.name, row.hops])).toEqual([
      ['upstream', 'loader', 1],
      ['upstream', 'raw', 2],
      ['downstream', 'report-builder', 1],
      ['downstream', 'report', 2],
    ])
  })

  it('does not list the focused node itself', () => {
    const { graph } = buildChain()

    expect(buildImpactRows(graph, 'd:staged').some((row) => row.id === 'd:staged')).toBe(false)
  })

  it('records the shortest path when a node is reachable two ways', () => {
    const { graph, nodes } = buildChain()
    // A shortcut that reaches the report in one hop instead of two.
    link(nodes.staged, nodes.report)

    const rows = buildImpactRows(graph, 'd:staged')

    expect(rows.find((row) => row.name === 'report')?.hops).toBe(1)
  })

  it('carries run state for jobs and leaves it empty for datasets', () => {
    const { graph } = buildChain()

    const rows = buildImpactRows(graph, 'd:staged')
    expect(rows.find((row) => row.name === 'report-builder')?.state).toBe('FAILED')
    expect(rows.find((row) => row.name === 'report')?.state).toBe('')
  })

  it('returns nothing when the focus is missing or unknown', () => {
    const { graph } = buildChain()

    expect(buildImpactRows(graph, null)).toEqual([])
    expect(buildImpactRows(null, 'd:staged')).toEqual([])
    expect(buildImpactRows(graph, 'd:nope')).toEqual([])
  })

  it('terminates on a cycle', () => {
    const a = dataset('d:a', 'ns', 'a')
    const b = job('j:b', 'ns', 'b')
    link(a, b)
    link(b, a)

    const rows = buildImpactRows({ graph: [a, b] }, 'd:a')

    expect(rows.map((row) => [row.direction, row.name])).toEqual([
      ['upstream', 'b'],
      ['downstream', 'b'],
    ])
  })
})

describe('buildImpactCsv', () => {
  it('writes a header and one row per impacted node', () => {
    const { graph } = buildChain()

    const csv = buildImpactCsv(buildImpactRows(graph, 'd:staged'))
    const lines = csv.split('\n')

    expect(lines[0]).toBe('direction,type,namespace,owner,name,hops,latest_run_state,updated_at')
    expect(lines).toHaveLength(5)
    // Owner is empty until the page resolves it from the namespace list.
    expect(lines[1]).toBe('upstream,JOB,etl,,loader,1,COMPLETED,')
  })

  it('quotes values containing commas, which bank object names do', () => {
    const awkward = dataset('d:x', 'ns', 'orders, archived')
    const focus = dataset('d:focus', 'ns', 'focus')
    link(focus, awkward)

    const csv = buildImpactCsv(buildImpactRows({ graph: [focus, awkward] }, 'd:focus'))

    expect(csv).toContain('"orders, archived"')
  })
})
