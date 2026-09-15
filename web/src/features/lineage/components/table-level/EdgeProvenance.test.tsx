// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

import { EdgeProvenance, parseNodeId } from './EdgeProvenance'
import type { HoveredEdge } from '@/features/lineage/components/graph'
import type { LineageNode } from '@/shared/types/lineage'

const edge: HoveredEdge = {
  id: 'edge-1',
  sourceNodeId: 'job:spark-jobs:transform_task_9_4',
  targetNodeId: 'dataset:aws-glue-catalog:processed_9_4_table_1',
  clientX: 40,
  clientY: 60,
}

const jobNode = {
  id: 'job:spark-jobs:transform_task_9_4',
  type: 'JOB',
  data: {
    name: 'transform_task_9_4',
    namespace: 'spark-jobs',
    updatedAt: '2026-09-14T23:06:00.000Z',
    latestRun: { state: 'COMPLETED' },
  },
} as unknown as LineageNode

describe('parseNodeId', () => {
  it('splits type, namespace and name', () => {
    expect(parseNodeId('dataset:analytics:orders')).toEqual({
      type: 'dataset',
      namespace: 'analytics',
      name: 'orders',
    })
  })

  it('keeps colons that belong to the name', () => {
    expect(parseNodeId('dataset:s3://bucket:path:to:table')).toEqual({
      type: 'dataset',
      namespace: 's3',
      name: '//bucket:path:to:table',
    })
  })
})

describe('table-level EdgeProvenance', () => {
  it('names both ends in full, which the truncated node labels do not', () => {
    render(<EdgeProvenance edge={edge} nodesById={new Map([[jobNode.id, jobNode]])} />)

    expect(screen.getByText('transform_task_9_4')).toBeInTheDocument()
    expect(screen.getByText('processed_9_4_table_1')).toBeInTheDocument()
    expect(screen.getByText('JOB · spark-jobs')).toBeInTheDocument()
    expect(screen.getByText('DATASET · aws-glue-catalog')).toBeInTheDocument()
  })

  it("shows the job's latest run, since the job is what the edge represents", () => {
    render(<EdgeProvenance edge={edge} nodesById={new Map([[jobNode.id, jobNode]])} />)

    expect(screen.getByText('COMPLETED')).toBeInTheDocument()
  })

  it('still names an endpoint that is missing from the loaded graph', () => {
    render(<EdgeProvenance edge={edge} nodesById={new Map()} />)

    expect(screen.getByText('transform_task_9_4')).toBeInTheDocument()
    expect(screen.queryByText('COMPLETED')).not.toBeInTheDocument()
  })

  it('shows N/A for a job that has never run', () => {
    const neverRan = {
      ...jobNode,
      data: { ...(jobNode.data as object), latestRun: null },
    } as unknown as LineageNode

    render(<EdgeProvenance edge={edge} nodesById={new Map([[neverRan.id, neverRan]])} />)

    expect(screen.getByText('N/A')).toBeInTheDocument()
  })
})
