import React from 'react'

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'

import { useLayout } from '../layout/useLayout'
import type { Edge, Node } from '../types'

const layoutResponses: Array<
  | { type: 'resolve'; value: any }
  | { type: 'reject'; value: any }
  | { type: 'pending'; promise: Promise<any> }
> = []
const layoutInputs: any[] = []

vi.mock('elkjs/lib/elk-worker.min.js?url', () => ({
  __esModule: true,
  default: 'worker-url',
}))

class WorkerMock {
  constructor(public url: string, public options?: any) {}
  terminate() {}
}

beforeAll(() => {
  vi.stubGlobal('Worker', WorkerMock as any)
})

afterAll(() => {
  vi.unstubAllGlobals()
})

vi.mock('elkjs', () => ({
  __esModule: true,
  default: class {
    worker: boolean
    terminateWorker: () => void
    constructor() {
      this.worker = true
      this.terminateWorker = vi.fn()
    }
    layout(input: any) {
      layoutInputs.push(input)
      const response = layoutResponses.shift()
      if (!response) return Promise.resolve({})
      if (response.type === 'resolve') return Promise.resolve(response.value)
      if (response.type === 'reject') return Promise.reject(response.value)
      return response.promise
    }
  },
}))

const nodes: Node<string, { value: string }>[] = [
  {
    id: 'root-node',
    kind: 'root',
    data: { value: 'root' },
    children: [
      {
        id: 'child-node',
        kind: 'child',
        data: { value: 'child' },
      },
    ],
  },
]

const edges: Edge[] = [
  {
    id: 'edge-1',
    sourceNodeId: 'root-node',
    targetNodeId: 'child-node',
  },
]

interface LayoutHarnessProps {
  cfg: Parameters<typeof useLayout>[0]
  onUpdate: (result: ReturnType<typeof useLayout>) => void
}

const LayoutHarness = ({ cfg, onUpdate }: LayoutHarnessProps) => {
  const result = useLayout(cfg)
  onUpdate(result)
  return null
}

describe('useLayout hook', () => {
  beforeEach(() => {
    layoutResponses.length = 0
    layoutInputs.length = 0
  })

  it('positions nodes and edges based on ELK output', async () => {
    const getLayoutOptions = vi.fn((node: Node<string, { value: string }>) => node)

    layoutResponses.push({
      type: 'resolve',
      value: {
        id: 'root',
        width: 400,
        height: 300,
        children: [
          {
            id: 'root-node',
            x: 10,
            y: 20,
            width: 100,
            height: 80,
            children: [
              {
                id: 'child-node',
                x: 15,
                y: 25,
                width: 40,
                height: 30,
              },
            ],
          },
        ],
        edges: [
          {
            id: 'edge-1',
            container: 'root-node',
            sections: [
              {
                startPoint: { x: 1, y: 2 },
                bendPoints: [{ x: 3, y: 4 }],
                endPoint: { x: 5, y: 6 },
              },
            ],
            labels: [
              {
                id: 'lbl',
                text: 'Edge Label',
                x: 7,
                y: 8,
                height: 10,
                width: 20,
              },
            ],
          },
        ],
      },
    })

    const updates: ReturnType<typeof useLayout>[] = []

    render(
      <LayoutHarness
        cfg={{ id: 'graph', nodes, edges, direction: 'right', getLayoutOptions }}
        onUpdate={(result) => updates.push(result)}
      />
    )

    await waitFor(() => expect(updates.at(-1)?.layout).toBeDefined())

    const final = updates.at(-1)
    expect(getLayoutOptions).toHaveBeenCalledTimes(2)
    expect(final?.isRendering).toBe(false)
    expect(final?.layout?.width).toBe(400)
    expect(layoutInputs[0].layoutOptions['elk.direction']).toBe('RIGHT')
    const rootNode = final?.layout?.nodes.find((node) => node.id === 'root-node')
    expect(rootNode?.bottomLeftCorner).toEqual({ x: 10, y: 20 })
    expect(rootNode?.children?.[0].bottomLeftCorner).toEqual({ x: 15, y: 25 })
    const edge = final?.layout?.edges[0]
    expect(edge?.startPoint).toEqual({ x: 1, y: 2 })
    expect(edge?.bendPoints?.[0]).toEqual({ x: 3, y: 4 })
    expect(edge?.label?.text).toBe('Edge Label')
  })

  it('keeps previous layout while new layout renders when keepPreviousGraph is true', async () => {
    let resolvePending: (value: any) => void = () => {}
    const pendingPromise = new Promise((resolve) => {
      resolvePending = resolve
    })

    layoutResponses.push({
      type: 'resolve',
      value: {
        id: 'root',
        width: 200,
        height: 100,
        children: [
          {
            id: 'root-node',
            x: 5,
            y: 10,
            width: 50,
            height: 40,
          },
        ],
        edges: [],
      },
    })
    layoutResponses.push({ type: 'pending', promise: pendingPromise })

    const updates: ReturnType<typeof useLayout>[] = []

    const { rerender } = render(
      <LayoutHarness
        cfg={{ id: 'graph', nodes, edges, keepPreviousGraph: true }}
        onUpdate={(result) => updates.push(result)}
      />
    )

    await waitFor(() => expect(updates.at(-1)?.layout?.width).toBe(200))

    const newNodes = [...nodes]
    rerender(
      <LayoutHarness
        cfg={{ id: 'graph', nodes: newNodes, edges, keepPreviousGraph: true, direction: 'left' }}
        onUpdate={(result) => updates.push(result)}
      />
    )

    expect(updates.at(-1)?.layout?.width).toBe(200)
    expect(updates.at(-1)?.isRendering).toBe(true)
    resolvePending({
      id: 'root',
      width: 260,
      height: 180,
      children: [
        {
          id: 'root-node',
          x: 12,
          y: 22,
          width: 70,
          height: 60,
        },
      ],
      edges: [],
    })

    await waitFor(() => expect(updates.at(-1)?.layout?.width).toBe(260))
    expect(layoutInputs).toHaveLength(2)
    expect(layoutInputs[1].layoutOptions['elk.direction']).toBe('LEFT')
  })

  it('captures errors from ELK layout', async () => {
    const error = new Error('layout failed')
    layoutResponses.push({ type: 'reject', value: error })

    const updates: ReturnType<typeof useLayout>[] = []

    render(
      <LayoutHarness
        cfg={{ id: 'graph', nodes, edges, direction: 'left' }}
        onUpdate={(result) => updates.push(result)}
      />
    )

    await waitFor(() => expect(updates.at(-1)?.error).toBe(error))
    expect(updates.at(-1)?.layout).toEqual({ nodes: [], edges: [], height: 0, width: 0 })
    expect(updates.at(-1)?.isRendering).toBe(false)
  })
})
