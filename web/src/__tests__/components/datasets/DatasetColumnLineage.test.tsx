// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { renderWithProviders } from '../../../helpers/testUtils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import * as useDatasetHook from '../../../queries/datasets'
import DatasetColumnLineage from '../../../components/datasets/DatasetColumnLineage'
import type { Dataset } from '../../../types/api'
import type { LineageDataset } from '../../../types/lineage'

// Mock dependencies
vi.mock('../../../components/core/json-view/MqJsonView', () => ({
  __esModule: true,
  default: ({ data }: { data: unknown }) => (
    <div data-testid='mq-json-view'>{JSON.stringify(data)}</div>
  ),
}))

vi.mock('../../../components/core/empty/MqEmpty', () => ({
  __esModule: true,
  default: ({ title, body, children }: { title?: React.ReactNode; body?: React.ReactNode; children?: React.ReactNode }) => (
    <div data-testid='mq-empty'>
      <div>{title}</div>
      <div>{body}</div>
      <div>{children}</div>
    </div>
  ),
}))

vi.mock('../../../components/core/text/MqText', () => ({
  __esModule: true,
  default: ({ children, subdued }: { children: React.ReactNode; subdued?: boolean }) => (
    <span data-subdued={subdued}>{children}</span>
  ),
}))

// Mock Helpers
const fileSizeMock = vi.fn((payload: string) => ({ kiloBytes: payload.length, megaBytes: payload.length / 1024 }))
vi.mock('../../../helpers', () => ({
  fileSize: (...args: any[]) => fileSizeMock(...args),
}))

// Mock file-saver
const saveAsMock = vi.fn()
vi.mock('file-saver', () => ({
  saveAs: (...args: any[]) => saveAsMock(...args),
}))

const lineageDataset: LineageDataset = {
  namespace: 'analytics',
  name: 'orders',
  type: 'DB_TABLE',
  inEdges: [],
  outEdges: [],
} as LineageDataset

const makeDataset = (overrides: Partial<Dataset> = {}): Dataset => ({
  id: { namespace: 'analytics', name: 'orders' },
  type: 'DB_TABLE',
  name: 'orders',
  physicalName: 'orders',
  createdAt: '',
  updatedAt: '',
  namespace: 'analytics',
  sourceName: 'warehouse',
  fields: [],
  tags: [],
  lastModifiedAt: '',
  description: '',
  facets: {},
  deleted: false,
  columnLineage: {
    graph: {
      nodes: [],
    },
  },
  ...overrides,
})

describe('DatasetColumnLineage', () => {
  beforeEach(() => {
    saveAsMock.mockClear()
    fileSizeMock.mockClear()
  })

  it('fetches dataset on mount, renders json', () => {
    const columnLineage = { graph: { edges: [] } }
    const dataset = makeDataset({ columnLineage })

    vi.spyOn(useDatasetHook, 'useDataset').mockReturnValue({
      data: dataset,
      isLoading: false,
      isError: false,
    } as any)

    renderWithProviders(
      <DatasetColumnLineage lineageDataset={lineageDataset} />,
      {
        initialEntries: ['/analytics/orders']
      }
    )

    expect(screen.getByTestId('mq-json-view')).toHaveTextContent(JSON.stringify(columnLineage))
  })

  it('renders empty state when column lineage is missing', () => {
    const dataset = makeDataset({ columnLineage: undefined })

    vi.spyOn(useDatasetHook, 'useDataset').mockReturnValue({
      data: dataset,
      isLoading: false,
      isError: false,
    } as any)

    renderWithProviders(
      <DatasetColumnLineage lineageDataset={lineageDataset} />,
      {
        initialEntries: ['/analytics/orders']
      }
    )

    expect(screen.getByTestId('mq-empty')).toBeInTheDocument()
    expect(screen.queryByTestId('mq-json-view')).toBeNull()
  })

  it('shows download option for large payloads and saves file', () => {
    const columnLineage = { graph: { nodes: [1, 2, 3] } }
    const dataset = makeDataset({ columnLineage })

    vi.spyOn(useDatasetHook, 'useDataset').mockReturnValue({
      data: dataset,
      isLoading: false,
      isError: false,
    } as any)

    // Force fileSize to return > 500
    vi.mocked(fileSizeMock).mockReturnValueOnce({ kiloBytes: 501, megaBytes: 0.49 })

    renderWithProviders(
      <DatasetColumnLineage lineageDataset={lineageDataset} />,
      {
        initialEntries: ['/analytics/orders']
      }
    )

    const downloadButton = screen.getByRole('button', { name: 'Download payload' })
    fireEvent.click(downloadButton)
    expect(saveAsMock).toHaveBeenCalledTimes(1)

    const [blob, fileName] = saveAsMock.mock.calls[0]
    expect(blob).toBeInstanceOf(Blob)
    expect(fileName).toBe('orders-analytics-columnLineage.json')
  })
})
