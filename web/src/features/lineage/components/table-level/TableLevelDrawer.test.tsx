// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import React from 'react'

vi.mock('@/features/datasets/components/DatasetDetailPage', () => ({
  default: ({ lineageDataset }: { lineageDataset: { name: string } }) => (
    <div data-testid='dataset-detail'>{lineageDataset.name}</div>
  ),
}))
vi.mock('@/features/jobs/components/JobDetailPage', () => ({
  default: ({ lineageJob }: { lineageJob: { name: string } }) => (
    <div data-testid='job-detail'>{lineageJob.name}</div>
  ),
}))

import TableLevelDrawer from './TableLevelDrawer'

const renderAt = (url: string, graph: { graph: { id: string; type: string; data: { name: string } }[] }) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path='/' element={<TableLevelDrawer lineageGraph={graph as never} />} />
      </Routes>
    </MemoryRouter>
  )

describe('TableLevelDrawer', () => {
  it('renders DatasetDetailPage for a DATASET node', () => {
    renderAt('/?tableLevelNode=d1', {
      graph: [{ id: 'd1', type: 'DATASET', data: { name: 'mydataset' } }],
    })
    expect(screen.getByTestId('dataset-detail')).toHaveTextContent('mydataset')
  })

  it('renders JobDetailPage for a JOB node', () => {
    renderAt('/?tableLevelNode=j1', {
      graph: [{ id: 'j1', type: 'JOB', data: { name: 'myjob' } }],
    })
    expect(screen.getByTestId('job-detail')).toHaveTextContent('myjob')
  })

  it('renders nothing inside the box when no node matches', () => {
    renderAt('/?tableLevelNode=zzz', {
      graph: [{ id: 'd1', type: 'DATASET', data: { name: 'mydataset' } }],
    })
    expect(screen.queryByTestId('dataset-detail')).not.toBeInTheDocument()
    expect(screen.queryByTestId('job-detail')).not.toBeInTheDocument()
  })
})
