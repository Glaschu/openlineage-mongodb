// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'

import {
  createElkNodes,
  findDownstreamNodes,
  findUpstreamNodes,
} from '@/features/lineage/components/table-level/layout'
import { theme } from '@/shared/theme/theme'
import type { LineageDataset, LineageJob, LineageNode } from '@/shared/types/lineage'
import type { LineageGraph } from '@/shared/types/api'

const makeDatasetNode = (
  id: string,
  fieldsCount: number,
  overrides: Partial<LineageDataset> = {}
): LineageNode => {
  const dataset: LineageDataset = {
    id: { namespace: 'ns', name: id },
    type: 'DB_TABLE',
    name: id,
    physicalName: id,
    createdAt: '',
    updatedAt: '',
    namespace: 'ns',
    sourceName: 'src',
    fields: Array.from({ length: fieldsCount }).map((_, index) => ({
      name: `field-${index}`,
      type: 'string',
      tags: [],
      description: '',
    })),
    facets: {},
    tags: [],
    lastModifiedAt: '',
    description: '',
    ...overrides,
  }

  return {
    id,
    type: 'DATASET',
    data: dataset,
    inEdges: [],
    outEdges: [],
  }
}

const makeJobNode = (id: string, overrides: Partial<LineageJob> = {}): LineageNode => {
  const job: LineageJob = {
    id: { namespace: 'ns', name: id },
    type: 'BATCH',
    name: id,
    createdAt: '',
    updatedAt: '',
    namespace: 'ns',
    inputs: [],
    outputs: [],
    location: '',
    description: '',
    simpleName: id,
    latestRun: null,
    parentJobName: null,
    parentJobUuid: null,
    ...overrides,
  }

  return {
    id,
    type: 'JOB',
    data: job,
    inEdges: [],
    outEdges: [],
  }
}

describe('table-level layout helpers', () => {
  const buildGraph = () => {
    const datasetCurrent = makeDatasetNode('dataset-current', 2)
    const jobUpstream = makeJobNode('job-upstream')
    const jobDownstream = makeJobNode('job-downstream')
    const datasetChild = makeDatasetNode('dataset-child', 1)
    const datasetUnrelated = makeDatasetNode('dataset-unrelated', 1)
    const jobIsolated = makeJobNode('job-isolated')
    const datasetIsolated = makeDatasetNode('dataset-isolated', 1)

    jobUpstream.outEdges = [{ origin: jobUpstream.id, destination: datasetCurrent.id }]
    datasetCurrent.inEdges = [{ origin: jobUpstream.id, destination: datasetCurrent.id }]
    datasetCurrent.outEdges = [{ origin: datasetCurrent.id, destination: jobDownstream.id }]
    jobDownstream.inEdges = [{ origin: datasetCurrent.id, destination: jobDownstream.id }]
    jobDownstream.outEdges = [{ origin: jobDownstream.id, destination: datasetChild.id }]
    datasetChild.inEdges = [{ origin: jobDownstream.id, destination: datasetChild.id }]

    datasetUnrelated.outEdges = [{ origin: datasetUnrelated.id, destination: jobIsolated.id }]
    jobIsolated.inEdges = [{ origin: datasetUnrelated.id, destination: jobIsolated.id }]
    jobIsolated.outEdges = [{ origin: jobIsolated.id, destination: datasetIsolated.id }]
    datasetIsolated.inEdges = [{ origin: jobIsolated.id, destination: datasetIsolated.id }]

    const graph: LineageGraph = {
      graph: [
        datasetCurrent,
        jobUpstream,
        jobDownstream,
        datasetChild,
        datasetUnrelated,
        jobIsolated,
        datasetIsolated,
      ],
    }

    return {
      graph,
      datasetCurrent,
      jobUpstream,
      jobDownstream,
      datasetChild,
      datasetUnrelated,
      jobIsolated,
      datasetIsolated,
    }
  }

  it('findDownstreamNodes and findUpstreamNodes traverse connected components', () => {
    const { graph, datasetCurrent, jobUpstream, jobDownstream, datasetChild } = buildGraph()

    expect(findDownstreamNodes(graph, null, false)).toEqual({ nodes: [], edges: [] })
    expect(findDownstreamNodes(graph, 'missing-node', false)).toEqual({ nodes: [], edges: [] })

    const downstream = findDownstreamNodes(graph, datasetCurrent.id, false)
    expect(downstream.nodes.map((node) => node.id)).toEqual([
      datasetCurrent.id,
      jobDownstream.id,
      datasetChild.id,
    ])

    const upstream = findUpstreamNodes(graph, datasetCurrent.id, false)
    expect(upstream.nodes.map((node) => node.id)).toEqual([datasetCurrent.id, jobUpstream.id])
  })

  it('createElkNodes filters nodes, highlights context, and sizes datasets', () => {
    const { graph, datasetCurrent, jobDownstream, jobUpstream, datasetChild } = buildGraph()

    const { nodes, edges } = createElkNodes(graph, datasetCurrent.id, false, false, null, false)

    const nodeIds = nodes.map((node) => node.id)
    expect(nodeIds).toEqual([datasetCurrent.id, jobUpstream.id, jobDownstream.id, datasetChild.id])

    const datasetNode = nodes.find((node) => node.id === datasetCurrent.id)
    expect(datasetNode?.height).toBe(34 + 2 * 10)

    const childDatasetNode = nodes.find((node) => node.id === datasetChild.id)
    expect(childDatasetNode?.height).toBe(34 + 1 * 10)

    const edgeColors = edges.reduce((acc, edge) => {
      acc[edge.id] = edge.color
      return acc
    }, {} as Record<string, string | undefined>)

    expect(edgeColors[`${jobUpstream.id}:${datasetCurrent.id}`]).toBe(theme.palette.primary.main)
    expect(edgeColors[`${datasetCurrent.id}:${jobDownstream.id}`]).toBe(theme.palette.info.main)
    expect(edgeColors[`${jobDownstream.id}:${datasetChild.id}`]).toBe(theme.palette.info.main)

    expect(edges).toHaveLength(3)
    expect(edges.map((edge) => edge.id)).toEqual(
      expect.arrayContaining([
        `${jobUpstream.id}:${datasetCurrent.id}`,
        `${datasetCurrent.id}:${jobDownstream.id}`,
        `${jobDownstream.id}:${datasetChild.id}`,
      ])
    )
  })

  it('createElkNodes respects compact and collapsed modes and includes unrelated nodes when full graph requested', () => {
    const { graph, datasetUnrelated, jobIsolated, datasetIsolated } = buildGraph()

    const { nodes, edges } = createElkNodes(
      graph,
      datasetUnrelated.id,
      false,
      true,
      `${datasetIsolated.id}`,
      false
    )

    const isolatedDataset = nodes.find((node) => node.id === datasetIsolated.id)
    expect(isolatedDataset?.height).toBe(24)

    const unrelatedDataset = nodes.find((node) => node.id === datasetUnrelated.id)
    expect(unrelatedDataset?.height).toBe(34 + 1 * 10)

    const outboundEdge = edges.find((edge) => edge.id === `${jobIsolated.id}:${datasetIsolated.id}`)
    expect(outboundEdge?.color).toBe(theme.palette.info.main)
  })
})

describe('table-level layout at scale', () => {
  // A long alternating dataset -> job -> dataset chain, the shape real lineage
  // takes. Traversal that scans the graph per edge (or keeps `visited` in an
  // array) is quadratic here and takes many seconds; indexed traversal is
  // milliseconds.
  const buildChain = (length: number): LineageGraph => {
    const nodes: LineageNode[] = []
    for (let i = 0; i < length; i++) {
      nodes.push(i % 2 === 0 ? makeDatasetNode(`node-${i}`, 3) : makeJobNode(`node-${i}`))
    }
    for (let i = 0; i < length - 1; i++) {
      const edge = { origin: `node-${i}`, destination: `node-${i + 1}` }
      nodes[i].outEdges.push(edge)
      nodes[i + 1].inEdges.push(edge)
    }
    return { graph: nodes }
  }

  it('walks a 4000-node chain quickly and keeps every node', () => {
    const graph = buildChain(4000)

    const started = performance.now()
    const { nodes, edges } = createElkNodes(graph, 'node-0', false, false, null, false)
    const elapsed = performance.now() - started

    expect(nodes).toHaveLength(4000)
    expect(edges).toHaveLength(3999)
    expect(elapsed).toBeLessThan(2000)
  })

  it('finds upstream and downstream from the middle of a long chain', () => {
    const graph = buildChain(2000)

    const downstream = findDownstreamNodes(graph, 'node-1000', false)
    const upstream = findUpstreamNodes(graph, 'node-1000', false)

    // The focused node itself is included in both traversals.
    expect(downstream.nodes).toHaveLength(1000)
    expect(upstream.nodes).toHaveLength(1001)
  })
})

describe('collapsing to namespaces', () => {
  const buildCrossNamespaceGraph = (): LineageGraph => {
    const sourceA = makeDatasetNode('raw-a', 1, { namespace: 'raw' })
    const sourceB = makeDatasetNode('raw-b', 1, { namespace: 'raw' })
    const job = makeJobNode('job-mid', { namespace: 'etl' })
    const target = makeDatasetNode('curated-a', 1, { namespace: 'curated' })

    const link = (from: LineageNode, to: LineageNode) => {
      const edge = { origin: from.id, destination: to.id }
      from.outEdges.push(edge)
      to.inEdges.push(edge)
    }
    link(sourceA, job)
    link(sourceB, job)
    link(job, target)

    return { graph: [sourceA, sourceB, job, target] }
  }

  const collapse = (graph: LineageGraph) =>
    createElkNodes(graph, 'raw-a', true, true, null, false, true)

  it('renders one node per namespace instead of one per table', () => {
    const { nodes } = collapse(buildCrossNamespaceGraph())

    expect(nodes.map((node) => node.id).sort()).toEqual([
      'namespace:curated',
      'namespace:etl',
      'namespace:raw',
    ])
    expect(nodes.every((node) => node.kind === 'NAMESPACE')).toBe(true)
  })

  it('counts what each namespace stands for', () => {
    const { nodes } = collapse(buildCrossNamespaceGraph())

    expect(nodes.find((node) => node.id === 'namespace:raw')?.data).toMatchObject({
      namespace: 'raw',
      datasetCount: 2,
      jobCount: 0,
    })
    expect(nodes.find((node) => node.id === 'namespace:etl')?.data).toMatchObject({
      datasetCount: 0,
      jobCount: 1,
    })
  })

  it('aggregates the edges between two namespaces into one, labelled with the count', () => {
    const { edges } = collapse(buildCrossNamespaceGraph())

    expect(edges).toHaveLength(2)
    // Ids compose the two display ids, which in mixed mode may be real nodes.
    const rawToEtl = edges.find((edge) => edge.id === 'namespace:raw:namespace:etl')
    // raw-a -> job and raw-b -> job become a single connection.
    expect(rawToEtl?.label).toBe('2 connections')
    // A single underlying link carries no count: the number would say nothing.
    expect(
      edges.find((edge) => edge.id === 'namespace:etl:namespace:curated')?.label
    ).toBeUndefined()
  })

  it('drops edges that stay inside one namespace', () => {
    const graph = buildCrossNamespaceGraph()
    const [sourceA, sourceB] = graph.graph
    const internal = { origin: sourceA.id, destination: sourceB.id }
    sourceA.outEdges.push(internal)
    sourceB.inEdges.push(internal)

    const { edges } = collapse(graph)

    // Still only the two cross-namespace connections: at this zoom, what
    // happens inside a namespace is not the question being asked.
    expect(edges).toHaveLength(2)
    expect(edges.some((edge) => edge.sourceNodeId === edge.targetNodeId)).toBe(false)
  })

  it('leaves the graph uncollapsed when the mode is off', () => {
    const { nodes } = createElkNodes(
      buildCrossNamespaceGraph(),
      'raw-a',
      true,
      true,
      null,
      false,
      false
    )

    expect(nodes.some((node) => node.kind === 'NAMESPACE')).toBe(false)
    expect(nodes).toHaveLength(4)
  })
})

describe('expanding one namespace while the rest stay collapsed', () => {
  const buildGraph = (): LineageGraph => {
    const rawA = makeDatasetNode('raw-a', 1, { namespace: 'raw' })
    const rawB = makeDatasetNode('raw-b', 1, { namespace: 'raw' })
    const jobA = makeJobNode('job-a', { namespace: 'etl' })
    const jobB = makeJobNode('job-b', { namespace: 'etl' })

    const link = (from: LineageNode, to: LineageNode) => {
      const edge = { origin: from.id, destination: to.id }
      from.outEdges.push(edge)
      to.inEdges.push(edge)
    }
    link(rawA, jobA)
    link(rawB, jobA)
    link(jobA, jobB)

    return { graph: [rawA, rawB, jobA, jobB] }
  }

  const view = (expanded: string | null) =>
    createElkNodes(buildGraph(), 'raw-a', true, true, null, false, true, expanded)

  it('keeps the expanded namespace at full detail and collapses the others', () => {
    const { nodes } = view('etl')

    expect(nodes.map((node) => node.id).sort()).toEqual(['job-a', 'job-b', 'namespace:raw'])
  })

  it('points edges from collapsed namespaces at their summary node', () => {
    const { edges } = view('etl')

    const intoEtl = edges.find((edge) => edge.targetNodeId === 'job-a')
    expect(intoEtl?.sourceNodeId).toBe('namespace:raw')
    // raw-a and raw-b both feed job-a, so the merged edge carries the count.
    expect(intoEtl?.label).toBe('2 connections')
  })

  it('leaves edges between two expanded nodes exactly as they were', () => {
    const ungrouped = createElkNodes(buildGraph(), 'raw-a', true, true, null, false, false, null)
    const original = ungrouped.edges.find(
      (edge) => edge.sourceNodeId === 'job-a' && edge.targetNodeId === 'job-b'
    )

    const { edges } = view('etl')
    const kept = edges.find(
      (edge) => edge.sourceNodeId === 'job-a' && edge.targetNodeId === 'job-b'
    )

    expect(kept).toEqual(original)
    expect(kept?.label).toBeUndefined()
  })

  it('expands several namespaces at once', () => {
    const { nodes } = view('etl,raw')

    expect(nodes.some((node) => node.kind === 'NAMESPACE')).toBe(false)
    expect(nodes).toHaveLength(4)
  })

  it('ignores blank entries in the expanded list', () => {
    const { nodes } = view(',,etl,')

    expect(nodes.map((node) => node.id).sort()).toEqual(['job-a', 'job-b', 'namespace:raw'])
  })
})
