// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { ThemeProvider, createTheme } from '@mui/material/styles'
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

const renderHeader = () => {
  const theme = createTheme()

  return render(
    <ThemeProvider theme={theme}>
      <Header />
    </ThemeProvider>
  )
}

describe('Header', () => {
  it('renders the search component inside the app bar', () => {
    renderHeader()

    expect(screen.getByRole('banner')).toBeTruthy()
    expect(screen.getByTestId('search-component')).toBeTruthy()
  })
})
