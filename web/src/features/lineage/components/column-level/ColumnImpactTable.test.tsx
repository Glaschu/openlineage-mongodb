// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import React from 'react'

import { ColumnImpactTable, matchesColumnFilter, sortColumnRows } from './ColumnImpactTable'
import type { ColumnImpactRow } from './columnImpact'

const row = (overrides: Partial<ColumnImpactRow>): ColumnImpactRow => ({
  id: `datasetField:analytics:${overrides.dataset ?? 'orders'}:${overrides.column ?? 'total'}`,
  direction: 'downstream',
  namespace: 'analytics',
  dataset: 'orders',
  column: 'total',
  hops: 1,
  transformation: '',
  via: 'source',
  ...overrides,
})

const rows: ColumnImpactRow[] = [
  row({ dataset: 'board_report', column: 'revenue', hops: 3 }),
  row({ dataset: 'summary', column: 'revenue', hops: 1, transformation: 'AGGREGATION' }),
  row({ dataset: 'orders', column: 'total', hops: 2, direction: 'upstream', namespace: 'raw' }),
]

const renderTable = (props: Partial<React.ComponentProps<typeof ColumnImpactTable>> = {}) =>
  render(
    <MemoryRouter>
      <ColumnImpactTable
        rows={rows}
        selectedColumn={'datasetField:analytics:summary:revenue'}
        filter={''}
        onFilterChange={() => {}}
        {...props}
      />
    </MemoryRouter>
  )

const datasetColumn = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((tableRow) => within(tableRow).getAllByRole('cell')[2].textContent)

describe('column impact helpers', () => {
  it('filters on the fields an auditor would type', () => {
    const subject = row({ dataset: 'summary', column: 'revenue', transformation: 'AGGREGATION' })

    expect(matchesColumnFilter(subject, 'SUMM')).toBe(true)
    expect(matchesColumnFilter(subject, 'revenue')).toBe(true)
    expect(matchesColumnFilter(subject, 'aggregation')).toBe(true)
    expect(matchesColumnFilter(subject, 'downstream')).toBe(true)
    expect(matchesColumnFilter(subject, 'nope')).toBe(false)
  })

  it('sorts hops numerically', () => {
    const numeric = [row({ dataset: 'a', hops: 10 }), row({ dataset: 'b', hops: 2 })]

    expect(sortColumnRows(numeric, 'hops', true).map((r) => r.hops)).toEqual([2, 10])
  })
})

describe('ColumnImpactTable', () => {
  it('asks for a column before it can answer anything', () => {
    renderTable({ selectedColumn: null })

    expect(screen.getByText('No column selected')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('opens sorted by distance from the selected column', () => {
    renderTable()

    expect(datasetColumn()).toEqual(['summary', 'orders', 'board_report'])
  })

  it('reverses on a second click of the active column', () => {
    renderTable()

    fireEvent.click(screen.getByRole('button', { name: /Hops/ }))

    expect(datasetColumn()).toEqual(['board_report', 'orders', 'summary'])
  })

  it('shows the transformation where the facet described it, and a dash where it did not', () => {
    renderTable()

    const summaryRow = screen.getAllByRole('row')[1]
    expect(within(summaryRow).getByText('AGGREGATION')).toBeInTheDocument()

    const ordersRow = screen.getAllByRole('row')[2]
    expect(within(ordersRow).getByText('—')).toBeInTheDocument()
  })

  it('counts each direction', () => {
    renderTable()

    expect(screen.getByText('1 upstream')).toBeInTheDocument()
    expect(screen.getByText('2 downstream')).toBeInTheDocument()
  })

  it('exports only when there is something to export', () => {
    const onExport = vi.fn()
    const { unmount } = renderTable({ onExport })

    fireEvent.click(screen.getByRole('button', { name: /Export CSV/ }))
    expect(onExport).toHaveBeenCalled()
    unmount()

    renderTable({ rows: [], onExport })
    expect(screen.getByRole('button', { name: /Export CSV/ })).toBeDisabled()
  })

  it('separates an empty lineage from an over-tight filter', () => {
    const { unmount } = renderTable({ rows: [] })
    expect(screen.getByText(/no lineage in the loaded graph/i)).toBeInTheDocument()
    unmount()

    renderTable({ filter: 'no-such-column' })
    expect(screen.getByText(/No impacted columns match this filter/)).toBeInTheDocument()
  })
})
