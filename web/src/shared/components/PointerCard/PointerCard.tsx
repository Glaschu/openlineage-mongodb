// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { Paper } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import React, { ReactNode, useLayoutEffect, useRef, useState } from 'react'

interface Props {
  /** Pointer position in viewport coordinates. */
  clientX: number
  clientY: number
  children: ReactNode
  maxWidth?: number
  'data-testid'?: string
}

/** Gap between the pointer and the card, so the card never sits under the cursor. */
const OFFSET = 14
/** Minimum gap from the viewport edge when the card has to flip. */
const MARGIN = 8

/**
 * A card anchored to the pointer that flips to the other side rather than
 * running off screen — hovering an edge near the right-hand edge of the canvas
 * would otherwise show a card clipped by the viewport.
 */
export const PointerCard = ({
  clientX,
  clientY,
  children,
  maxWidth = 420,
  'data-testid': testId,
}: Props) => {
  const theme = useTheme()
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ left: clientX + OFFSET, top: clientY + OFFSET })

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return

    const { width, height } = element.getBoundingClientRect()
    const overflowsRight = clientX + OFFSET + width > window.innerWidth
    const overflowsBottom = clientY + OFFSET + height > window.innerHeight

    setPosition({
      left: overflowsRight ? Math.max(MARGIN, clientX - OFFSET - width) : clientX + OFFSET,
      top: overflowsBottom ? Math.max(MARGIN, clientY - OFFSET - height) : clientY + OFFSET,
    })
  }, [clientX, clientY])

  return (
    <Paper
      ref={ref}
      data-testid={testId}
      elevation={8}
      sx={{
        position: 'fixed',
        left: position.left,
        top: position.top,
        zIndex: theme.zIndex.tooltip,
        p: 1.5,
        maxWidth,
        pointerEvents: 'none',
        backgroundColor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      {children}
    </Paper>
  )
}

export default PointerCard
