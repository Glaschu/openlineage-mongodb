// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import Dialog from '@/shared/components/Dialog'

describe('Dialog Component', () => {
  it('renders two action buttons with the warning text', () => {
    render(
      <Dialog
        dialogIsOpen={true}
        dialogToggle={vi.fn()}
        ignoreWarning={vi.fn()}
        editWarningField={'Description of dialog...'}
      />
    )
    expect(screen.getAllByRole('button')).toHaveLength(2)
    expect(screen.getAllByText('Description of dialog...').length).toBeGreaterThan(0)
  })

  it('Cancel button invokes dialogToggle, Continue invokes ignoreWarning', () => {
    const dialogToggle = vi.fn()
    const ignoreWarning = vi.fn()
    render(
      <Dialog
        dialogIsOpen={true}
        dialogToggle={dialogToggle}
        ignoreWarning={ignoreWarning}
        editWarningField={'note'}
      />
    )
    fireEvent.click(screen.getByText('Cancel'))
    fireEvent.click(screen.getByText('Continue'))
    expect(dialogToggle).toHaveBeenCalledWith('')
    expect(ignoreWarning).toHaveBeenCalled()
  })

  it('does not render the optional warning content block when editWarningField is empty', () => {
    render(
      <Dialog
        dialogIsOpen={true}
        dialogToggle={vi.fn()}
        ignoreWarning={vi.fn()}
        editWarningField={''}
      />
    )
    // Only the non-conditional DialogContent should be in the DOM (one)
    const dialogs = document.querySelectorAll('.MuiDialogContent-root')
    expect(dialogs.length).toBe(1)
  })
})
