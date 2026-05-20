import { describe, expect, it, vi } from 'vitest'

function createTransform(k = 1, x = 0, y = 0) {
  return {
    k,
    x,
    y,
    translate(dx: number, dy: number) {
      return createTransform(k, x + dx, y + dy)
    },
    scale(nextK: number) {
      return createTransform(nextK, x, y)
    },
    invert([px, py]: [number, number]) {
      return [(px - x) / k, (py - y) / k]
    },
    toString() {
      return `matrix(${k},0,0,${k},${x},${y})`
    },
  }
}

vi.mock('d3-zoom', () => ({
  __esModule: true,
  zoomIdentity: createTransform(),
  zoom: () => ({
    scaleExtent() {
      return this
    },
    translateExtent() {
      return this
    },
    on() {
      return this
    },
    call() {
      return this
    },
    transform: () => undefined,
    constrain() {
      return (transform: any) => transform
    },
  }),
}))

import {
  centerItemInContainer,
  constrainZoomToExtent,
  createZoomTransform,
  extentToRect,
  maxExtent,
  padExtent,
  scaleToContainer,
} from '../utils/zoom'

describe('zoom utilities', () => {
  it('converts extents and applies padding', () => {
    const extent: [[number, number], [number, number]] = [
      [0, 0],
      [10, 20],
    ]
    expect(extentToRect(extent)).toEqual({ x: 0, y: 0, width: 10, height: 20 })
    expect(padExtent(extent, 2)).toEqual([
      [-2, -2],
      [12, 22],
    ])
    expect(padExtent(extent, 1, 3)).toEqual([
      [-1, -3],
      [11, 23],
    ])
    expect(
      maxExtent(extent, [
        [-5, -5],
        [5, 5],
      ])
    ).toEqual([
      [-5, -5],
      [10, 20],
    ])
  })

  it('creates zoom transforms and scales to container', () => {
    const transform = createZoomTransform(1.5, 10, -5)
    expect(transform.k).toBe(1.5)
    expect(transform.x).toBe(10)
    expect(transform.y).toBe(-5)

    const scale = scaleToContainer(
      [
        [0, 0],
        [50, 50],
      ],
      [
        [0, 0],
        [100, 40],
      ]
    )
    expect(scale).toBeCloseTo(0.8)

    const centered = centerItemInContainer(
      1.2,
      [
        [0, 0],
        [20, 20],
      ],
      [
        [0, 0],
        [100, 100],
      ]
    )
    expect(centered.k).toBe(1.2)
  })

  it('constrains zoom transforms to fit content', () => {
    const transform = createZoomTransform(0.1, -50, -50)
    const containerExtent: [[number, number], [number, number]] = [
      [0, 0],
      [100, 100],
    ]
    const contentExtent: [[number, number], [number, number]] = [
      [0, 0],
      [200, 200],
    ]
    const constrained = constrainZoomToExtent(transform, containerExtent, contentExtent)
    expect(constrained.k).toBeCloseTo(0.5)
    expect(Number.isFinite(constrained.x)).toBe(true)
    expect(Number.isFinite(constrained.y)).toBe(true)
  })
})
