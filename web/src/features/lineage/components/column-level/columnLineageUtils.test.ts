// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { ColumnLineageNode, Dataset } from '@/shared/types/api'
import { buildColumnLineageCsv, getDirectedNodeIds } from './columnLineageUtils'
import { describe, expect, it } from 'vitest'

// a -> b -> c, with d -> b (so b has two ancestors, one descendant)
const id = (field: string) => `datasetField:ns:ds:${field}`
const node = (field: string, inEdges: string[], outEdges: string[]): ColumnLineageNode =>
  ({
    id: id(field),
    type: 'column',
    data: { namespace: 'ns', dataset: 'ds', field, column: field },
    inEdges: inEdges.map((origin) => ({ origin: id(origin), destination: id(field) })),
    outEdges: outEdges.map((destination) => ({
      origin: id(field),
      destination: id(destination),
    })),
  } as unknown as ColumnLineageNode)

const graph: ColumnLineageNode[] = [
  node('a', [], ['b']),
  node('b', ['a', 'd'], ['c']),
  node('c', ['b'], []),
  node('d', [], ['b']),
]

describe('getDirectedNodeIds', () => {
  it('walks upstream only', () => {
    const ids = getDirectedNodeIds(graph, id('b'), 'upstream')
    expect(ids).toEqual(new Set([id('b'), id('a'), id('d')]))
  })

  it('walks downstream only', () => {
    const ids = getDirectedNodeIds(graph, id('b'), 'downstream')
    expect(ids).toEqual(new Set([id('b'), id('c')]))
  })

  it('walks both directions as ancestry plus impact, not undirected reachability', () => {
    const ids = getDirectedNodeIds(graph, id('a'), 'both')
    // d is connected to the graph but is neither ancestor nor descendant of a
    expect(ids).toEqual(new Set([id('a'), id('b'), id('c')]))
  })

  it('returns empty set for unknown or missing start', () => {
    expect(getDirectedNodeIds(graph, null, 'both').size).toBe(0)
    expect(getDirectedNodeIds(graph, 'datasetField:x:y:z', 'both').size).toBe(0)
  })
})

describe('buildColumnLineageCsv', () => {
  it('emits a deduplicated edge list with a header', () => {
    const csv = buildColumnLineageCsv(graph)
    const lines = csv.split('\n')
    expect(lines[0]).toBe(
      'source_namespace,source_dataset,source_column,target_namespace,target_dataset,target_column,transformation_type,transformation_description'
    )
    // edges: a->b, d->b, b->c
    expect(lines).toHaveLength(4)
    expect(lines).toContain('ns,ds,a,ns,ds,b,,')
  })

  it('joins transformation metadata from the center dataset facet', () => {
    const centerDataset = {
      namespace: 'ns',
      name: 'ds',
      columnLineage: [
        {
          name: 'b',
          inputFields: [{ namespace: 'ns', name: 'ds', field: 'a' }],
          transformationType: 'IDENTITY',
          transformationDescription: 'copied, verbatim',
        },
      ],
    } as unknown as Dataset

    const csv = buildColumnLineageCsv(graph, centerDataset)
    expect(csv).toContain('ns,ds,a,ns,ds,b,IDENTITY,"copied, verbatim"')
    // edge without facet info still present, unannotated
    expect(csv).toContain('ns,ds,d,ns,ds,b,,')
  })
})
