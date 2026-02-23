// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { fireEvent, render, screen } from '@testing-library/react'
import { ZoomControls } from '../../../routes/column-level/ZoomControls'
import { describe, expect, it, vi } from 'vitest'
import React from 'react'

vi.mock('../../../components/core/tooltip/MQTooltip', () => ({
  __esModule: true,
  default: ({ title, children }: { title: string; children: React.ReactElement }) =>
    React.cloneElement(children, { 'aria-label': title }),
}))

describe('ZoomControls', () => {
  it('invokes zoom handlers', () => {
    const handleScaleZoom = vi.fn()
    const handleResetZoom = vi.fn()

    render(
      <ZoomControls handleScaleZoom={handleScaleZoom} handleResetZoom={handleResetZoom} />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    expect(handleScaleZoom).toHaveBeenCalledWith('in')

    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }))
    expect(handleScaleZoom).toHaveBeenCalledWith('out')

    fireEvent.click(screen.getByRole('button', { name: 'Reset zoom' }))
    expect(handleResetZoom).toHaveBeenCalled()
  })

  it('renders the center button when provided', () => {
    const handleCenter = vi.fn()

    render(
      <ZoomControls
        handleScaleZoom={vi.fn()}
        handleResetZoom={vi.fn()}
        handleCenterOnNode={handleCenter}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Center on selected node' }))
    expect(handleCenter).toHaveBeenCalled()
  })
})
