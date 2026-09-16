// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import React from 'react'

import { ImpactTable, matchesFilter, sortRows } from './ImpactTable'
import type { ImpactRow } from './impact'

const row = (overrides: Partial<ImpactRow>): ImpactRow => ({
  id: overrides.name ?? 'id',
  direction: 'downstream',
  type: 'DATASET',
  namespace: 'analytics',
  name: 'orders',
  hops: 1,
  updatedAt: '',
  state: '',
  ...overrides,
})

const rows: ImpactRow[] = [
  row({ name: 'far-table', hops: 9, direction: 'downstream' }),
  row({ name: 'near-job', hops: 1, type: 'JOB', direction: 'upstream', state: 'FAILED' }),
  row({ name: 'mid-table', hops: 4, direction: 'upstream', namespace: 'warehouse' }),
]

const renderTable = (props: Partial<React.ComponentProps<typeof ImpactTable>> = {}) =>
  render(
    <MemoryRouter>
      <ImpactTable rows={rows} filter={''} onFilterChange={() => {}} {...props} />
    </MemoryRouter>
  )

const nameColumn = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((tableRow) => within(tableRow).getAllByRole('cell')[3].textContent)

describe('impact list helpers', () => {
  it('matches the filter against every field a reader would search', () => {
    const subject = row({ name: 'orders', namespace: 'analytics', state: 'FAILED', type: 'JOB' })

    expect(matchesFilter(subject, 'ORD')).toBe(true)
    expect(matchesFilter(subject, 'analyt')).toBe(true)
    expect(matchesFilter(subject, 'failed')).toBe(true)
    expect(matchesFilter(subject, 'job')).toBe(true)
    expect(matchesFilter(subject, 'nope')).toBe(false)
  })

  it('treats a blank filter as no filter', () => {
    expect(matchesFilter(rows[0], '   ')).toBe(true)
  })

  it('sorts hops numerically, not as text', () => {
    const numeric = [row({ name: 'a', hops: 10 }), row({ name: 'b', hops: 9 })]

    expect(sortRows(numeric, 'hops', true).map((r) => r.hops)).toEqual([9, 10])
  })
})

describe('ImpactTable', () => {
  it('opens sorted by distance, the first question a migration asks', () => {
    renderTable()

    expect(nameColumn()).toEqual(['near-job', 'mid-table', 'far-table'])
  })

  it('reverses the sort when the active column is clicked again', () => {
    renderTable()

    fireEvent.click(screen.getByRole('button', { name: /Hops/ }))

    expect(nameColumn()).toEqual(['far-table', 'mid-table', 'near-job'])
  })

  it('sorts by any other column on request', () => {
    renderTable()

    fireEvent.click(screen.getByRole('button', { name: /Namespace/ }))

    expect(nameColumn()).toEqual(['far-table', 'near-job', 'mid-table'])
  })

  it('counts each direction so the blast radius is visible at a glance', () => {
    renderTable()

    expect(screen.getByText('2 upstream')).toBeInTheDocument()
    expect(screen.getByText('1 downstream')).toBeInTheDocument()
  })

  it('applies the filter it is given', () => {
    renderTable({ filter: 'warehouse' })

    expect(nameColumn()).toEqual(['mid-table'])
  })

  it('reports typing back to the caller', () => {
    const onFilterChange = vi.fn()
    renderTable({ onFilterChange })

    fireEvent.change(screen.getByLabelText('Filter'), { target: { value: 'orders' } })

    expect(onFilterChange).toHaveBeenCalledWith('orders')
  })

  it('distinguishes an empty graph from an over-tight filter', () => {
    const { unmount } = renderTable({ rows: [] })
    expect(screen.getByText(/Nothing upstream or downstream/)).toBeInTheDocument()
    unmount()

    renderTable({ filter: 'no-such-thing' })
    expect(screen.getByText(/No impacted objects match this filter/)).toBeInTheDocument()
  })

  it('offers the evidence pack whenever there is a view to describe', () => {
    const onExportEvidence = vi.fn()
    const { unmount } = renderTable({ onExportEvidence })

    fireEvent.click(screen.getByRole('button', { name: /Evidence pack/ }))
    expect(onExportEvidence).toHaveBeenCalled()
    unmount()

    // Unlike the CSV, an empty result is itself worth recording: "nothing
    // downstream" is the finding a change ticket needs.
    renderTable({ rows: [], onExportEvidence })
    expect(screen.getByRole('button', { name: /Evidence pack/ })).toBeEnabled()
    expect(screen.getByRole('button', { name: /Export CSV/ })).toBeDisabled()
  })
})
