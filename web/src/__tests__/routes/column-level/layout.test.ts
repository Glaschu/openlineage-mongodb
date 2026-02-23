// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'
import {
  createElkNodes,
  findConnectedNodes,
  parseColumnLineageNode,
} from '../../../routes/column-level/layout'
import type { ColumnLineageGraph, ColumnLineageNode } from '../../../types/api'
import { theme } from '../../../helpers/theme'

describe('column-level/layout helpers', () => {
  it('parses column lineage node identifiers', () => {
    expect(parseColumnLineageNode('datasetField:analytics:users:email')).toEqual({
      type: 'datasetField',
      namespace: 'analytics',
      dataset: 'users',
      column: 'email',
    })
  })

  it('finds connected nodes across inbound and outbound edges', () => {
    const nodes: ColumnLineageNode[] = [
      {
        id: 'nodeA',
        type: 'COLUMN',
        data: { namespace: 'analytics', dataset: 'users', field: 'email' } as any,
        inEdges: [],
        outEdges: [{ origin: 'nodeA', destination: 'nodeB' }],
      },
      {
        id: 'nodeB',
        type: 'COLUMN',
        data: { namespace: 'analytics', dataset: 'users', field: 'name' } as any,
        inEdges: [{ origin: 'nodeA', destination: 'nodeB' }],
        outEdges: [],
      },
      {
        id: 'nodeC',
        type: 'COLUMN',
        data: { namespace: 'finance', dataset: 'orders', field: 'id' } as any,
        inEdges: [],
        outEdges: [],
      },
    ]

    expect(findConnectedNodes(nodes, null)).toEqual([])
    expect(findConnectedNodes(nodes, 'nodeX')).toEqual([])
    expect(findConnectedNodes(nodes, 'nodeA')).toEqual([nodes[0], nodes[1]])
  })

  it('creates ELK nodes and colors edges according to connectivity', () => {
    const buildNode = (id: string, namespace: string, dataset: string, field: string): ColumnLineageNode => ({
      id,
      type: 'COLUMN',
      data: {
        namespace,
        dataset,
        datasetVersion: 'v1',
        field,
        fieldType: 'string',
        transformationDescription: null,
        transformationType: null,
        inputFields: [],
      },
      inEdges: [],
      outEdges: [],
    })

    const nodeA = buildNode('nodeA', 'analytics', 'users', 'email')
    const nodeB = buildNode('nodeB', 'analytics', 'users', 'name')
    const nodeC = buildNode('nodeC', 'finance', 'orders', 'id')
    const nodeD = buildNode('nodeD', 'finance', 'orders', 'amount')

    nodeA.outEdges.push({ origin: 'nodeA', destination: 'nodeB' })
    nodeB.inEdges.push({ origin: 'nodeA', destination: 'nodeB' })

    nodeC.outEdges.push({ origin: 'nodeC', destination: 'nodeD' })
    nodeD.inEdges.push({ origin: 'nodeC', destination: 'nodeD' })

    const graph: ColumnLineageGraph = { graph: [nodeA, nodeB, nodeC, nodeD] }
    const { nodes, edges } = createElkNodes(graph, 'nodeA')

    expect(nodes).toHaveLength(2)
    const usersNode = nodes.find((node) => node.id === 'datasetField:analytics:users')
    expect(usersNode?.children).toHaveLength(2)

    const ordersNode = nodes.find((node) => node.id === 'datasetField:finance:orders')
    expect(ordersNode?.children).toHaveLength(2)

    const edgeAB = edges.find((edge) => edge.id === 'nodeA:nodeB')
    expect(edgeAB?.color).toBe(theme.palette.primary.main)

    const edgeCD = edges.find((edge) => edge.id === 'nodeC:nodeD')
    expect(edgeCD?.color).toBe(theme.palette.grey[400])
  })
})
