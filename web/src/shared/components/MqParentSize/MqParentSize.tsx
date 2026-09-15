// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import React, { CSSProperties, ReactNode, useRef } from 'react'

import { ElementSize, useElementSize } from '@/shared/hooks/useElementSize'

interface Props {
  children: (size: ElementSize) => ReactNode
  style?: CSSProperties
  className?: string
}

/**
 * Fills its parent and hands its measured size to a render prop — the shape
 * @visx/responsive's ParentSize had, so charts and graphs that size themselves
 * from their container keep working unchanged.
 */
export const MqParentSize = ({ children, style, className }: Props) => {
  const ref = useRef<HTMLDivElement>(null)
  const size = useElementSize(ref)

  return (
    <div ref={ref} className={className} style={{ width: '100%', height: '100%', ...style }}>
      {children(size)}
    </div>
  )
}

export default MqParentSize
