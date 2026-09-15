import React from 'react'

import { ThemeProvider, createTheme } from '@mui/material/styles'
import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { MiniMapPlacement } from '../ZoomPanSvg/MiniMap'
import { ZoomPanSvg, clamp, getNodeExtent } from '../ZoomPanSvg/ZoomPanSvg'
import type { PositionedNode } from '../types'

const hoistedMocks = vi.hoisted(() => ({
  mockUseD3Selection: vi.fn(),
}))

vi.mock('../utils/useD3Selection', () => ({
  useD3Selection: hoistedMocks.mockUseD3Selection,
}))

interface SelectionMock {
  handlers: Map<string, (event?: any) => void>
  attr: ReturnType<typeof vi.fn>
  call: ReturnType<typeof vi.fn>
  transition: ReturnType<typeof vi.fn>
  on: ReturnType<typeof vi.fn>
  transitionChains: Array<{
    duration: ReturnType<typeof vi.fn>
    attr: ReturnType<typeof vi.fn>
    call: ReturnType<typeof vi.fn>
  }>
}

const createSelectionMock = (): SelectionMock => {
  const handlers = new Map<string, (event?: any) => void>()

  const selection: SelectionMock = {
    handlers,
    attr: vi.fn().mockReturnThis(),
    call: vi.fn(),
    transition: vi.fn(),
    on: vi.fn(),
    transitionChains: [],
  }

  selection.on.mockImplementation((event: string, handler: (event?: any) => void) => {
    if (handler) {
      handlers.set(event, handler)
    }
    return selection
  })

  selection.call.mockImplementation((fn: any, ...args: any[]) => {
    if (typeof fn === 'function') {
      fn(selection, ...args)
    }
    return selection
  })

  selection.transition.mockImplementation(() => {
    const chain = {
      duration: vi.fn().mockImplementation(() => chain),
      attr: vi.fn().mockImplementation(() => chain),
      call: vi.fn().mockImplementation(() => chain),
    }
    selection.transitionChains.push(chain)
    return chain
  })

  return selection
}

let svgSelection: SelectionMock
let zoomSelection: SelectionMock

let selectionCallIndex = 0

const resetSelections = () => {
  svgSelection = createSelectionMock()
  zoomSelection = createSelectionMock()
  selectionCallIndex = 0
  hoistedMocks.mockUseD3Selection.mockReset()
  hoistedMocks.mockUseD3Selection.mockImplementation(() => {
    const selection = selectionCallIndex % 2 === 0 ? svgSelection : zoomSelection
    selectionCallIndex += 1
    return selection
  })
}

vi.mock('d3-zoom', () => {
  const createTransform = (k = 1, x = 0, y = 0) => ({
    k,
    x,
    y,
    translate(tx: number, ty: number) {
      return createTransform(k, x + tx, y + ty)
    },
    scale(scaleFactor: number) {
      return createTransform(k * scaleFactor, x, y)
    },
    invert([px, py]: [number, number]) {
      return [(px - x) / k, (py - y) / k]
    },
    toString: () => `matrix(${k},0,0,${k},${x},${y})`,
  })

  let lastHandlers: Record<string, (event: any) => void> = {}
  let lastBehavior: any
  const handlersHistory: Record<string, (event: any) => void>[] = []

  const zoom = () => {
    lastHandlers = {}
    const behavior: any = vi.fn()
    handlersHistory.push(lastHandlers)
    behavior.scaleExtent = vi.fn().mockReturnValue(behavior)
    behavior.translateExtent = vi.fn().mockReturnValue(behavior)
    behavior.on = vi.fn().mockImplementation((event: string, handler: (event: any) => void) => {
      if (handler) {
        lastHandlers[event] = handler
      }
      return behavior
    })
    behavior.call = vi.fn()
    behavior.transform = vi.fn()
    behavior.constrain = vi.fn().mockReturnValue((transform: any) => transform)
    lastBehavior = behavior
    return behavior
  }

  const zoomIdentity = createTransform()

  return {
    __esModule: true,
    zoomIdentity,
    zoom,
    __zoomTestUtils: {
      createTransform,
      getHandlers: () => lastHandlers,
      getHandlersHistory: () => handlersHistory,
      zoomIdentity,
    },
  }
})

// @ts-expect-error vitest mock augmentation
import { __zoomTestUtils } from 'd3-zoom'

const { createTransform, getHandlersHistory } = __zoomTestUtils

beforeAll(() => {
  Object.defineProperty(SVGSVGElement.prototype, 'transform', {
    configurable: true,
    value: { baseVal: {} },
  })
})

describe('ZoomPanSvg helpers', () => {
  it('clamps numbers and computes node extent', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-1, 0, 10)).toBe(0)
    const node: PositionedNode<string, unknown> = {
      id: 'n',
      kind: 'k',
      bottomLeftCorner: { x: 10, y: 20 },
      width: 30,
      height: 40,
      data: {},
    }
    expect(getNodeExtent(node)).toEqual([
      [10, 20],
      [40, 60],
    ])
  })
})

describe('ZoomPanSvg component', () => {
  const positionedNodes: PositionedNode<string, unknown>[] = [
    {
      id: 'node-1',
      kind: 'kind',
      bottomLeftCorner: { x: 10, y: 20 },
      width: 50,
      height: 30,
      data: {},
    },
  ]

  const renderComponent = (
    props: Partial<React.ComponentProps<typeof ZoomPanSvg>> = {}
  ): ReturnType<typeof render> & {
    controlsSpy: ReturnType<typeof vi.fn>
  } => {
    resetSelections()

    const defaultProps: React.ComponentProps<typeof ZoomPanSvg> = {
      containerWidth: 800,
      containerHeight: 600,
      contentWidth: 400,
      contentHeight: 300,
      containerPadding: 10,
      maxScale: 2,
      miniMapPlacement: MiniMapPlacement.BottomLeft,
      miniMapContent: <rect width={100} height={100} />,
      setZoomPanControls: () => {},
      positionedNodes,
    }

    const { setZoomPanControls, ...restProps } = props
    const controlsSpy = vi.fn()

    const renderResult = render(
      <ThemeProvider theme={createTheme()}>
        <ZoomPanSvg
          {...defaultProps}
          {...restProps}
          setZoomPanControls={(controls) => {
            controlsSpy(controls)
            setZoomPanControls?.(controls)
          }}
        >
          <g data-testid='graph-content'>Graph Content</g>
        </ZoomPanSvg>
      </ThemeProvider>
    )

    return Object.assign(renderResult, { controlsSpy })
  }

  it('renders minimap and children', () => {
    const { controlsSpy } = renderComponent()

    expect(screen.getByTestId('graph-content')).toBeInTheDocument()
    expect(document.querySelector('mask#miniMapMask')).not.toBeNull()
    expect(controlsSpy).toHaveBeenCalled()
    const controls = controlsSpy.mock.calls.at(-1)?.[0]
    expect(typeof controls.fitContent).toBe('function')
    expect(typeof controls.centerOnExtent).toBe('function')
  })

  it('omits minimap when placement is none', () => {
    renderComponent({ miniMapPlacement: MiniMapPlacement.None })
    expect(document.querySelector('mask#miniMapMask')).toBeNull()
  })

  it('disables interactions and uses auto cursor', () => {
    const { getByTestId } = renderComponent({ disabled: true })
    const svg = getByTestId('zoom-pan-svg') as unknown as SVGSVGElement
    expect(svg.style.cursor).toBe('auto')
  })

  it('hides dot grid when requested', () => {
    renderComponent({ hideDotGrid: true })
    const backgroundGroup = screen.getByTestId('zoom-pan-group')
    expect(backgroundGroup.querySelectorAll('circle')).toHaveLength(0)
  })

  it('provides zoom controls to manipulate view', async () => {
    const { controlsSpy } = renderComponent({ maxScale: 4, minScaleMinimum: 0.5 })

    const controls = controlsSpy.mock.calls.at(-1)?.[0]
    expect(controls).toBeDefined()

    await waitFor(() =>
      expect(zoomSelection.attr).toHaveBeenCalledWith('transform', expect.any(String))
    )

    const initialTransitions = zoomSelection.transitionChains.length

    await act(async () => {
      controls.fitContent()
    })

    expect(zoomSelection.transitionChains.length).toBe(initialTransitions)

    await act(async () => {
      controls.scaleZoom(1.5)
    })

    const afterScale = zoomSelection.transitionChains.length
    expect(afterScale).toBeGreaterThan(initialTransitions)
    const lastChain = zoomSelection.transitionChains.at(-1)
    expect(lastChain?.attr).toHaveBeenCalledWith('transform', expect.stringContaining('matrix'))

    await act(async () => {
      controls.scaleZoom(1)
    })

    expect(zoomSelection.transitionChains.length).toBe(afterScale)

    await act(async () => {
      controls.fitExtent([
        [0, 0],
        [10, 10],
      ])
    })

    const afterFitExtent = zoomSelection.transitionChains.length
    expect(afterFitExtent).toBeGreaterThan(afterScale)

    await act(async () => {
      controls.fitExtent(
        [
          [0, 0],
          [10, 10],
        ],
        false
      )
    })

    expect(zoomSelection.transitionChains.length).toBe(afterFitExtent)

    await act(async () => {
      controls.centerOnExtent(
        [
          [1, 1],
          [2, 2],
        ],
        0.6
      )
    })

    const afterCenterExtent = zoomSelection.transitionChains.length
    expect(afterCenterExtent).toBeGreaterThan(afterFitExtent)

    await act(async () => {
      controls.centerOnPositionedNode('node-1', 0.9)
    })

    const afterCenterNode = zoomSelection.transitionChains.length
    expect(afterCenterNode).toBeGreaterThan(afterCenterExtent)

    await act(async () => {
      controls.centerOnPositionedNode('missing')
    })

    expect(zoomSelection.transitionChains.length).toBe(afterCenterNode)

    await act(async () => {
      controls.resetZoom()
    })

    expect(zoomSelection.transitionChains.length).toBeGreaterThan(afterCenterNode)
  })

  it('applies initial extent on mount', async () => {
    renderComponent({
      maxScale: 4,
      containerWidth: 200,
      containerHeight: 150,
      initialExtent: [
        [0, 0],
        [20, 20],
      ],
    })

    await waitFor(() => expect(zoomSelection.transitionChains.length).toBeGreaterThan(0))
  })

  it('updates cursor while dragging and releasing', async () => {
    const { getByTestId } = renderComponent()

    await waitFor(() => expect(svgSelection.handlers.has('mousedown')).toBe(true))

    const svg = getByTestId('zoom-pan-svg') as unknown as SVGSVGElement
    expect(svg.style.cursor).toBe('grab')

    await act(async () => {
      svgSelection.handlers.get('mousedown')?.()
    })

    expect(svg.style.cursor).toBe('grabbing')

    const handlersHistory = getHandlersHistory()
    const zoomHandlers = handlersHistory.find(
      (entry: Record<string, (event: any) => void>) => entry.zoom
    )
    expect(zoomHandlers?.zoom).toBeDefined()
    expect(zoomHandlers?.end).toBeDefined()

    await act(async () => {
      zoomHandlers?.zoom?.({ transform: createTransform(1.2, 5, 6) })
    })

    expect(zoomSelection.attr).toHaveBeenCalledWith('transform', expect.stringContaining('matrix'))

    await act(async () => {
      zoomHandlers?.end?.()
    })
  })
})
