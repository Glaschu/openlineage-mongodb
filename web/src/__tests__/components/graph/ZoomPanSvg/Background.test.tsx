// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { Background } from '../../../../components/graph/ZoomPanSvg/Background'
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'

describe('Background Component', () => {
  it('should render pattern and rect elements', () => {
    const { container } = render(
      <svg>
        <Background k={1} contentWidth={500} contentHeight={400} />
      </svg>
    )

    const pattern = container.querySelector('pattern')
    const rect = container.querySelector('rect')

    expect(pattern).toBeTruthy()
    expect(rect).toBeTruthy()
    expect(pattern?.getAttribute('id')).toBe('lineage-graph-dots')
  })

  it('should render dot grid by default', () => {
    const { container } = render(
      <svg>
        <Background k={1} contentWidth={500} contentHeight={400} />
      </svg>
    )

    const circle = container.querySelector('circle')
    expect(circle).toBeTruthy()
  })

  it('should hide dot grid when hideDotGrid is true', () => {
    const { container } = render(
      <svg>
        <Background k={1} contentWidth={500} contentHeight={400} hideDotGrid={true} />
      </svg>
    )

    const circle = container.querySelector('circle')
    expect(circle).toBeFalsy()
  })

  it('should apply custom background color', () => {
    const { container } = render(
      <svg>
        <Background k={1} contentWidth={500} contentHeight={400} backgroundColor='#ffffff' />
      </svg>
    )

    const patternRect = container.querySelector('pattern rect')
    expect(patternRect?.getAttribute('fill')).toBe('#ffffff')
  })

  it('should apply custom dot grid color', () => {
    const { container } = render(
      <svg>
        <Background k={1} contentWidth={500} contentHeight={400} dotGridColor='#ff0000' />
      </svg>
    )

    const circle = container.querySelector('circle')
    expect(circle?.getAttribute('fill')).toBe('#ff0000')
  })

  it('should adjust gap based on scale factor', () => {
    const { container: container1 } = render(
      <svg>
        <Background k={1} contentWidth={500} contentHeight={400} />
      </svg>
    )

    const { container: container2 } = render(
      <svg>
        <Background k={0.5} contentWidth={500} contentHeight={400} />
      </svg>
    )

    const pattern1 = container1.querySelector('pattern')
    const pattern2 = container2.querySelector('pattern')

    // With smaller k, gap should be larger to maintain minimum threshold
    const gap1 = parseFloat(pattern1?.getAttribute('width') || '0')
    const gap2 = parseFloat(pattern2?.getAttribute('width') || '0')
    expect(gap2).toBeGreaterThan(gap1)
  })

  it('should render rect with pattern fill', () => {
    const { container } = render(
      <svg>
        <Background k={1} contentWidth={500} contentHeight={400} />
      </svg>
    )

    // There are two rects - one inside the pattern, one for the background
    const rects = container.querySelectorAll('rect')
    const backgroundRect = rects[1] // The second rect is the background
    expect(backgroundRect?.getAttribute('fill')).toBe('url(#lineage-graph-dots)')
  })

  it('should handle different content dimensions', () => {
    const { container } = render(
      <svg>
        <Background k={1} contentWidth={1000} contentHeight={200} />
      </svg>
    )

    const rects = container.querySelectorAll('rect')
    const backgroundRect = rects[1]
    expect(backgroundRect).toBeTruthy()
    // Should have width and height attributes
    expect(backgroundRect?.getAttribute('width')).toBeTruthy()
    expect(backgroundRect?.getAttribute('height')).toBeTruthy()
  })
})
