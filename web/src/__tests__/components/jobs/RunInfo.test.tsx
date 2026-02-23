// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { Run } from '../../../types/api'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../helpers/testUtils'
import { screen } from '@testing-library/react'
import React from 'react'
import RunInfo from '../../../components/jobs/RunInfo'
import * as useFacetsHook from '../../../queries/facets'

// Mock MqCode component
vi.mock('../../../components/core/code/MqCode', () => ({
  default: ({ code, language }: { code?: string; language?: string }) =>
    code ? (
      <div data-testid={`code-${language}`} data-code={code}>
        {code}
      </div>
    ) : null,
}))

// Mock MqJsonView component
vi.mock('../../../components/core/json-view/MqJsonView', () => ({
  default: ({ data, 'aria-label': ariaLabel }: any) => (
    <div data-testid='json-view' aria-label={ariaLabel}>
      {JSON.stringify(data)}
    </div>
  ),
}))

describe('RunInfo Component', () => {
  const mockRun: Run = {
    id: 'run-1',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T01:00:00Z',
    state: 'COMPLETED',
    startedAt: '2023-01-01T00:00:00Z',
    endedAt: '2023-01-01T01:00:00Z',
    durationMs: 3600000,
    facets: {
      testFacet: { key: 'value' },
    },
  } as any

  const renderRunInfo = (run: Run = mockRun, jobFacets: any = {}) => {
    vi.spyOn(useFacetsHook, 'useJobFacets').mockReturnValue({
      data: jobFacets,
      isLoading: false,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any)

    return renderWithProviders(<RunInfo run={run} />)
  }

  it('should render without crashing', () => {
    const { container } = renderRunInfo()
    expect(container).toBeTruthy()
  })

  it('should render SQL code when sql facet exists', () => {
    const jobFacets = {
      sql: {
        query: 'SELECT * FROM users',
      },
    }
    renderRunInfo(mockRun, jobFacets)

    const sqlCode = screen.getByTestId('code-sql')
    expect(sqlCode).toBeTruthy()
    expect(sqlCode.getAttribute('data-code')).toBe('SELECT * FROM users')
  })

  it('should render source code when sourceCode facet exists', () => {
    const jobFacets = {
      sourceCode: {
        sourceCode: 'def hello(): print("world")',
        language: 'python',
      },
    }
    renderRunInfo(mockRun, jobFacets)

    const pythonCode = screen.getByTestId('code-python')
    expect(pythonCode).toBeTruthy()
    expect(pythonCode.getAttribute('data-code')).toBe('def hello(): print("world")')
  })

  it('should render JOB FACETS section when job facets exist', () => {
    const jobFacets = {
      customFacet: { data: 'test' },
    }
    renderRunInfo(mockRun, jobFacets)

    expect(screen.getByText('JOB FACETS')).toBeTruthy()
    const jsonView = screen.getAllByTestId('json-view')[0]
    expect(jsonView.getAttribute('aria-label')).toBe('Job facets')
  })

  it('should render RUN FACETS section when run facets exist', () => {
    renderRunInfo()

    expect(screen.getByText('RUN FACETS')).toBeTruthy()
    const jsonViews = screen.getAllByTestId('json-view')
    const runFacetsView = jsonViews.find((el) => el.getAttribute('aria-label') === 'Run facets')
    expect(runFacetsView).toBeTruthy()
  })

  it('should not render JOB FACETS when no job facets', () => {
    renderRunInfo(mockRun, null)
    expect(screen.queryByText('JOB FACETS')).toBeNull()
  })

  it('should not render RUN FACETS when no run facets', () => {
    const runWithoutFacets = { ...mockRun, facets: null } as any
    renderRunInfo(runWithoutFacets)

    expect(screen.queryByText('RUN FACETS')).toBeNull()
  })

  it('should render both SQL and source code facets', () => {
    const jobFacets = {
      sql: {
        query: 'SELECT * FROM table',
      },
      sourceCode: {
        sourceCode: 'console.log("test")',
        language: 'javascript',
      },
    }
    renderRunInfo(mockRun, jobFacets)

    expect(screen.getByTestId('code-sql')).toBeTruthy()
    expect(screen.getByTestId('code-javascript')).toBeTruthy()
  })

  it('should handle empty job facets object', () => {
    renderRunInfo(mockRun, {})

    // Should still render JOB FACETS section with empty object if truthy?
    // RunInfo checks: {jobFacets && ...}
    // If jobFacets is {}, it is truthy.
    expect(screen.getByText('JOB FACETS')).toBeTruthy()
  })
})
