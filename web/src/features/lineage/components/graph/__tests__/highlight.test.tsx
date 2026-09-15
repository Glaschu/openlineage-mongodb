// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

import {
  DIMMED_OPACITY,
  GraphHighlight,
  GraphHighlightContext,
  isDimmed,
  useGraphHighlight,
} from '../highlight'

const highlight: GraphHighlight = {
  nodeIds: new Set(['a', 'b']),
  edgeIds: new Set(['a:b']),
}

describe('graph highlight', () => {
  it('dims nothing when no subgraph is focused', () => {
    expect(isDimmed(null, 'anything', 'node')).toBe(false)
    expect(isDimmed(null, 'a:b', 'edge')).toBe(false)
  })

  it('keeps the focused subgraph and dims everything else', () => {
    expect(isDimmed(highlight, 'a', 'node')).toBe(false)
    expect(isDimmed(highlight, 'b', 'node')).toBe(false)
    expect(isDimmed(highlight, 'c', 'node')).toBe(true)
  })

  it('tracks node and edge membership separately', () => {
    // An id present among nodes must not exempt an edge, and vice versa.
    expect(isDimmed(highlight, 'a:b', 'node')).toBe(true)
    expect(isDimmed(highlight, 'a', 'edge')).toBe(true)
    expect(isDimmed(highlight, 'a:b', 'edge')).toBe(false)
  })

  it('exposes the focused subgraph through context', () => {
    const Probe = () => {
      const value = useGraphHighlight()
      return <span data-testid='probe'>{value ? [...value.nodeIds].join(',') : 'none'}</span>
    }

    render(<Probe />)
    expect(screen.getByTestId('probe')).toHaveTextContent('none')

    render(
      <GraphHighlightContext.Provider value={highlight}>
        <Probe />
      </GraphHighlightContext.Provider>
    )
    expect(screen.getAllByTestId('probe')[1]).toHaveTextContent('a,b')
  })

  it('dims to a visible but clearly receded opacity', () => {
    expect(DIMMED_OPACITY).toBeGreaterThan(0)
    expect(DIMMED_OPACITY).toBeLessThan(0.5)
  })
})
