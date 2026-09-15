// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { RefObject, useEffect, useState } from 'react'

export interface ElementSize {
  width: number
  height: number
}

/**
 * Tracks an element's content-box size with a ResizeObserver.
 *
 * Replaces @react-hook/size and @visx/responsive's ParentSize, which did the
 * same job two different ways in the same app. Size is {0, 0} until the first
 * observation, so callers must cope with a zero size on the first paint — the
 * same contract both libraries had.
 */
export const useElementSize = <T extends Element>(ref: RefObject<T | null>): ElementSize => {
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 })

  useEffect(() => {
    const element = ref.current
    if (!element || typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return

      // contentRect is widely supported; contentBoxSize is not in every engine.
      const { width, height } = entry.contentRect
      setSize((current) =>
        current.width === width && current.height === height ? current : { width, height }
      )
    })

    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])

  return size
}
