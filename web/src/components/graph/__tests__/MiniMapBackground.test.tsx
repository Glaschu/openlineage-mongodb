import React from 'react'

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { Background } from '../ZoomPanSvg/Background'
import { MiniMap, MiniMapPlacement } from '../ZoomPanSvg/MiniMap'

const createTransform = (k: number, x: number, y: number) => ({
  k,
  x,
  y,
  apply: ([px, py]: [number, number]): [number, number] => [k * px + x, k * py + y],
  applyX: (px: number) => k * px + x,
  applyY: (py: number) => k * py + y,
  invert: ([px, py]: [number, number]): [number, number] => [(px - x) / k, (py - y) / k],
  invertX: (px: number) => (px - x) / k,
  invertY: (py: number) => (py - y) / k,
  rescaleX: (scale: any) => scale,
  rescaleY: (scale: any) => scale,
  scale: (nextK: number) => createTransform(k * nextK, x, y),
  translate: (dx: number, dy: number) => createTransform(k, x + dx, y + dy),
  toString: () => `matrix(${k},0,0,${k},${x},${y})`,
})

describe('MiniMap', () => {
  it('returns null when placement is none or dimensions invalid', () => {
    const { container: noneContainer } = render(
      <MiniMap
        containerWidth={100}
        containerHeight={100}
        contentWidth={100}
        contentHeight={100}
        miniMapScale={0.2}
        zoomTransform={createTransform(1, 0, 0)}
        placement={MiniMapPlacement.None}
      >
        <g />
      </MiniMap>
    )
    expect(noneContainer.firstChild).toBeNull()

    const { container: invalidContainer } = render(
      <MiniMap
        containerWidth={0}
        containerHeight={100}
        contentWidth={100}
        contentHeight={100}
        miniMapScale={0.2}
        zoomTransform={createTransform(1, 0, 0)}
      >
        <g />
      </MiniMap>
    )
    expect(invalidContainer.firstChild).toBeNull()
  })

  it('renders mask and lens when placement is active', () => {
    render(
      <MiniMap
        containerWidth={200}
        containerHeight={120}
        contentWidth={400}
        contentHeight={240}
        miniMapScale={0.25}
        zoomTransform={createTransform(1.2, -40, -20)}
        placement={MiniMapPlacement.TopRight}
      >
        <rect width={400} height={240} />
      </MiniMap>
    )

    const mask = document.querySelector('mask#miniMapMask')
    expect(mask).not.toBeNull()
    const lens = document.querySelector('mask#miniMapMask rect + rect')
    expect(lens).not.toBeNull()
  })
})

describe('Background', () => {
  it('renders dot pattern and respects override props', () => {
    render(
      <svg>
        <Background
          k={1}
          contentWidth={200}
          contentHeight={100}
          backgroundColor='#123456'
          dotGridColor='#abcdef'
        />
      </svg>
    )

    const pattern = document.querySelector('pattern#lineage-graph-dots')
    expect(pattern).not.toBeNull()
    expect(pattern?.querySelector('rect')?.getAttribute('fill')).toBe('#123456')
    expect(pattern?.querySelector('circle')).not.toBeNull()
  })

  it('hides dot grid when requested', () => {
    render(
      <svg>
        <Background k={4} contentWidth={200} contentHeight={200} hideDotGrid />
      </svg>
    )

    const pattern = document.querySelector('pattern#lineage-graph-dots')
    expect(pattern?.querySelector('circle')).toBeNull()
  })
})
