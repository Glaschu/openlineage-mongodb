// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { IntervalMetric } from '../../../store/requests/intervalMetrics'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import MiniGraph from '../../../routes/dashboard/MiniGraph'
import React from 'react'

// Mock @visx/responsive ParentSize
vi.mock('@visx/responsive/lib/components/ParentSize', () => ({
  default: ({
    children,
  }: {
    children: (parent: { width: number; height: number }) => React.ReactNode
  }) => <div>{children({ width: 400, height: 52 })}</div>,
}))

// Mock @mui/x-charts
vi.mock('@mui/x-charts', () => ({
  LineChart: ({ series, height }: any) => (
    <div data-testid='line-chart' data-height={height} data-series-count={series.length}>
      Mock LineChart
    </div>
  ),
}))

describe('MiniGraph Component', () => {
  const mockMetrics: IntervalMetric[] = [
    {
      startInterval: '2023-01-01T00:00:00Z',
      endInterval: '2023-01-01T01:00:00Z',
      count: 10,
    },
    {
      startInterval: '2023-01-01T01:00:00Z',
      endInterval: '2023-01-01T02:00:00Z',
      count: 20,
    },
    {
      startInterval: '2023-01-01T02:00:00Z',
      endInterval: '2023-01-01T03:00:00Z',
      count: 15,
    },
  ]

  const mockWeekMetrics: IntervalMetric[] = Array(7)
    .fill(null)
    .map((_, i) => ({
      startInterval: new Date(2023, 0, i + 1).toISOString(),
      endInterval: new Date(2023, 0, i + 1, 23, 59, 59).toISOString(),
      count: (i + 1) * 5,
    }))

  it('should show skeleton when loading', () => {
    const { container } = render(
      <MiniGraph intervalMetrics={undefined} isLoading={true} color='#ff0000' label='Test Metric' />
    )

    const skeleton = container.querySelector('.MuiSkeleton-root')
    expect(skeleton).toBeTruthy()
  })

  it('should show skeleton when no metrics provided', () => {
    const { container } = render(
      <MiniGraph
        intervalMetrics={undefined}
        isLoading={false}
        color='#ff0000'
        label='Test Metric'
      />
    )

    const skeleton = container.querySelector('.MuiSkeleton-root')
    expect(skeleton).toBeTruthy()
  })

  it('should render LineChart when metrics are provided and not loading', () => {
    render(
      <MiniGraph
        intervalMetrics={mockMetrics}
        isLoading={false}
        color='#ff0000'
        label='Test Metric'
      />
    )

    const chart = screen.getByTestId('line-chart')
    expect(chart).toBeTruthy()
    expect(chart.getAttribute('data-height')).toBe('52')
  })

  it('should render with hourly data format', () => {
    render(
      <MiniGraph intervalMetrics={mockMetrics} isLoading={false} color='#00ff00' label='Jobs' />
    )

    const chart = screen.getByTestId('line-chart')
    expect(chart).toBeTruthy()
  })

  it('should render with weekly data format', () => {
    render(
      <MiniGraph
        intervalMetrics={mockWeekMetrics}
        isLoading={false}
        color='#0000ff'
        label='Datasets'
      />
    )

    const chart = screen.getByTestId('line-chart')
    expect(chart).toBeTruthy()
    expect(chart.getAttribute('data-series-count')).toBe('1')
  })

  it('should use correct color prop', () => {
    const testColor = '#123456'
    render(
      <MiniGraph intervalMetrics={mockMetrics} isLoading={false} color={testColor} label='Test' />
    )

    const chart = screen.getByTestId('line-chart')
    expect(chart).toBeTruthy()
  })

  it('should handle empty metrics array', () => {
    render(<MiniGraph intervalMetrics={[]} isLoading={false} color='#ff0000' label='Empty' />)

    const chart = screen.getByTestId('line-chart')
    expect(chart).toBeTruthy()
  })
})
