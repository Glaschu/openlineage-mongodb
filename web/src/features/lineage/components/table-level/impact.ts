// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { LineageDataset, LineageJob, LineageNode } from '@/shared/types/lineage'
import { LineageGraph } from '@/shared/types/api'
import { Nullable } from '@/shared/types/util/Nullable'

export type ImpactDirection = 'upstream' | 'downstream'

export interface ImpactRow {
  id: string
  direction: ImpactDirection
  type: 'DATASET' | 'JOB'
  namespace: string
  name: string
  /** Edges traversed from the focused node. */
  hops: number
  updatedAt: string
  /** Latest run state, for jobs. */
  state: string
}

const rowFor = (node: LineageNode, direction: ImpactDirection, hops: number): ImpactRow => {
  const isJob = node.type === 'JOB'
  const data = node.data as LineageDataset & LineageJob

  return {
    id: node.id,
    direction,
    type: isJob ? 'JOB' : 'DATASET',
    namespace: data.namespace ?? '',
    name: data.name ?? '',
    hops,
    updatedAt: data.updatedAt ?? '',
    state: isJob ? data.latestRun?.state ?? '' : '',
  }
}

/**
 * Everything reachable from the focused node, with the number of hops it took
 * to get there.
 *
 * This is the list a migration or change ticket needs: a graph cannot answer
 * "what breaks if this goes away" when the answer runs to hundreds of rows.
 * Breadth-first, so the recorded hop count is the shortest path — the honest
 * answer to "how far away is this".
 */
export const buildImpactRows = (
  lineageGraph: Nullable<LineageGraph> | undefined,
  focusNodeId: Nullable<string> | undefined
): ImpactRow[] => {
  if (!lineageGraph || !focusNodeId) return []

  const byId = new Map(lineageGraph.graph.map((node) => [node.id, node]))
  if (!byId.has(focusNodeId)) return []

  const rows: ImpactRow[] = []

  for (const direction of ['upstream', 'downstream'] as const) {
    const seen = new Set<string>([focusNodeId])
    let frontier = [focusNodeId]
    let hops = 0

    while (frontier.length) {
      hops += 1
      const next: string[] = []

      for (const nodeId of frontier) {
        const node = byId.get(nodeId)
        if (!node) continue

        const edges = direction === 'downstream' ? node.outEdges : node.inEdges
        for (const edge of edges) {
          const neighbourId = direction === 'downstream' ? edge.destination : edge.origin
          if (seen.has(neighbourId)) continue

          const neighbour = byId.get(neighbourId)
          if (!neighbour) continue

          seen.add(neighbourId)
          next.push(neighbourId)
          rows.push(rowFor(neighbour, direction, hops))
        }
      }
      frontier = next
    }
  }

  return rows
}

const csvEscape = (value: string) =>
  /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value

export const IMPACT_CSV_HEADER = [
  'direction',
  'type',
  'namespace',
  'name',
  'hops',
  'latest_run_state',
  'updated_at',
].join(',')

/** Flattens the impact list into the CSV that gets attached to a ticket. */
export const buildImpactCsv = (rows: ImpactRow[]): string =>
  [
    IMPACT_CSV_HEADER,
    ...rows.map((row) =>
      [row.direction, row.type, row.namespace, row.name, String(row.hops), row.state, row.updatedAt]
        .map(csvEscape)
        .join(',')
    ),
  ].join('\n')
