// Copyright 2018-2024 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { ColumnLineageNode, Dataset } from '@/shared/types/api'
import { Nullable } from '@/shared/types/util/Nullable'
import { downloadBlob } from '@/shared/utils/download'
import { parseColumnLineageNode } from './layout'

// Composite map keys join their parts with NUL, which cannot occur in a
// namespace, dataset or column name. Written as an escape: a raw NUL byte in
// the source makes the file read as binary, so grep and other tools skip it.
const KEY_SEPARATOR = '\u0000'

export type LineageDirection = 'both' | 'upstream' | 'downstream'

export const isLineageDirection = (value: Nullable<string>): value is LineageDirection =>
  value === 'both' || value === 'upstream' || value === 'downstream'

/**
 * Walks the column lineage graph from a starting column node and returns the ids of
 * every node reachable in the given direction. Upstream follows `inEdges` to their
 * origins (the columns this one is derived from); downstream follows `outEdges` to
 * their destinations (the columns derived from this one). `both` is the union, so it
 * traces full ancestry and impact through the selected column without pulling in
 * unrelated siblings.
 */
export const getDirectedNodeIds = (
  graph: ColumnLineageNode[],
  startId: Nullable<string>,
  direction: LineageDirection
): Set<string> => {
  const result = new Set<string>()
  if (!startId) return result

  const byId = new Map(graph.map((node) => [node.id, node]))
  if (!byId.has(startId)) return result

  const walk = (follow: (node: ColumnLineageNode) => string[]) => {
    const queue = [startId]
    const visited = new Set<string>()
    while (queue.length) {
      const id = queue.shift()
      if (!id || visited.has(id)) continue
      visited.add(id)
      result.add(id)
      const node = byId.get(id)
      if (!node) continue
      queue.push(...follow(node))
    }
  }

  if (direction === 'upstream' || direction === 'both') {
    walk((node) => (node.inEdges ?? []).map((edge) => edge.origin))
  }
  if (direction === 'downstream' || direction === 'both') {
    walk((node) => (node.outEdges ?? []).map((edge) => edge.destination))
  }
  return result
}

const csvEscape = (value: Nullable<string>) => {
  const text = value ?? ''
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export interface ColumnTransformation {
  type: string
  description: string
}

/**
 * Indexes the transformation metadata carried by a dataset's columnLineage facet,
 * keyed by the (source column -> target column) pair it describes.
 *
 * The column lineage graph endpoint returns edges as origin/destination only, so
 * this is the only provenance the UI can show: the API drops transformationType
 * and transformationDescription at the point it builds each edge, and the facet
 * is fetched for the center dataset alone. Edges into other datasets therefore
 * resolve to undefined rather than to "no transformation".
 */
export const buildTransformationIndex = (
  centerDataset?: Nullable<Dataset>
): Map<string, ColumnTransformation> => {
  const index = new Map<string, ColumnTransformation>()
  if (!centerDataset?.columnLineage) return index

  for (const entry of centerDataset.columnLineage) {
    for (const input of entry.inputFields ?? []) {
      const key = [
        input.namespace,
        input.name,
        input.field,
        centerDataset.namespace,
        centerDataset.name,
        entry.name,
      ].join(KEY_SEPARATOR)
      index.set(key, {
        type: input.transformationType ?? entry.transformationType ?? '',
        description: input.transformationDescription ?? entry.transformationDescription ?? '',
      })
    }
  }
  return index
}

export const transformationKey = (
  source: { namespace: string; dataset: string; column: string },
  target: { namespace: string; dataset: string; column: string }
) =>
  [
    source.namespace,
    source.dataset,
    source.column,
    target.namespace,
    target.dataset,
    target.column,
  ].join(KEY_SEPARATOR)

/**
 * Flattens the column lineage graph into a CSV edge list. Transformation metadata is
 * joined from the center dataset's columnLineage facet where available — the graph
 * edges themselves only carry topology.
 */
export const buildColumnLineageCsv = (
  graph: ColumnLineageNode[],
  centerDataset?: Nullable<Dataset>
): string => {
  const header = [
    'source_namespace',
    'source_dataset',
    'source_column',
    'target_namespace',
    'target_dataset',
    'target_column',
    'transformation_type',
    'transformation_description',
  ].join(',')

  const transformationByTarget = buildTransformationIndex(centerDataset)

  const seen = new Set<string>()
  const rows: string[] = []
  for (const node of graph) {
    for (const edge of node.inEdges ?? []) {
      const edgeKey = `${edge.origin}->${edge.destination}`
      if (seen.has(edgeKey)) continue
      seen.add(edgeKey)

      const source = parseColumnLineageNode(edge.origin)
      const target = parseColumnLineageNode(edge.destination)
      const transformation = transformationByTarget.get(transformationKey(source, target))

      rows.push(
        [
          source.namespace,
          source.dataset,
          source.column,
          target.namespace,
          target.dataset,
          target.column,
          transformation?.type ?? '',
          transformation?.description ?? '',
        ]
          .map(csvEscape)
          .join(',')
      )
    }
  }
  return [header, ...rows].join('\n')
}

export const downloadColumnLineageCsv = (
  graph: ColumnLineageNode[],
  namespace: string,
  dataset: string,
  centerDataset?: Nullable<Dataset>
) => {
  const csv = buildColumnLineageCsv(graph, centerDataset)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  downloadBlob(blob, `column-lineage-${namespace}-${dataset}.csv`)
}
