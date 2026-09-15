import { ColumnLevelNodeData, ColumnLevelNodeKinds } from './nodes'
import { ColumnLineageGraph, ColumnLineageNode } from '@/shared/types/api'
import { Edge, Node as ElkNode } from '@/features/lineage/components/graph'
import { LineageDirection, getDirectedNodeIds } from './columnLineageUtils'
import { Nullable } from '@/shared/types/util/Nullable'
import { theme } from '@/shared/theme/theme'

/**
   Node of format dataset:food_delivery:public.categories:menu_id
   Node of format {type}:{namespace}:{table}:{column}
 */
export const parseColumnLineageNode = (node: string) => {
  const [type, namespace, dataset, column] = node.split(':')
  return { type, namespace, dataset, column }
}

/**
 * Trace the lineage paths through the current node: its ancestry (upstream) and/or
 * its impact (downstream), depending on the requested direction.
 */
export const findConnectedNodes = (
  columnLineageGraph: ColumnLineageNode[],
  currentColumn: Nullable<string>,
  direction: LineageDirection = 'both'
): ColumnLineageNode[] => {
  if (!currentColumn) return []
  const ids = getDirectedNodeIds(columnLineageGraph, currentColumn, direction)
  return columnLineageGraph.filter((node) => ids.has(node.id))
}

export const createElkNodes = (
  columnLineageGraph: ColumnLineageGraph,
  currentColumn: Nullable<string>,
  direction: LineageDirection = 'both',
  isolate = false
) => {
  const nodes: ElkNode<ColumnLevelNodeKinds, ColumnLevelNodeData>[] = []
  const edges: Edge[] = []

  let graph = columnLineageGraph.graph.filter((node) => !!node.data)

  const connectedIds = getDirectedNodeIds(graph, currentColumn, direction)

  // Isolate mode: only the lineage paths through the selected column stay on the canvas.
  if (isolate && currentColumn && connectedIds.size > 0) {
    graph = graph.filter((node) => connectedIds.has(node.id))
  }

  const hasSelection = !!currentColumn && connectedIds.size > 0

  for (const node of graph) {
    const namespace = node.data.namespace
    const dataset = node.data.dataset
    const column = node.data.field

    edges.push(
      ...node.outEdges
        .filter((edge) => !isolate || !hasSelection || connectedIds.has(edge.destination))
        .map((edge) => {
          const onPath = connectedIds.has(node.id) && connectedIds.has(edge.destination)
          return {
            id: `${edge.origin}:${edge.destination}`,
            sourceNodeId: edge.origin,
            targetNodeId: edge.destination,
            color: onPath ? theme.palette.primary.main : theme.palette.grey[400],
          }
        })
    )

    const childNode = {
      id: node.id,
      height: 24,
      width: 200,
      kind: 'column' as const,
      data: {
        column,
        namespace,
        dataset,
        selected: node.id === currentColumn,
        dimmed: hasSelection && !connectedIds.has(node.id),
      },
    }

    const datasetNode = nodes.find((n) => n.id === `datasetField:${namespace}:${dataset}`)
    if (!datasetNode) {
      nodes.push({
        id: `datasetField:${namespace}:${dataset}`,
        kind: 'dataset',
        width: 800,
        data: {
          namespace,
          dataset,
        },
        children: [childNode],
      })
    } else {
      datasetNode.children?.push(childNode)
    }
  }
  return { nodes, edges }
}
