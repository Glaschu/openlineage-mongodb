// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import Dialog from '../../components/Dialog'
import { dialogToggle } from '../../store/slices/displaySlice'

describe('Dialog Component', () => {
  const ignoreWarning = () => { }


  const mockProps = {
    dialogIsOpen: true,
    dialogToggle: dialogToggle,
    ignoreWarning: ignoreWarning,
    editWarningField: 'Description of dialog...',
  }

  it('should render two buttons on the dialog', () => {
    render(<Dialog {...mockProps} />)

    expect(screen.getAllByRole('button')).toHaveLength(2)
  })
})
