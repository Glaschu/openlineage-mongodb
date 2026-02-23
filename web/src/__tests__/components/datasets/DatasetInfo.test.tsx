// Copyright 2018-2024 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { Dataset } from '../../../types/api'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import DatasetInfo from '../../../components/datasets/DatasetInfo'

const mockDataset: Dataset = {
  id: { namespace: 'test', name: 'test_dataset' },
  type: 'DB_TABLE',
  name: 'test_dataset',
  physicalName: 'test_physical',
  createdAt: '2021-05-13T13:45:13Z',
  updatedAt: '2021-05-13T13:45:13Z',
  namespace: 'test',
  sourceName: 'test_source',
  fields: [],
  tags: [],
  lastModifiedAt: '2021-05-13T13:45:13Z',
  description: 'Test dataset',
  facets: {},
  deleted: false,
  columnLineage: [],
}

const mockFields = [
  {
    name: 'id',
    type: 'INTEGER',
    description: 'Primary key',
    tags: [],
  },
  {
    name: 'name',
    type: 'VARCHAR',
    description: 'User name',
    tags: [],
  },
]

describe('DatasetInfo Component', () => {
  it('should render without crashing', () => {
    const { container } = render(
      <MemoryRouter>
        <DatasetInfo dataset={mockDataset} datasetFields={[]} />
      </MemoryRouter>
    )
    expect(container).toBeInTheDocument()
  })

  it('should display empty state when no fields', () => {
    render(
      <MemoryRouter>
        <DatasetInfo dataset={mockDataset} datasetFields={[]} />
      </MemoryRouter>
    )
    expect(screen.getByText('dataset_info.empty_title')).toBeInTheDocument()
  })

  it('should render fields when provided', () => {
    render(
      <MemoryRouter>
        <DatasetInfo dataset={mockDataset} datasetFields={mockFields} />
      </MemoryRouter>
    )
    expect(screen.getByText('id')).toBeInTheDocument()
    expect(screen.getByText('name')).toBeInTheDocument()
  })
})
