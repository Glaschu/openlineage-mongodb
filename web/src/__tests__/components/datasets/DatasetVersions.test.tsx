// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { Dataset } from '../../../types/api'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../helpers/testUtils'
import DatasetVersions from '../../../components/datasets/DatasetVersions'
import React from 'react'

// Hoist the mock function so it can be referenced in vi.mock factory
const { useDatasetVersionsMock } = vi.hoisted(() => {
  return { useDatasetVersionsMock: vi.fn() }
})

// Mock the hook module using the hoisted mock
vi.mock('../../../queries/datasets', () => ({
  useDatasetVersions: useDatasetVersionsMock,
  useAddDatasetTag: vi.fn(),
  useDeleteDatasetTag: vi.fn(),
  useAddDatasetFieldTag: vi.fn(),
  useDeleteDatasetFieldTag: vi.fn(),
}))

// Mock DatasetTags to prevent import issues
vi.mock('../../../components/datasets/DatasetTags', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-dataset-tags">Tags</div>
}))

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

// Mock MqText with dynamic React import to avoid hoisting ReferenceError
vi.mock('../../../components/core/text/MqText', async () => {
  const React = await import('react')
  return {
    __esModule: true,
    default: React.forwardRef(({ children }: { children: React.ReactNode }, ref) => (
      <span ref={ref as any}>{children}</span>
    )),
  }
})

describe('DatasetVersions Component', () => {
  const mockDataset: Dataset = {
    id: { namespace: 'test-namespace', name: 'test-dataset' },
    name: 'test-dataset',
    namespace: 'test-namespace',
    type: 'DB_TABLE',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    tags: [],
    fields: [],
  } as any

  const renderDatasetVersions = (versions: any[] = [], isLoading = false, totalCount = 0) => {
    useDatasetVersionsMock.mockReturnValue({
      data: { versions, totalCount },
      isLoading,
      isPending: isLoading,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })

    return renderWithProviders(
      <DatasetVersions dataset={mockDataset} />
    )
  }

  it('should render nothing with empty versions', () => {
    const { container } = renderDatasetVersions([])
    expect(container.firstChild).toBeNull()
  })

  it('should render with versions data', () => {
    const mockVersions = [
      {
        version: 'v1',
        createdAt: '2023-01-01T00:00:00Z',
        fields: [],
        facets: {},
        createdByRun: { id: 'run-1' }
      },
    ]
    const { getByText } = renderDatasetVersions(mockVersions, false, 1)

    // Check for version ID substring or other text
    expect(getByText('v1...')).toBeTruthy()
  })

  it('should show loading spinner', () => {
    const { getByRole } = renderDatasetVersions([], true)
    expect(getByRole('progressbar')).toBeTruthy()
  })
})
