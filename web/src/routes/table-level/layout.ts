import { Edge, Node as ElkNode } from '../../components/graph'
import { LineageGraph } from '../../types/api'

import { JobOrDataset, LineageDataset, LineageJob, LineageNode } from '../../types/lineage'
import { Nullable } from '../../types/util/Nullable'
import { TableLevelNodeData } from './nodes'
import { theme } from '../../helpers/theme'

interface TraversalResult {
  nodes: LineageNode[]
  edges: string[]
}

const getInitialQueue = (
  lineageGraph: LineageGraph,
  currentGraphNode: Nullable<string>,
  aggregateByParent: boolean
): LineageNode[] => {
  if (!currentGraphNode) return []
  const currentNode = lineageGraph.graph.find((node) => node.id === currentGraphNode)
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
export const findDownstreamNodes = (
  lineageGraph: LineageGraph,
  currentGraphNode: Nullable<string>,
  aggregateByParent: boolean
): TraversalResult => {
  const queue = getInitialQueue(lineageGraph, currentGraphNode, aggregateByParent)
  const connectedNodes: LineageNode[] = []
  const visitedNodes: string[] = []
  const traversedEdges: string[] = []

  while (queue.length) {
    const currentNode = queue.shift()
    if (!currentNode) continue
    if (visitedNodes.includes(currentNode.id)) continue
    visitedNodes.push(currentNode.id)
    connectedNodes.push(currentNode)
    for (const edge of currentNode.outEdges) {
      traversedEdges.push(`${edge.origin}:${edge.destination}`)
      const nextNode = lineageGraph.graph.find((n) => n.id === edge.destination)
      if (nextNode) {
        queue.push(nextNode)
      }
    }
  }
  return { nodes: connectedNodes, edges: traversedEdges }
}

/**
 * Recursively trace the `inEdges` and `outEdges` of the current node to find all connected upstream column nodes
 * @param lineageGraph
 * @param currentGraphNode
 * @param aggregateByParent
 */
export const findUpstreamNodes = (
  lineageGraph: LineageGraph,
  currentGraphNode: Nullable<string>,
  aggregateByParent: boolean
): TraversalResult => {
  const queue = getInitialQueue(lineageGraph, currentGraphNode, aggregateByParent)
  const connectedNodes: LineageNode[] = []
  const visitedNodes: string[] = []
  const traversedEdges: string[] = []

  while (queue.length) {
    const currentNode = queue.shift()
    if (!currentNode) continue
    if (visitedNodes.includes(currentNode.id)) continue
    visitedNodes.push(currentNode.id)
    connectedNodes.push(currentNode)
    for (const edge of currentNode.inEdges) {
      traversedEdges.push(`${edge.origin}:${edge.destination}`)
      const nextNode = lineageGraph.graph.find((n) => n.id === edge.origin)
      if (nextNode) {
        queue.push(nextNode)
      }
    }
  }
  return { nodes: connectedNodes, edges: traversedEdges }
}

export const createElkNodes = (
  lineageGraph: LineageGraph,
  currentGraphNode: Nullable<string>,
  isCompact: boolean,
  isFull: boolean,
  collapsedNodes: Nullable<string>,
  aggregateByParent: boolean
) => {
  const downstream = findDownstreamNodes(lineageGraph, currentGraphNode, aggregateByParent)
  const upstream = findUpstreamNodes(lineageGraph, currentGraphNode, aggregateByParent)

  const downstreamNodeIds = new Set(downstream.nodes.map((n) => n.id))
  const upstreamNodeIds = new Set(upstream.nodes.map((n) => n.id))
  const downstreamEdgeIds = new Set(downstream.edges)
  const upstreamEdgeIds = new Set(upstream.edges)

  const initialNodes = getInitialQueue(lineageGraph, currentGraphNode, aggregateByParent)
  const initialNodeIds = new Set(initialNodes.map((n) => n.id))

  const nodes: ElkNode<JobOrDataset | 'GROUP', TableLevelNodeData>[] = []
  const edges: Edge[] = []

  const collapsedNodesAsArray = collapsedNodes?.split(',')

  const filteredGraph = lineageGraph.graph.filter((node) => {
    if (isFull) return true
    return (
      downstreamNodeIds.has(node.id) || upstreamNodeIds.has(node.id) || initialNodeIds.has(node.id)
    )
  })

  const groupNodesMap = new Map<string, ElkNode<JobOrDataset | 'GROUP', TableLevelNodeData>>()

  for (const node of filteredGraph) {
    edges.push(
      ...node.outEdges
        .filter((edge) => filteredGraph.find((n) => n.id === edge.destination))
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
        const groupId = `group:${job.parentJobName}`
        if (!groupNodesMap.has(groupId)) {
          const groupNode: ElkNode<JobOrDataset | 'GROUP', TableLevelNodeData> = {
            id: groupId,
            kind: 'GROUP',
            children: [],
            data: {
              name: job.parentJobName,
              namespace: 'grouped', // Virtual namespace for the visual container
            } as any,
          }
          groupNodesMap.set(groupId, groupNode)
          nodes.push(groupNode)
        }
        groupNodesMap.get(groupId)!.children!.push(jobElkNode)
      } else {
        nodes.push(jobElkNode)
      }
    } else if (node.type === 'DATASET') {
      const data = node.data as LineageDataset
      nodes.push({
        id: node.id,
        kind: node.type as JobOrDataset,
        width: 112,
        height:
          isCompact || collapsedNodesAsArray?.includes(node.id) ? 24 : 34 + data.fields.length * 10,
        data: {
          dataset: data,
        },
      })
    }
  }
  return { nodes, edges }
}
