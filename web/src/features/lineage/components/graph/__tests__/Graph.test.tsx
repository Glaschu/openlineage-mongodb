import React from 'react'

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

import { Graph } from '../Graph'
import { MiniMapPlacement } from '../ZoomPanSvg/MiniMap'
import type { Edge, NodeRenderer, PositionedEdge, PositionedNode } from '../types'

vi.mock('reactflow/dist/style.css', () => ({}))

const useMediaQueryMock = vi.hoisted(() => vi.fn().mockReturnValue(false))
vi.mock('@mui/material/useMediaQuery', () => ({ default: useMediaQueryMock }))

let latestReactFlowProps: any
const fitView = vi.fn()
const fitBounds = vi.fn()
const setViewport = vi.fn()
const getZoom = vi.fn(() => 1)
const project = vi.fn((point: { x: number; y: number }) => point)
let storeTransform: [number, number, number] = [0, 0, 1.2]

vi.mock('reactflow', () => {
  const React = require('react')
  const ReactFlow = ({ children, ...props }: any) => {
    latestReactFlowProps = props
    return (
      <div data-testid='reactflow'>
        <div data-testid='reactflow-props'>
          {JSON.stringify({ nodes: props.nodes, edges: props.edges })}
        </div>
        {props.children}
      </div>
    )
  }

  const Handle = ({ children, ...rest }: any) => (
    <div data-testid={`handle-${rest.position}`}>{children}</div>
  )

  return {
    __esModule: true,
    default: ReactFlow,
    ReactFlow,
    Background: ({ children, ...props }: any) => (
      <div data-testid='reactflow-background' data-props={JSON.stringify(props)}>
        {children}
      </div>
    ),
    BackgroundVariant: { Dots: 'dots' },
    ConnectionMode: { Loose: 'loose' },
    Edge: (props: any) => <div {...props} />, // not used directly but keeps type happy
    Handle,
    Node: (props: any) => <div {...props} />, // type placeholder
    Position: { Left: 'left', Right: 'right' },
    ReactFlowProvider: ({ children }: any) => (
      <div data-testid='reactflow-provider'>{children}</div>
    ),
    useReactFlow: () => ({
      fitView,
      fitBounds,
      setViewport,
      getZoom,
      project,
      getZoomPanHelper: () => ({ fitView, project }),
    }),
    useStore: (selector: any) => selector({ transform: storeTransform }),
  }
})

let measuredSize: [number, number] = [640, 480]
vi.mock('@react-hook/size', () => ({
  __esModule: true,
  default: () => measuredSize,
}))

interface LayoutResult {
  layout?: {
    nodes: PositionedNode<string, { label: string }>[]
    edges: PositionedEdge[]
    width: number
    height: number
  }
  error?: Error
  isRendering: boolean
}

let layoutResult: LayoutResult
const useLayoutMock = vi.hoisted(() => vi.fn((args?: any) => layoutResult))
vi.mock('../layout/useLayout', () => ({
  useLayout: useLayoutMock,
}))

beforeAll(() => {
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0)
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', () => {})
})

afterAll(() => {
  vi.unstubAllGlobals()
})

const createRenderer = (idPrefix: string): NodeRenderer<string, { label: string }> => {
  const Renderer = (({ node }: { node: PositionedNode<string, { label: string }> }) => (
    <div data-testid={`renderer-${idPrefix}-${node.id}`}>{node.data.label}</div>
  )) as NodeRenderer<string, { label: string }>
  Renderer.getLayoutOptions = (node) => node
  return Renderer
}

const baseNodes: PositionedNode<string, { label: string }>[] = [
  {
    id: 'parent',
    kind: 'container',
    bottomLeftCorner: { x: 10, y: 20 },
    width: 120,
    height: 90,
    data: { label: 'parent' },
    children: [
      {
        id: 'child',
        kind: 'task',
        bottomLeftCorner: { x: 15, y: 25 },
        width: 60,
        height: 40,
        data: { label: 'child' },
      },
    ],
  },
]

const baseEdges: PositionedEdge[] = [
  {
    id: 'edge-1',
    type: 'elbow',
    sourceNodeId: 'child',
    targetNodeId: 'parent',
    container: 'parent',
    startPoint: { x: 5, y: 10 },
    endPoint: { x: 15, y: 20 },
    bendPoints: [{ x: 7, y: 12 }],
    isAnimated: true,
  },
  {
    id: 'edge-2',
    type: 'straight',
    sourceNodeId: 'parent',
    targetNodeId: 'child',
    container: 'root',
    startPoint: { x: 10, y: 30 },
    endPoint: { x: 20, y: 40 },
    isAnimated: false,
  },
]

const renderGraph = (overrides: Partial<React.ComponentProps<typeof Graph>> = {}) => {
  const rendererA = createRenderer('A')
  const rendererB = createRenderer('B')
  const nodeRenderers = new Map<string, NodeRenderer<string, { label: string }>>([
    ['container', rendererA],
    ['task', rendererB],
  ])

  const nodesProp = baseNodes.map((node) => ({
    id: node.id,
    kind: node.kind,
    data: node.data,
    children: node.children?.map((child) => ({
      id: child.id,
      kind: child.kind,
      data: child.data,
    })),
  }))

  const edgesProp: Edge[] = baseEdges.map((edge) => ({
    id: edge.id,
    type: edge.type,
    sourceNodeId: edge.sourceNodeId,
    targetNodeId: edge.targetNodeId,
  }))

  const props: React.ComponentProps<typeof Graph> = {
    id: 'test-graph',
    nodes: nodesProp,
    edges: edgesProp,
    nodeRenderers,
    width: 800,
    height: 600,
    direction: 'right',
    setZoomPanControls: () => {},
    ...overrides,
  }

  return render(<Graph {...props} />)
}

beforeEach(() => {
  measuredSize = [640, 480]
  storeTransform = [0, 0, 1.2]
  layoutResult = {
    layout: {
      nodes: baseNodes,
      edges: baseEdges,
      width: 400,
      height: 300,
    },
    error: undefined,
    isRendering: false,
  }
  latestReactFlowProps = undefined
  fitView.mockClear()
  fitBounds.mockClear()
  setViewport.mockClear()
  getZoom.mockClear()
  project.mockClear()
  useLayoutMock.mockClear()
})

describe('Graph', () => {
  it('renders layout, adjusts edges, and wires zoom controls', async () => {
    let capturedControls: any
    renderGraph({
      setZoomPanControls: (controls) => {
        capturedControls = controls
      },
    })

    await waitFor(() => expect(fitView).toHaveBeenCalled())
    expect(latestReactFlowProps.nodes).toHaveLength(2)
    expect(latestReactFlowProps.edges).toHaveLength(2)

    const firstEdge = latestReactFlowProps.edges[0]
    expect(firstEdge.data.positionedEdge.startPoint).toEqual({ x: 15, y: 30 })
    expect(firstEdge.data.positionedEdge.endPoint).toEqual({ x: 25, y: 40 })
    expect(firstEdge.animated).toBe(true)

    expect(screen.getByTestId('reactflow')).toBeInTheDocument()
    expect(typeof latestReactFlowProps.nodeTypes.graphNode).toBe('function')
    expect(typeof latestReactFlowProps.edgeTypes.graphEdge).toBe('function')

    latestReactFlowProps.onMove?.()

    expect(typeof capturedControls.fitContent).toBe('function')

    fitView.mockClear()
    capturedControls.fitContent()
    expect(fitView).toHaveBeenCalledWith({ padding: 0, duration: 250 })

    fitBounds.mockClear()
    capturedControls.fitExtent(
      [
        [0, 0],
        [10, 20],
      ],
      true
    )
    expect(fitBounds).toHaveBeenCalledWith(
      { x: 0, y: 0, width: 10, height: 20 },
      { padding: 0, duration: 250 }
    )

    setViewport.mockClear()
    capturedControls.centerOnExtent(
      [
        [5, 5],
        [15, 15],
      ],
      1.5
    )
    expect(setViewport).toHaveBeenCalledTimes(1)

    setViewport.mockClear()
    project.mockImplementation(({ x, y }) => ({ x, y }))
    getZoom.mockReturnValue(1.25)
    capturedControls.scaleZoom(2)
    expect(project).toHaveBeenCalledWith({ x: 400, y: 300 })
    expect(setViewport).toHaveBeenCalledTimes(1)

    setViewport.mockClear()
    capturedControls.resetZoom()
    expect(setViewport).toHaveBeenCalledWith({ x: 0, y: 0, zoom: 1 })

    setViewport.mockClear()
    capturedControls.centerOnPositionedNode('child', 1.1)
    expect(setViewport).toHaveBeenCalledTimes(1)
  })

  it('falls back to measured size when props are undefined', async () => {
    measuredSize = [500, 350]
    renderGraph({ width: undefined, height: undefined })
    await waitFor(() => expect(fitView).toHaveBeenCalled())
    expect(useLayoutMock).toHaveBeenCalledWith(
      expect.objectContaining({
        nodes: expect.any(Array),
        edges: expect.any(Array),
        direction: 'right',
      })
    )
  })

  it('shows loading indicator and empty message', () => {
    layoutResult = {
      layout: {
        nodes: [],
        edges: [],
        width: 0,
        height: 0,
      },
      isRendering: true,
    }

    renderGraph({ emptyMessage: 'No data' })

    expect(screen.getByRole('progressbar')).toBeInTheDocument()
    expect(screen.getByText('No data')).toBeInTheDocument()
  })

  it('logs errors from layout hook', () => {
    const error = new Error('layout failed')
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    layoutResult = {
      layout: {
        nodes: baseNodes,
        edges: baseEdges,
        width: 400,
        height: 300,
      },
      isRendering: false,
      error,
    }

    renderGraph()

    expect(spy).toHaveBeenCalledWith(error)
    spy.mockRestore()
  })

  it('omits minimap when disabled or zoom transform invalid', () => {
    layoutResult = {
      layout: {
        nodes: baseNodes,
        edges: baseEdges,
        width: 400,
        height: 300,
      },
      isRendering: false,
    }

    const { rerender, container } = renderGraph({ miniMapPlacement: MiniMapPlacement.None })
    expect(container.querySelector('mask#miniMapMask')).toBeNull()

    layoutResult = {
      layout: {
        nodes: baseNodes,
        edges: baseEdges,
        width: 0,
        height: 0,
      },
      isRendering: false,
    }

    rerender(
      <Graph
        id='test-graph'
        nodes={[]}
        edges={[]}
        nodeRenderers={new Map()}
        width={800}
        height={600}
        setZoomPanControls={() => {}}
      />
    )

    expect(container.querySelector('mask#miniMapMask')).toBeNull()
  })

  it('disables zooming interactions when requested', async () => {
    renderGraph({ disableZoomPan: true })
    await waitFor(() => expect(fitView).toHaveBeenCalled())

    expect(latestReactFlowProps.zoomOnScroll).toBe(false)
    expect(latestReactFlowProps.zoomOnPinch).toBe(false)
    expect(latestReactFlowProps.panOnDrag).toBe(false)
  })
})
