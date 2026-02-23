// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { ThemeProvider, createTheme } from '@mui/material/styles'
import Header from '../../../components/header/Header'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('../../../components/search/Search', () => ({
  default: () => <div data-testid='search-component'>Search Component</div>,
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
