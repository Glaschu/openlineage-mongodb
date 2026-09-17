// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { MemoryRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { legacy_createStore as createStore } from '@reduxjs/toolkit'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Header from '@/shared/components/Header/Header'
import React from 'react'

vi.mock('@/features/search/SearchPage', () => ({
  default: () => <div data-testid='search-component'>Search Component</div>,
}))

vi.mock('@/features/search/components/omni-search/OmniSearch', () => ({
  __esModule: true,
  default: () => <div data-testid='omni-search' />,
}))

// The header carries the migration set indicator, so it needs the store and a
// router.
const renderHeader = (members: string[] = []) => {
  const theme = createTheme()
  const store = createStore(() => ({ migration: { members } }))

  return render(
    <Provider store={store}>
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <Header />
        </ThemeProvider>
      </MemoryRouter>
    </Provider>
  )
}

describe('Header', () => {
  it('renders the search component inside the app bar', () => {
    renderHeader()

    expect(screen.getByRole('banner')).toBeTruthy()
    expect(screen.getByTestId('search-component')).toBeTruthy()
  })

  it('stays out of the way until a migration set exists', () => {
    renderHeader()

    expect(screen.queryByText(/Migration set/)).not.toBeInTheDocument()
  })

  it('shows how many objects are in the set once there are some', () => {
    renderHeader(['job:etl:a', 'dataset:raw:b'])

    expect(screen.getByText('Migration set (2)')).toBeInTheDocument()
  })
})
