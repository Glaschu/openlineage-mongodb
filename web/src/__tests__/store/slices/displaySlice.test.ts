// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest'
import reducer, {
  applicationError,
  dialogToggle,
} from '../../../store/slices/displaySlice'

const baseState = {
  error: '',
  success: '',
  dialogIsOpen: false,
  editWarningField: '',
  isLoading: true,
}

describe('display reducer', () => {


  it('should handle APPLICATION_ERROR', () => {
    const state = reducer(baseState as any, applicationError('boom'))
    expect(state).toEqual({
      ...baseState,
      error: 'boom',
      dialogIsOpen: true,
    })
  })

  it('should handle DIALOG_TOGGLE', () => {
    const state = reducer(baseState as any, dialogToggle('name'))
    expect(state.dialogIsOpen).toBe(true)
    expect(state.editWarningField).toBe('name')

    const secondState = reducer(state as any, dialogToggle('name'))
    expect(secondState.dialogIsOpen).toBe(false)
  })
})
