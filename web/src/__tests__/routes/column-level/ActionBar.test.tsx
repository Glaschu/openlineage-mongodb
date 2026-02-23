// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { MemoryRouter, Route, Routes, useLocation, type Location } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { fireEvent, render, screen } from '@testing-library/react'
import { ActionBar } from '../../../routes/column-level/ActionBar'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
  initialEntry: string,
  overrides: { depth?: number; setDepth?: (depth: number) => void } = {}
) => {
  const fetchColumnLineage = vi.fn()
  const setDepth = vi.fn(overrides.setDepth ?? (() => { }))
  const locationRef: { current: Location | null } = { current: null }
  const theme = createTheme()

  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route
            path='/column-level/:namespace/:name'
            element={
              <>
                <LocationSpy onChange={(location) => (locationRef.current = location)} />
                <ActionBar refresh={fetchColumnLineage} depth={overrides.depth ?? 2} setDepth={setDepth} />
              </>
            }
          />
          <Route
            path='/datasets'
            element={<LocationSpy onChange={(location) => (locationRef.current = location)} />}
          />
          <Route
            path='/column-level'
            element={
              <>
                <LocationSpy onChange={(location) => (locationRef.current = location)} />
                <ActionBar refresh={fetchColumnLineage} depth={overrides.depth ?? 2} setDepth={setDepth} />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  )

  return { fetchColumnLineage, setDepth, locationRef }
}

describe('column-level/ActionBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('invokes fetchColumnLineage as refresh when refresh is clicked', () => {
    const { fetchColumnLineage } = renderActionBar('/column-level/analytics/users?depth=3')

    fireEvent.click(screen.getByRole('button', { name: /refresh/i }))

    expect(fetchColumnLineage).toHaveBeenCalled()
  })

  it('updates depth, writes query string, and casts invalid values to zero', () => {
    const { setDepth, locationRef } = renderActionBar('/column-level/analytics/users?depth=2')

    const input = screen.getByLabelText('Depth')
    fireEvent.change(input, { target: { value: '5' } })
    expect(setDepth).toHaveBeenCalledWith(5)
    expect(locationRef.current?.search).toContain('depth=5')

    fireEvent.change(input, { target: { value: '' } })
    expect(setDepth).toHaveBeenCalledWith(0)
    expect(locationRef.current?.search).toBe('?depth=')
  })

  it('falls back to default labels and avoids fetching when params are missing', () => {
    const { fetchColumnLineage } = renderActionBar('/column-level')

    expect(screen.getByText('Unknown namespace name')).toBeInTheDocument()
    expect(screen.getByText('Unknown dataset name')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /refresh/i }))
    expect(fetchColumnLineage).not.toHaveBeenCalled()
  })

  it('navigates back to datasets when the back button is clicked', () => {
    const { locationRef } = renderActionBar('/column-level/analytics/users?depth=2')

    fireEvent.click(screen.getByRole('button', { name: /back to datasets/i }))

    expect(locationRef.current?.pathname).toBe('/datasets')
  })
})
