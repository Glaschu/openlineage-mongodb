import React from 'react'

import { ElbowEdge } from './ElbowEdge'
import { StraightEdge } from './StraightEdge'
import type { PositionedEdge } from '../types'

/**
 * Width of the transparent stroke drawn under each edge so it can be hovered.
 * The visible stroke is 2px, which is far too thin to point at.
 */
export const EDGE_HIT_WIDTH = 12

export interface EdgeProps {
  edge: PositionedEdge
  isMiniMap?: boolean
}

export const Edge = (props: EdgeProps) => {
  const { edge } = props
  switch (edge.type) {
    case 'straight':
      return <StraightEdge {...props} />
    default:
      return <ElbowEdge {...props} />
  }
}
