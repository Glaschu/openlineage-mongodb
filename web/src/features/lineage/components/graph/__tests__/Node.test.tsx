import React from 'react'

import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { Node } from '../Node/Node'
import type { NodeRenderer, PositionedEdge, PositionedNode } from '../types'

vi.mock('../Edge', () => ({
  Edge: ({ edge, isMiniMap }: { edge: PositionedEdge; isMiniMap?: boolean }) => (
    <div data-testid={`edge-${edge.id}`} data-minimap={String(Boolean(isMiniMap))} />
  ),
}))

const createRenderer = (label: string): NodeRenderer<string, { label: string }> => {
  const Renderer = (({ node }: { node: PositionedNode<string, { label: string }> }) => (
    <div data-testid={`renderer-${label}-${node.id}`}>{node.data.label}</div>
  )) as NodeRenderer<string, { label: string }>
  Renderer.getLayoutOptions = (node) => node
  return Renderer
}

describe('Node component', () => {
  it('renders renderer, children, and container edges', () => {
    const rootNode: PositionedNode<string, { label: string }> = {
      id: 'root-node',
      kind: 'root',
      bottomLeftCorner: { x: 10, y: 20 },
      width: 100,
      height: 60,
      data: { label: 'root' },
      children: [
        {
          id: 'child-node',
          kind: 'child',
          bottomLeftCorner: { x: 5, y: 10 },
          width: 40,
          height: 30,
          data: { label: 'child' },
        },
      ],
    }

    const edges: PositionedEdge[] = [
      {
        id: 'edge-a',
        sourceNodeId: 'root-node',
        targetNodeId: 'child-node',
        container: 'root-node',
        startPoint: { x: 0, y: 0 },
        endPoint: { x: 10, y: 10 },
        isAnimated: false,
      },
      {
        id: 'edge-b',
        sourceNodeId: 'child-node',
        targetNodeId: 'other',
        container: 'other',
        startPoint: { x: 1, y: 1 },
        endPoint: { x: 2, y: 2 },
        isAnimated: false,
      },
    ]

    const renderers = new Map<string, NodeRenderer<string, { label: string }>>([
      ['root', createRenderer('root')],
      ['child', createRenderer('child')],
    ])

    render(<Node node={rootNode} nodeRenderers={renderers} edges={edges} isMiniMap />)

    expect(screen.getByTestId('renderer-root-root-node')).toHaveTextContent('root')
    expect(screen.getByTestId('renderer-child-child-node')).toHaveTextContent('child')
    const edge = screen.getByTestId('edge-edge-a')
    expect(edge).toBeInTheDocument()
    expect(edge).toHaveAttribute('data-minimap', 'true')
    expect(screen.queryByTestId('edge-edge-b')).toBeNull()
  })

  it('renders nothing when renderer is missing', () => {
    const node: PositionedNode<string, { label: string }> = {
      id: 'missing',
      kind: 'unknown',
      bottomLeftCorner: { x: 0, y: 0 },
      width: 10,
      height: 10,
      data: { label: 'skip' },
    }

    const { container } = render(<Node node={node} nodeRenderers={new Map()} edges={[]} />)

    expect(container.querySelector('g')?.textContent).toBe('')
  })
})
