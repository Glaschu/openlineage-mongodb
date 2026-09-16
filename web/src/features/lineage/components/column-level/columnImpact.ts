// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { ColumnLineageNode } from '@/shared/types/api'
import { ColumnTransformation, transformationKey } from './columnLineageUtils'
import { Nullable } from '@/shared/types/util/Nullable'
import { parseColumnLineageNode } from './layout'

export type ColumnImpactDirection = 'upstream' | 'downstream'

export interface ColumnImpactRow {
  id: string
  direction: ColumnImpactDirection
  namespace: string
  dataset: string
  column: string
  /** Edges traversed from the selected column. */
  hops: number
  /** How the value moved across the edge that reached this column, when known. */
  transformation: string
  /** The column on the other end of that edge. */
  via: string
}

/**
 * Every column reachable from the selected one, with the distance and the
 * transformation on the edge that reached it.
 *
 * This is the answer to "what consumes this field" and "where did this field
 * come from" in the form an auditor or a migration ticket can use: flat, with
 * a hop count, rather than a picture to be traced by eye.
 *
 * Transformations are only known for edges the focused dataset's columnLineage
 * facet describes, so most rows carry none — see buildTransformationIndex.
 */
export const buildColumnImpactRows = (
  graph: ColumnLineageNode[] | undefined,
  selectedColumn: Nullable<string> | undefined,
  transformations: Map<string, ColumnTransformation> = new Map()
): ColumnImpactRow[] => {
  if (!graph?.length || !selectedColumn) return []

  const byId = new Map(graph.filter((node) => !!node.data).map((node) => [node.id, node]))
  if (!byId.has(selectedColumn)) return []

  const transformationFor = (origin: string, destination: string) => {
    const source = parseColumnLineageNode(origin)
    const target = parseColumnLineageNode(destination)
    return transformations.get(transformationKey(source, target))?.type ?? ''
  }

  const rows: ColumnImpactRow[] = []

  for (const direction of ['upstream', 'downstream'] as const) {
    const seen = new Set<string>([selectedColumn])
    let frontier = [selectedColumn]
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
          if (seen.has(neighbourId) || !byId.has(neighbourId)) continue

          seen.add(neighbourId)
          next.push(neighbourId)

          const parsed = parseColumnLineageNode(neighbourId)
          rows.push({
            id: neighbourId,
            direction,
            namespace: parsed.namespace,
            dataset: parsed.dataset,
            column: parsed.column,
            hops,
            transformation: transformationFor(edge.origin, edge.destination),
            via: parseColumnLineageNode(nodeId).column,
          })
        }
      }
      frontier = next
    }
  }

  return rows
}

const csvEscape = (value: string) =>
  /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value

export const COLUMN_IMPACT_CSV_HEADER = [
  'direction',
  'namespace',
  'dataset',
  'column',
  'hops',
  'via_column',
  'transformation_type',
].join(',')

export const buildColumnImpactCsv = (rows: ColumnImpactRow[]): string =>
  [
    COLUMN_IMPACT_CSV_HEADER,
    ...rows.map((row) =>
      [
        row.direction,
        row.namespace,
        row.dataset,
        row.column,
        String(row.hops),
        row.via,
        row.transformation,
      ]
        .map(csvEscape)
        .join(',')
    ),
  ].join('\n')
