// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { MemoryRouter, Route, Routes, useLocation, type Location } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ActionBar } from '../../../routes/table-level/ActionBar'
import React from 'react'

vi.mock('../../../components/core/tooltip/MQTooltip', () => ({
  __esModule: true,
  default: ({ title, children }: { title: string; children: React.ReactElement }) =>
    React.cloneElement(children, { 'aria-label': title }),
}))

const LocationSpy = ({ onChange }: { onChange: (location: Location) => void }) => {
  const location = useLocation()
  React.useEffect(() => {
    onChange(location)
  }, [location, onChange])
  return null
}

const renderActionBar = (
  {
    nodeType = 'JOB',
    depth = 2,
    initialEntry = '/table/JOB/finance/daily-job?depth=2',
  }: { nodeType?: 'JOB' | 'DATASET'; depth?: number; initialEntry?: string },
  overrides: {
    setDepth?: (depth: number) => void
    setIsCompact?: (value: boolean) => void
    setIsFull?: (value: boolean) => void
    isCompact?: boolean
    isFull?: boolean
  } = {}
) => {
  const theme = createTheme()
  const fetchLineage = vi.fn()
  const setDepth = vi.fn(overrides.setDepth ?? (() => { }))
  const setIsCompact = vi.fn(overrides.setIsCompact ?? (() => { }))
  const setIsFull = vi.fn(overrides.setIsFull ?? (() => { }))
  const locationRef: { current: Location | null } = { current: null }

  const ui = render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route
            path='/table/:nodeType/:namespace/:name'
            element={
              <>
                <LocationSpy onChange={(location) => (locationRef.current = location)} />
                <ActionBar
                  nodeType={nodeType}
                  refresh={fetchLineage as any}
                  depth={depth}
                  setDepth={setDepth}
                  isCompact={overrides.isCompact ?? false}
                  setIsCompact={setIsCompact}
                  isFull={overrides.isFull ?? false}
                  setIsFull={setIsFull}
                />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  )

  return { fetchLineage, setDepth, setIsCompact, setIsFull, locationRef, ...ui }
}

describe('ActionBar', () => {
  it('calls fetchLineage with the current parameters when refresh is clicked', () => {
    const { fetchLineage } = renderActionBar({})

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))

    expect(fetchLineage).toHaveBeenCalled()
  })

  it('updates the depth and search params when the depth input changes', () => {
    const { setDepth, locationRef } = renderActionBar({ depth: 2 })

    fireEvent.change(screen.getByLabelText('Depth'), { target: { value: '3' } })

    expect(setDepth).toHaveBeenCalledWith(3)
    expect(locationRef.current?.search).toContain('depth=3')
  })

  it('toggles the switches and writes the values to the URL', () => {
    const { setIsFull, setIsCompact, locationRef } = renderActionBar({ initialEntry: '/table/JOB/finance/daily-job' })

    fireEvent.click(screen.getByRole('checkbox', { name: 'Full Graph' }))
    expect(setIsFull).toHaveBeenCalledWith(true)
    expect(locationRef.current?.search).toContain('isFull=true')

    fireEvent.click(screen.getByRole('checkbox', { name: 'Compact Nodes' }))
    expect(setIsCompact).toHaveBeenCalledWith(true)
    expect(locationRef.current?.search).toContain('isCompact=true')
  })
})
