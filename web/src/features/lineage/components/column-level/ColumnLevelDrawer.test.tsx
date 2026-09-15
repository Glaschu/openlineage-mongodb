// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import * as useDatasetHook from '@/features/datasets/api'
import { type Location, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/utils'
import ColumnLevelDrawer from '@/features/lineage/components/column-level/ColumnLevelDrawer'
import React from 'react'
import type { ColumnLineageGraph, Dataset } from '@/shared/types/api'

// Mocks
const { fetchDatasetMock, jsonViewMock } = vi.hoisted(() => ({
  fetchDatasetMock: vi.fn(),
  jsonViewMock: vi.fn((props: { data: unknown }) => props),
}))

vi.mock('@/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@/shared/components/MqJsonView/MqJsonView', () => ({
  __esModule: true,
  default: (props: { data: unknown }) => {
    jsonViewMock(props)
    return <div data-testid='json-view' />
  },
}))

vi.mock('@/shared/components/MqText/MqText', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}))

// We still mock actionCreators to avoid import errors or side effects,
// but we expect fetchDataset NOT to be dispatched if hook is used.
vi.mock('../../../store/actionCreators', async () => {
  return {
    fetchDataset: vi.fn(),
  }
})

const LocationSpy = ({ onChange }: { onChange: (location: Location) => void }) => {
  const location = useLocation()
  React.useEffect(() => {
    onChange(location)
  }, [location, onChange])
  return null
}

const renderDrawer = (
  state: {
    columnLineage: ColumnLineageGraph | null
    dataset: Dataset | null
    isDatasetLoading: boolean
  },
  initialEntry = '/column-level/analytics/users?dataset=users&namespace=analytics'
) => {
  const theme = createTheme()
  const locationRef: { current: Location | null } = { current: null }
  const mockRefetch = vi.fn()

  vi.spyOn(useDatasetHook, 'useDataset').mockReturnValue({
    data: state.dataset,
    isLoading: state.isDatasetLoading,
    isPending: state.isDatasetLoading,
    isError: false,
    error: null,
    refetch: mockRefetch,
  } as any)

  const ui = renderWithProviders(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route
            path='/column-level/:namespace/:name'
            element={
              <>
                <LocationSpy onChange={(location) => (locationRef.current = location)} />
                <ColumnLevelDrawer />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
    {
      initialState: {
        columnLineage: { columnLineage: state.columnLineage },
      },
    }
  )

  return { locationRef, ...ui }
}

describe('ColumnLevelDrawer', () => {
  beforeEach(() => {
    fetchDatasetMock.mockClear()
    jsonViewMock.mockClear()
    vi.restoreAllMocks()
  })

  it('renders without crashing and shows no facets when no dataset is available', () => {
    // Regression: the drawer used to read a non-existent `columnLineage` redux slice
    // and crashed. It now renders purely from the fetched dataset.
    renderDrawer(
      { columnLineage: null, dataset: null, isDatasetLoading: false },
      '/column-level/analytics/users'
    )

    // With no dataset there are no column-lineage facets to render.
    expect(screen.queryByTestId('json-view')).toBeNull()
  })

  it('renders progress bar when dataset are loading', () => {
    const columnLineage = { graph: [] } as unknown as ColumnLineageGraph
    renderDrawer({ columnLineage, dataset: null, isDatasetLoading: true })

    expect(useDatasetHook.useDataset).toHaveBeenCalled()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('renders schema details and the raw facet accordion when dataset information is loaded', () => {
    const columnLineage = { graph: [] } as unknown as ColumnLineageGraph
    const dataset = {
      name: 'users',
      columnLineage: [
        {
          name: 'email',
          inputFields: [{ namespace: 'analytics', name: 'raw_users', field: 'email_raw' }],
          transformationType: 'IDENTITY',
          transformationDescription: 'copied',
        },
      ],
      fields: [{ name: 'email', type: 'string', description: 'user email', tags: [] }],
    } as unknown as Dataset

    renderDrawer({ columnLineage, dataset, isDatasetLoading: false })

    expect(screen.getByText('dataset_info_columns.name')).toBeInTheDocument()
    expect(screen.getByText('email')).toBeInTheDocument()
    expect(screen.getByText('user email')).toBeInTheDocument()
    expect(jsonViewMock).toHaveBeenCalledWith({ data: dataset.columnLineage })
  })

  it('shows derivation cards with transformation chips for the selected column', () => {
    const columnLineage = { graph: [] } as unknown as ColumnLineageGraph
    const dataset = {
      name: 'users',
      columnLineage: [
        {
          name: 'email',
          inputFields: [{ namespace: 'analytics', name: 'raw_users', field: 'email_raw' }],
          transformationType: 'IDENTITY',
          transformationDescription: 'copied',
        },
      ],
      fields: [{ name: 'email', type: 'string', description: 'user email', tags: [] }],
    } as unknown as Dataset

    renderDrawer(
      { columnLineage, dataset, isDatasetLoading: false },
      '/column-level/analytics/users?dataset=users&namespace=analytics&column=datasetField%3Aanalytics%3Ausers%3Aemail&columnName=email'
    )

    expect(screen.getByText('DERIVED FROM')).toBeInTheDocument()
    expect(screen.getByText('raw_users.email_raw')).toBeInTheDocument()
    expect(screen.getByText('IDENTITY')).toBeInTheDocument()
    expect(screen.getByText('copied')).toBeInTheDocument()
    expect(screen.getByText('FEEDS INTO')).toBeInTheDocument()
  })

  it('selects a column when a schema row is clicked', () => {
    const columnLineage = { graph: [] } as unknown as ColumnLineageGraph
    const dataset = {
      name: 'users',
      columnLineage: [],
      fields: [{ name: 'email', type: 'string', description: 'user email', tags: [] }],
    } as unknown as Dataset

    const { locationRef } = renderDrawer({ columnLineage, dataset, isDatasetLoading: false })

    fireEvent.click(screen.getByText('email'))
    expect(locationRef.current?.search).toContain('columnName=email')
    expect(locationRef.current?.search).toContain('column=datasetField%3Aanalytics%3Ausers%3Aemail')
  })

  it('clears the search params when the close button is clicked', () => {
    const columnLineage = { graph: [] } as unknown as ColumnLineageGraph
    const dataset = {
      name: 'users',
      columnLineage: null,
      fields: [],
    } as unknown as Dataset
    const { locationRef } = renderDrawer({ columnLineage, dataset, isDatasetLoading: false })

    fireEvent.click(screen.getByRole('button'))
    expect(locationRef.current?.search).toBe('')
  })
})
