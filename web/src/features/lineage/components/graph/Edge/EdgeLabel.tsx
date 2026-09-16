import React from 'react'

import { EDGE_LABEL_FONT_SIZE, EDGE_LABEL_HEIGHT } from '../layout/useLayout'
import { grey } from '@mui/material/colors'
import { useTheme } from '@mui/material/styles'
import type { ElkLabel } from 'elkjs'

interface Props {
  label?: ElkLabel
}

const PADDING_X = 4

export const EdgeLabel = ({ label }: Props) => {
  const theme = useTheme()
  const labelColor = grey['400']

  if (!label || !label.y || !label.x) return null

  // ELK places labels itself, and now that it is told their real size it does
  // so without collisions — parallel edges that used to stack their labels 18px
  // apart are now 53px apart. It centres them on the edge though, so the line
  // would strike through the text without a plate behind it.
  const width = label.width ?? label.text?.length ?? 0
  const height = label.height ?? EDGE_LABEL_HEIGHT

  return (
    <g>
      <rect
        x={label.x - PADDING_X}
        y={label.y - height + 4}
        width={width + PADDING_X * 2}
        height={height}
        rx={3}
        fill={theme.palette.background.default}
      />
      <text fill={labelColor} x={label.x} y={label.y} fontSize={EDGE_LABEL_FONT_SIZE}>
        {label.text}
      </text>
    </g>
  )
}
