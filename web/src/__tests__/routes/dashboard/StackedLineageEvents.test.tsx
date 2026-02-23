// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { LineageMetric } from '../../../store/requests/lineageMetrics'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import StackedLineageEvents from '../../../routes/dashboard/StackedLineageEvents'

// Mock @visx/responsive ParentSize
vi.mock('@visx/responsive/lib/components/ParentSize', () => ({
  default: ({
    children,
  }: {
    children: (parent: { width: number; height: number }) => React.ReactNode
  }) => <div data-testid='parent-size-wrapper'>{children({ width: 800, height: 200 })}</div>,
}))

// Mock @mui/x-charts
vi.mock('@mui/x-charts', () => ({
  LineChart: ({ series, width, height }: any) => (
    <div
      data-testid='stacked-line-chart'
      data-width={width}
      data-height={height}
      data-series-count={series.length}
    >
      {series.map((s: any, i: number) => (
        <div key={i} data-testid={`series-${s.label}`}>
          {s.label}
        </div>
      ))}
    </div>
  ),
}))

describe('StackedLineageEvents Component', () => {
  const mockHourlyMetrics: LineageMetric[] = [
    {
      startInterval: '2023-01-01T00:00:00Z',
      endInterval: '2023-01-01T01:00:00Z',
      start: 10,
      complete: 8,
      fail: 2,
      abort: 0,
    },
    {
      startInterval: '2023-01-01T01:00:00Z',
      endInterval: '2023-01-01T02:00:00Z',
      start: 15,
      complete: 12,
      fail: 1,
      abort: 2,
    },
    {
      startInterval: '2023-01-01T02:00:00Z',
      endInterval: '2023-01-01T03:00:00Z',
      start: 20,
      complete: 18,
      fail: 0,
      abort: 2,
    },
  ]

  const mockWeeklyMetrics: LineageMetric[] = Array(7)
    .fill(null)
    .map((_, i) => ({
      startInterval: new Date(2023, 0, i + 1).toISOString(),
      endInterval: new Date(2023, 0, i + 1, 23, 59, 59).toISOString(),
      start: (i + 1) * 10,
      complete: (i + 1) * 8,
      fail: i,
      abort: 1,
    }))

  it('should render LineChart with metrics', () => {
    render(<StackedLineageEvents lineageMetrics={mockHourlyMetrics} />)

    const chart = screen.getByTestId('stacked-line-chart')
    expect(chart).toBeTruthy()
  })

  it('should render all four series (Started, Completed, Failed, Aborted)', () => {
    render(<StackedLineageEvents lineageMetrics={mockHourlyMetrics} />)

    expect(screen.getByTestId('series-Started')).toBeTruthy()
    expect(screen.getByTestId('series-Completed')).toBeTruthy()
    expect(screen.getByTestId('series-Failed')).toBeTruthy()
    expect(screen.getByTestId('series-Aborted')).toBeTruthy()
  })

  it('should display total event count', () => {
    // Total: (10+8+2+0) + (15+12+1+2) + (20+18+0+2) = 20 + 30 + 40 = 90
    render(<StackedLineageEvents lineageMetrics={mockHourlyMetrics} />)

    expect(screen.getByText('90 EVENTS')).toBeTruthy()
  })

  it('should display singular EVENT when count is 1', () => {
    const singleMetric: LineageMetric[] = [
      {
        startInterval: '2023-01-01T00:00:00Z',
        endInterval: '2023-01-01T01:00:00Z',
        start: 1,
        complete: 0,
        fail: 0,
        abort: 0,
      },
    ]
    render(<StackedLineageEvents lineageMetrics={singleMetric} />)

    expect(screen.getByText('1 EVENT')).toBeTruthy()
  })

  it('should handle weekly metrics (7 days)', () => {
    render(<StackedLineageEvents lineageMetrics={mockWeeklyMetrics} />)

    const chart = screen.getByTestId('stacked-line-chart')
    expect(chart).toBeTruthy()
    expect(chart.getAttribute('data-series-count')).toBe('4')
  })

  it('should handle metrics with zero events', () => {
    const zeroMetrics: LineageMetric[] = [
      {
        startInterval: '2023-01-01T00:00:00Z',
        endInterval: '2023-01-01T01:00:00Z',
        start: 0,
        complete: 0,
        fail: 0,
        abort: 0,
      },
    ]
    render(<StackedLineageEvents lineageMetrics={zeroMetrics} />)

    expect(screen.getByText('0 EVENTS')).toBeTruthy()
  })

  it('should render with correct chart dimensions', () => {
    render(<StackedLineageEvents lineageMetrics={mockHourlyMetrics} />)

    const chart = screen.getByTestId('stacked-line-chart')
    expect(chart.getAttribute('data-width')).toBe('800')
    expect(chart.getAttribute('data-height')).toBe('200')
  })

  it('should render ParentSize wrapper', () => {
    render(<StackedLineageEvents lineageMetrics={mockHourlyMetrics} />)

    expect(screen.getByTestId('parent-size-wrapper')).toBeTruthy()
  })

  it('should handle large event counts', () => {
    const largeMetrics: LineageMetric[] = [
      {
        startInterval: '2023-01-01T00:00:00Z',
        endInterval: '2023-01-01T01:00:00Z',
        start: 1000,
        complete: 900,
        fail: 50,
        abort: 50,
      },
    ]
    render(<StackedLineageEvents lineageMetrics={largeMetrics} />)

    expect(screen.getByText('2000 EVENTS')).toBeTruthy()
  })

  it('should render event count chip', () => {
    const { container } = render(<StackedLineageEvents lineageMetrics={mockHourlyMetrics} />)

    const chip = container.querySelector('.MuiChip-root')
    expect(chip).toBeTruthy()
  })
})
