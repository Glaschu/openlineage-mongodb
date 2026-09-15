// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

import { PointerCard } from './PointerCard'

const CARD = { width: 300, height: 200 }

const withCardSize = () =>
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    ...CARD,
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: CARD.width,
    bottom: CARD.height,
    toJSON: () => ({}),
  } as DOMRect)

const renderAt = (clientX: number, clientY: number) =>
  render(
    <PointerCard clientX={clientX} clientY={clientY} data-testid='card'>
      <span>content</span>
    </PointerCard>
  )

describe('PointerCard', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('sits just past the pointer when there is room', () => {
    withCardSize()
    vi.stubGlobal('innerWidth', 1600)
    vi.stubGlobal('innerHeight', 1000)

    renderAt(100, 100)

    expect(screen.getByTestId('card')).toHaveStyle({ left: '114px', top: '114px' })
  })

  it('flips to the other side of the pointer rather than overflowing', () => {
    withCardSize()
    vi.stubGlobal('innerWidth', 1600)
    vi.stubGlobal('innerHeight', 1000)

    // 1500 + 14 + 300 runs past the right edge; 950 + 14 + 200 past the bottom.
    renderAt(1500, 950)

    expect(screen.getByTestId('card')).toHaveStyle({ left: '1186px', top: '736px' })
  })

  it('clamps to the viewport edge when the card is wider than the space on both sides', () => {
    withCardSize()
    vi.stubGlobal('innerWidth', 320)
    vi.stubGlobal('innerHeight', 240)

    renderAt(300, 230)

    // Flipping left would put it at -14, so it clamps to the 8px margin.
    // Vertically it flips to 230 - 14 - 200 = 16, which still fits.
    expect(screen.getByTestId('card')).toHaveStyle({ left: '8px', top: '16px' })
  })
})
