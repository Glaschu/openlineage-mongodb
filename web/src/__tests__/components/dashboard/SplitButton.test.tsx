// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { ThemeProvider, createTheme } from '@mui/material/styles'
import SplitButton from '../../../components/dashboard/SplitButton'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'

const renderSplitButton = (props: React.ComponentProps<typeof SplitButton>) => {
  const theme = createTheme()

  return render(
    <ThemeProvider theme={theme}>
      <SplitButton {...props} />
    </ThemeProvider>
  )
}

describe('SplitButton', () => {
  it('calls onClick with the default option when the primary button is pressed', () => {
    const onClick = vi.fn()

    renderSplitButton({ options: ['Last hour', 'Last day'], onClick })

    fireEvent.click(screen.getByRole('button', { name: 'Last hour' }))

    expect(onClick).toHaveBeenCalledWith('Last hour')
  })

  it('lets the user pick a different option from the menu', async () => {
    const onClick = vi.fn()

    renderSplitButton({ options: ['Last hour', 'Last day'], onClick })

    fireEvent.click(screen.getByRole('button', { name: 'select merge strategy' }))

    fireEvent.click(await screen.findByRole('menuitem', { name: 'Last day' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Last day' })).toBeTruthy())

    expect(onClick).toHaveBeenCalledWith('Last day')
  })

  it('invokes the optional refresh handler', () => {
    const onClick = vi.fn()
    const onRefresh = vi.fn()

    renderSplitButton({ options: ['Last hour'], onClick, onRefresh })

    const refreshButton = screen
      .getAllByRole('button')
      .find((button) => button.querySelector('[data-testid="RefreshIcon"]'))

    expect(refreshButton).toBeTruthy()

    fireEvent.click(refreshButton as HTMLElement)

    expect(onRefresh).toHaveBeenCalledTimes(1)
  })
})
