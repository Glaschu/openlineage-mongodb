// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'

import { createElkNodes, findDownstreamNodes, findUpstreamNodes } from '../../../routes/table-level/layout'
import type { LineageGraph } from '../../../types/api'
import type { LineageDataset, LineageJob, LineageNode } from '../../../types/lineage'
import { theme } from '../../../helpers/theme'

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
    expect(upstream.nodes.map((node) => node.id)).toEqual([
      datasetCurrent.id,
      jobUpstream.id,
    ])
  })

  it('createElkNodes filters nodes, highlights context, and sizes datasets', () => {
    const { graph, datasetCurrent, jobDownstream, jobUpstream, datasetChild } = buildGraph()

    const { nodes, edges } = createElkNodes(graph, datasetCurrent.id, false, false, null, false)

    const nodeIds = nodes.map((node) => node.id)
    expect(nodeIds).toEqual([
      datasetCurrent.id,
      jobUpstream.id,
      jobDownstream.id,
      datasetChild.id,
    ])

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

    const outboundEdge = edges.find(
      (edge) => edge.id === `${jobIsolated.id}:${datasetIsolated.id}`
    )
    expect(outboundEdge?.color).toBe(theme.palette.info.main)
  })
})
