// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { MemoryRouter, Route, Routes, useLocation, type Location } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import ColumnLevelDrawer from '../../../routes/column-level/ColumnLevelDrawer'
import React from 'react'
import type { ColumnLineageGraph, Dataset } from '../../../types/api'
import { renderWithProviders } from '../../../helpers/testUtils'
import * as useDatasetHook from '../../../queries/datasets'

// Mocks
const { fetchDatasetMock, jsonViewMock } = vi.hoisted(() => ({
  fetchDatasetMock: vi.fn(),
  jsonViewMock: vi.fn((props: { data: unknown }) => props),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('../../../components/core/json-view/MqJsonView', () => ({
  __esModule: true,
  default: (props: { data: unknown }) => {
    jsonViewMock(props)
    return <div data-testid='json-view' />
  },
}))

vi.mock('../../../components/core/text/MqText', () => ({
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
  initialEntry: string = '/column-level/analytics/users?dataset=users&namespace=analytics'
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
    refetch: mockRefetch
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
        columnLineage: { columnLineage: state.columnLineage }
      }
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

  it('returns null when column lineage is unavailable', () => {
    // If column lineage is null, component might return null.
    renderDrawer(
      { columnLineage: null, dataset: null, isDatasetLoading: false },
      '/column-level/analytics/users'
    )

    expect(screen.queryByTestId('json-view')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('renders progress bar when dataset are loading', () => {
    const columnLineage = { graph: [] } as unknown as ColumnLineageGraph
    renderDrawer({ columnLineage, dataset: null, isDatasetLoading: true })

    expect(useDatasetHook.useDataset).toHaveBeenCalled()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('renders schema details and facets when dataset information is loaded', () => {
    const columnLineage = { graph: [] } as unknown as ColumnLineageGraph
    const dataset = {
      name: 'users',
      columnLineage: { lineage: 'data' },
      fields: [
        { name: 'email', type: 'string', description: 'user email', tags: [] },
      ],
    } as unknown as Dataset

    renderDrawer({ columnLineage, dataset, isDatasetLoading: false })

    expect(screen.getByText('dataset_info_columns.name')).toBeInTheDocument()
    expect(screen.getByText('email')).toBeInTheDocument()
    expect(screen.getByText('user email')).toBeInTheDocument()
    expect(jsonViewMock).toHaveBeenCalledWith({ data: dataset.columnLineage })
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
