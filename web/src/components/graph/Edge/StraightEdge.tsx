import React from 'react'

import { keyframes } from '@emotion/react'
import useMediaQuery from '@mui/material/useMediaQuery'

import { EdgeLabel } from './EdgeLabel'
import { grey } from '@mui/material/colors'
import type { EdgeProps } from './Edge'

const marchingAnts = keyframes({ from: { strokeDashoffset: 60 }, to: { strokeDashoffset: 0 } })

export const StraightEdge = ({ edge, isMiniMap }: EdgeProps) => {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const reducedMotion = prefersReducedMotion || isMiniMap // do not animate the minimap
  const color = grey['600']

  return (
    <>
      <line
        id={`${edge.sourceNodeId}-${edge.targetNodeId}`}
        fill='none'
        stroke={edge.color || color}
        strokeWidth={edge.strokeWidth || 2}
        strokeLinejoin='round'
        x1={edge.startPoint.x}
        y1={edge.startPoint.y}
        x2={edge.endPoint.x}
        y2={edge.endPoint.y}
      />
      <EdgeLabel label={edge.label} endPointY={edge.endPoint.y} />
      {!reducedMotion && edge.isAnimated && (
        <line
          id={`${edge.sourceNodeId}-${edge.targetNodeId}-animated`}
          fill='none'
          strokeLinecap='round'
          stroke={edge.color || color}
          strokeWidth={edge.strokeWidth || 5}
          strokeLinejoin='round'
          strokeDasharray='0px 60px'
          x1={edge.startPoint.x}
          y1={edge.startPoint.y}
          x2={edge.endPoint.x}
          y2={edge.endPoint.y}
          style={{ animation: `${marchingAnts} infinite 2s linear` }}
        />
      )}
    </>
  )
}
