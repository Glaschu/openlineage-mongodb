import { Edge, Node as ElkNode } from '@/features/lineage/components/graph'
import { LineageGraph } from '@/shared/types/api'

import { JobOrDataset, LineageDataset, LineageJob, LineageNode } from '@/shared/types/lineage'
import { Nullable } from '@/shared/types/util/Nullable'
import { TableLevelNodeData } from './nodes'
import { theme } from '@/shared/theme/theme'

interface TraversalResult {
  nodes: LineageNode[]
  edges: string[]
}

/**
 * Index nodes by id. Traversal used to scan the whole graph for every edge it
 * followed, which is quadratic once a lineage graph gets past a few hundred
 * nodes.
 */
const indexById = (lineageGraph: LineageGraph): Map<string, LineageNode> => {
  const byId = new Map<string, LineageNode>()
  for (const node of lineageGraph.graph) byId.set(node.id, node)
  return byId
}

const getInitialQueue = (
  lineageGraph: LineageGraph,
  currentGraphNode: Nullable<string>,
  aggregateByParent: boolean,
  byId: Map<string, LineageNode> = indexById(lineageGraph)
): LineageNode[] => {
  if (!currentGraphNode) return []
  const currentNode = byId.get(currentGraphNode)
  if (!currentNode) return []
  const queue: LineageNode[] = [currentNode]

  if (aggregateByParent && currentNode.type === 'JOB') {
    const jobData = currentNode.data as LineageJob
    lineageGraph.graph.forEach((node) => {
      if (node.type === 'JOB' && node.id !== currentNode.id) {
        const childJobData = node.data as LineageJob
        if (childJobData.parentJobName === jobData.name) {
          queue.push(node)
        }
      }
    })
  }
  return queue
}

/**
 * Recursively trace the `inEdges` and `outEdges` of the current node to find all connected downstream column nodes
 * @param lineageGraph
 * @param currentGraphNode
 * @param aggregateByParent
 */
const traverse = (
  lineageGraph: LineageGraph,
  currentGraphNode: Nullable<string>,
  aggregateByParent: boolean,
  direction: 'downstream' | 'upstream',
  byId: Map<string, LineageNode> = indexById(lineageGraph)
): TraversalResult => {
  const queue = getInitialQueue(lineageGraph, currentGraphNode, aggregateByParent, byId)
  const connectedNodes: LineageNode[] = []
  const visitedNodes = new Set<string>()
  const traversedEdges: string[] = []

  while (queue.length) {
    const currentNode = queue.shift()
    if (!currentNode) continue
    if (visitedNodes.has(currentNode.id)) continue
    visitedNodes.add(currentNode.id)
    connectedNodes.push(currentNode)

    const edges = direction === 'downstream' ? currentNode.outEdges : currentNode.inEdges
    for (const edge of edges) {
      traversedEdges.push(`${edge.origin}:${edge.destination}`)
      const nextNode = byId.get(direction === 'downstream' ? edge.destination : edge.origin)
      if (nextNode) {
        queue.push(nextNode)
      }
    }
  }
  return { nodes: connectedNodes, edges: traversedEdges }
}

/**
 * Trace `outEdges` from the current node to every connected downstream node.
 */
export const findDownstreamNodes = (
  lineageGraph: LineageGraph,
  currentGraphNode: Nullable<string>,
  aggregateByParent: boolean
): TraversalResult => traverse(lineageGraph, currentGraphNode, aggregateByParent, 'downstream')

/**
 * Trace `inEdges` from the current node to every connected upstream node.
 */
export const findUpstreamNodes = (
  lineageGraph: LineageGraph,
  currentGraphNode: Nullable<string>,
  aggregateByParent: boolean
): TraversalResult => traverse(lineageGraph, currentGraphNode, aggregateByParent, 'upstream')

interface NamespaceSummary {
  namespace: string
  datasetCount: number
  jobCount: number
}

const NAMESPACE_NODE_WIDTH = 220
const NAMESPACE_NODE_HEIGHT = 56

/**
 * Reduces the graph to one node per namespace. Edges within a namespace
 * disappear — at this zoom the question is which domain feeds which — and
 * edges between two namespaces collapse into one, labelled with how many
 * underlying connections it stands for.
 */
const collapseToNamespaces = (filteredGraph: LineageNode[], renderedNodeIds: Set<string>) => {
  const namespaceOf = new Map<string, string>()
  const summaries = new Map<string, NamespaceSummary>()

  for (const node of filteredGraph) {
    const namespace = (node.data as LineageDataset | LineageJob).namespace
    namespaceOf.set(node.id, namespace)

    const summary = summaries.get(namespace) ?? { namespace, datasetCount: 0, jobCount: 0 }
    if (node.type === 'DATASET') summary.datasetCount += 1
    else summary.jobCount += 1
    summaries.set(namespace, summary)
  }

  const connectionCounts = new Map<string, number>()
  for (const node of filteredGraph) {
    for (const edge of node.outEdges) {
      if (!renderedNodeIds.has(edge.destination)) continue

      const from = namespaceOf.get(edge.origin)
      const to = namespaceOf.get(edge.destination)
      if (!from || !to || from === to) continue

      const key = `${from}\u0000${to}`
      connectionCounts.set(key, (connectionCounts.get(key) ?? 0) + 1)
    }
  }

  const nodes: ElkNode<JobOrDataset | 'GROUP' | 'NAMESPACE', TableLevelNodeData>[] = [
    ...summaries.values(),
  ].map((summary) => ({
    id: `namespace:${summary.namespace}`,
    kind: 'NAMESPACE' as const,
    width: NAMESPACE_NODE_WIDTH,
    height: NAMESPACE_NODE_HEIGHT,
    data: summary,
  }))

  const edges: Edge[] = [...connectionCounts.entries()].map(([key, count]) => {
    const [from, to] = key.split('\u0000')
    return {
      id: `namespace:${from}:${to}`,
      sourceNodeId: `namespace:${from}`,
      targetNodeId: `namespace:${to}`,
      color: theme.palette.primary.main,
      isAnimated: true,
      label: count === 1 ? '1 connection' : `${count} connections`,
    }
  })

  return { nodes, edges }
}

export const createElkNodes = (
  lineageGraph: LineageGraph,
  currentGraphNode: Nullable<string>,
  isCompact: boolean,
  isFull: boolean,
  collapsedNodes: Nullable<string>,
  aggregateByParent: boolean,
  /**
   * Collapse the graph to one node per namespace, with the edges between them
   * aggregated into a single labelled connection. At bank scale the useful
   * first question is which domains feed which, not which table feeds which.
   */
  groupByNamespace = false
) => {
  const byId = indexById(lineageGraph)
  const downstream = traverse(lineageGraph, currentGraphNode, aggregateByParent, 'downstream', byId)
  const upstream = traverse(lineageGraph, currentGraphNode, aggregateByParent, 'upstream', byId)

  const downstreamNodeIds = new Set(downstream.nodes.map((n) => n.id))
  const upstreamNodeIds = new Set(upstream.nodes.map((n) => n.id))
  const downstreamEdgeIds = new Set(downstream.edges)
  const upstreamEdgeIds = new Set(upstream.edges)

  const initialNodes = getInitialQueue(lineageGraph, currentGraphNode, aggregateByParent, byId)
  const initialNodeIds = new Set(initialNodes.map((n) => n.id))

  const nodes: ElkNode<JobOrDataset | 'GROUP', TableLevelNodeData>[] = []
  const edges: Edge[] = []

  const collapsedNodeIds = new Set(collapsedNodes?.split(',') ?? [])

  const filteredGraph = lineageGraph.graph.filter((node) => {
    if (isFull) return true
    return (
      downstreamNodeIds.has(node.id) || upstreamNodeIds.has(node.id) || initialNodeIds.has(node.id)
    )
  })

  const renderedNodeIds = new Set(filteredGraph.map((node) => node.id))

  if (groupByNamespace) {
    return collapseToNamespaces(filteredGraph, renderedNodeIds)
  }

  const groupNodesMap = new Map<string, ElkNode<JobOrDataset | 'GROUP', TableLevelNodeData>>()

  /**
   * Returns the container a node belongs in, creating it on first use. Parent-job
   * grouping keeps its own containers, so the two modes never share one.
   */
  const containerFor = (groupId: string, name: string, namespace: string) => {
    let group = groupNodesMap.get(groupId)
    if (!group) {
      group = {
        id: groupId,
        kind: 'GROUP',
        children: [],
        data: { name, namespace } as TableLevelNodeData,
      }
      groupNodesMap.set(groupId, group)
      nodes.push(group)
    }
    return group
  }

  for (const node of filteredGraph) {
    edges.push(
      ...node.outEdges
        .filter((edge) => renderedNodeIds.has(edge.destination))
        .map((edge) => {
          const edgeId = `${edge.origin}:${edge.destination}`
          const isDownstream = downstreamEdgeIds.has(edgeId)
          const isUpstream = upstreamEdgeIds.has(edgeId)

          let color = theme.palette.grey[400]
          let isAnimated = false

          if (isDownstream && !isUpstream) {
            color = theme.palette.info.main
            isAnimated = true
          } else if (isUpstream && !isDownstream) {
            color = theme.palette.primary.main
            isAnimated = true
          } else if (isUpstream && isDownstream) {
            if (initialNodeIds.has(edge.destination)) {
              color = theme.palette.primary.main
              isAnimated = true
            } else if (initialNodeIds.has(edge.origin)) {
              color = theme.palette.info.main
              isAnimated = true
            } else {
              color = theme.palette.info.main
              isAnimated = true
            }
          }

          return {
            id: edgeId,
            sourceNodeId: edge.origin,
            targetNodeId: edge.destination,
            color,
            isAnimated,
          }
        })
    )

    if (node.type === 'JOB') {
      const job = node.data as LineageJob
      const jobElkNode: ElkNode<JobOrDataset | 'GROUP', TableLevelNodeData> = {
        id: node.id,
        kind: node.type as JobOrDataset,
        width: 112,
        height: 24,
        data: {
          job: job,
        },
      }

      if (aggregateByParent && job.parentJobName) {
        // Parent jobs often reside in separate namespaces (e.g. airflow-ops vs spark-jobs)
        // Group exactly by the parent job name to unite cross-namespace pipelines
        containerFor(
          `group:${job.parentJobName}`,
          job.parentJobName,
          'grouped' // Virtual namespace for the visual container
        ).children?.push(jobElkNode)
      } else {
        nodes.push(jobElkNode)
      }
    } else if (node.type === 'DATASET') {
      const data = node.data as LineageDataset
      nodes.push({
        id: node.id,
        kind: node.type as JobOrDataset,
        width: 112,
        height: isCompact || collapsedNodeIds.has(node.id) ? 24 : 34 + data.fields.length * 10,
        data: {
          dataset: data,
        },
      })
    }
  }
  return { nodes, edges }
}
