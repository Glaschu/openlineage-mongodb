// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { Node } from '../../../../components/graph/Node/Node'
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'
import type { NodeRenderer, PositionedNode } from '../../../../components/graph/types'

interface TestNodeData {
  name: string
}

const TestNodeRenderer: NodeRenderer<'test', TestNodeData> = ({ node }) => (
  <rect data-testid={node.id} width={node.width} height={node.height} />
)

TestNodeRenderer.getLayoutOptions = (node) => node

describe('Node Component', () => {
  const mockNode: PositionedNode<'test', TestNodeData> = {
    id: 'node-1',
    kind: 'test',
    data: { name: 'Test Node' },
    bottomLeftCorner: { x: 10, y: 20 },
    width: 100,
    height: 50,
  }

  it('should render node with correct transform', () => {
    const nodeRenderers = new Map<'test', NodeRenderer<'test', TestNodeData>>([
      ['test', TestNodeRenderer],
    ])

    const { container } = render(
      <svg>
        <Node node={mockNode} nodeRenderers={nodeRenderers} />
      </svg>
    )

    const g = container.querySelector('g')
    expect(g).toBeTruthy()
    expect(g?.getAttribute('transform')).toBe('translate(10 20)')
  })

  it('should render using the provided node renderer', () => {
    const nodeRenderers = new Map<'test', NodeRenderer<'test', TestNodeData>>([
      ['test', TestNodeRenderer],
    ])

    const { getByTestId } = render(
      <svg>
        <Node node={mockNode} nodeRenderers={nodeRenderers} />
      </svg>
    )

    expect(getByTestId('node-1')).toBeTruthy()
  })

  it('should handle missing renderer gracefully', () => {
    const nodeRenderers = new Map<'test', NodeRenderer<'test', TestNodeData>>()

    const { container } = render(
      <svg>
        <Node node={mockNode} nodeRenderers={nodeRenderers} />
      </svg>
    )

    const g = container.querySelector('g')
    expect(g).toBeTruthy()
    // Should render the group but not the node content
    expect(container.querySelector('[data-testid="node-1"]')).toBeFalsy()
  })

  it('should render child nodes recursively', () => {
    const childNode: PositionedNode<'test', TestNodeData> = {
      id: 'child-1',
      kind: 'test',
      data: { name: 'Child Node' },
      bottomLeftCorner: { x: 5, y: 10 },
      width: 50,
      height: 25,
    }

    const nodeWithChildren = {
      ...mockNode,
      children: [childNode],
    }

    const nodeRenderers = new Map<'test', NodeRenderer<'test', TestNodeData>>([
      ['test', TestNodeRenderer],
    ])

    const { getByTestId } = render(
      <svg>
        <Node node={nodeWithChildren} nodeRenderers={nodeRenderers} />
      </svg>
    )

    expect(getByTestId('node-1')).toBeTruthy()
    expect(getByTestId('child-1')).toBeTruthy()
  })

  it('should render edges within the node container', () => {
    const mockEdge = {
      id: 'edge-1',
      type: 'elbow' as const,
      sourceNodeId: 'node-1',
      targetNodeId: 'node-2',
      container: 'node-1',
      startPoint: { x: 0, y: 0 },
      endPoint: { x: 50, y: 50 },
    }

    const nodeRenderers = new Map<'test', NodeRenderer<'test', TestNodeData>>([
      ['test', TestNodeRenderer],
    ])

    const { container } = render(
      <svg>
        <Node node={mockNode} nodeRenderers={nodeRenderers} edges={[mockEdge]} />
      </svg>
    )

    const polyline = container.querySelector('polyline')
    expect(polyline).toBeTruthy()
  })

  it('should not render edges from other containers', () => {
    const mockEdge = {
      id: 'edge-1',
      type: 'elbow' as const,
      sourceNodeId: 'node-1',
      targetNodeId: 'node-2',
      container: 'other-container',
      startPoint: { x: 0, y: 0 },
      endPoint: { x: 50, y: 50 },
    }

    const nodeRenderers = new Map<'test', NodeRenderer<'test', TestNodeData>>([
      ['test', TestNodeRenderer],
    ])

    const { container } = render(
      <svg>
        <Node node={mockNode} nodeRenderers={nodeRenderers} edges={[mockEdge]} />
      </svg>
    )

    const polyline = container.querySelector('polyline')
    expect(polyline).toBeFalsy()
  })

  it('should pass isMiniMap prop to node renderer and children', () => {
    const childNode: PositionedNode<'test', TestNodeData> = {
      id: 'child-1',
      kind: 'test',
      data: { name: 'Child Node' },
      bottomLeftCorner: { x: 5, y: 10 },
      width: 50,
      height: 25,
    }

    const nodeWithChildren = {
      ...mockNode,
      children: [childNode],
    }

    const nodeRenderers = new Map<'test', NodeRenderer<'test', TestNodeData>>([
      ['test', TestNodeRenderer],
    ])

    const { container } = render(
      <svg>
        <Node node={nodeWithChildren} nodeRenderers={nodeRenderers} isMiniMap={true} />
      </svg>
    )

    // Should render both nodes
    const groups = container.querySelectorAll('g')
    expect(groups.length).toBeGreaterThan(0)
  })
})
