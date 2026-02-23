// Copyright 2018-2024 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { Run } from '../../../types/api'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import RunStatus from '../../../components/jobs/RunStatus'

const mockRun: Run = {
  id: 'run-1',
  createdAt: '2021-05-13T13:45:13Z',
  updatedAt: '2021-05-13T13:45:13Z',
  nominalStartTime: '2021-05-13T13:45:13Z',
  nominalEndTime: '2021-05-13T14:45:13Z',
  state: 'COMPLETED',
  startedAt: '2021-05-13T13:45:13Z',
  endedAt: '2021-05-13T14:45:13Z',
  durationMs: 3600000,
  args: {},
  facets: {},
  jobVersion: {
    namespace: 'test',
    name: 'test_job',
    version: '1.0',
  },
}

describe('RunStatus Component', () => {
  it('should render without crashing', () => {
    const { container } = render(<RunStatus run={mockRun} />)
    expect(container).toBeInTheDocument()
  })

  it('should render for RUNNING state', () => {
    const { container } = render(<RunStatus run={{ ...mockRun, state: 'RUNNING' }} />)
    // RunStatus renders a colored circle, verify it renders
    expect(container.firstChild).toBeInTheDocument()
  })

  it('should render for FAILED state', () => {
    const { container } = render(<RunStatus run={{ ...mockRun, state: 'FAILED' }} />)
    expect(container.firstChild).toBeInTheDocument()
  })
})
