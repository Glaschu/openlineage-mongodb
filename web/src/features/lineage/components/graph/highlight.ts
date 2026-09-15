// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { createContext, useContext } from 'react'

/**
 * The subgraph currently under focus — everything reachable upstream and
 * downstream of the node the pointer is on. `null` means nothing is focused and
 * the whole graph renders at full strength.
 */
export interface GraphHighlight {
  nodeIds: Set<string>
  edgeIds: Set<string>
}

export const GraphHighlightContext = createContext<GraphHighlight | null>(null)

export const useGraphHighlight = () => useContext(GraphHighlightContext)

export interface HoveredEdge {
  id: string
  sourceNodeId: string
  targetNodeId: string
  /** Viewport coordinates of the pointer, for positioning a tooltip. */
  clientX: number
  clientY: number
}

/**
 * React Flow adds an `inactive` class to edges when selection is off, and its
 * stylesheet sets pointer-events: none on those, so onEdgeMouseEnter never
 * fires. The edge component therefore reports hover itself, through here.
 */
export const GraphEdgeHoverContext = createContext<((edge: HoveredEdge | null) => void) | null>(
  null
)

export const useGraphEdgeHover = () => useContext(GraphEdgeHoverContext)

/** Opacity applied to nodes and edges outside the focused subgraph. */
export const DIMMED_OPACITY = 0.15

export const isDimmed = (highlight: GraphHighlight | null, id: string, kind: 'node' | 'edge') => {
  if (!highlight) return false
  return !(kind === 'node' ? highlight.nodeIds : highlight.edgeIds).has(id)
}
