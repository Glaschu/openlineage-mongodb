// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useCallbackRef } from '../../../../components/graph/utils/hooks'

describe('useCallbackRef', () => {
  it('should return a stable callback reference', () => {
    const callback = vi.fn()
    const { result, rerender } = renderHook(() => useCallbackRef(callback, []))

    const firstCallback = result.current
    rerender()
    const secondCallback = result.current

    expect(firstCallback).toBe(secondCallback)
  })

  it('should call the latest callback when invoked', () => {
    const callback1 = vi.fn()
    const callback2 = vi.fn()

    const { result, rerender } = renderHook(
      ({ cb }) => useCallbackRef(cb, []),
      { initialProps: { cb: callback1 } }
    )

    result.current('test1')
    expect(callback1).toHaveBeenCalledWith('test1')
    expect(callback2).not.toHaveBeenCalled()

    // Update to new callback
    rerender({ cb: callback2 })
    result.current('test2')

    expect(callback2).toHaveBeenCalledWith('test2')
    expect(callback1).toHaveBeenCalledTimes(1)
  })

  it('should handle undefined callback gracefully', () => {
    const { result } = renderHook(() => useCallbackRef(undefined, []))

    expect(() => result.current()).not.toThrow()
  })

  it('should pass multiple arguments to callback', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useCallbackRef(callback, []))

    result.current('arg1', 'arg2', 'arg3')
    expect(callback).toHaveBeenCalledWith('arg1', 'arg2', 'arg3')
  })

  it('should recreate callback when dependencies change', () => {
    const callback = vi.fn()
    let dep = 'dep1'

    const { result, rerender } = renderHook(() => useCallbackRef(callback, [dep]))

    const firstCallback = result.current
    dep = 'dep2'
    rerender()
    const secondCallback = result.current

    expect(firstCallback).not.toBe(secondCallback)
  })

  it('should not recreate callback when dependencies do not change', () => {
    const callback = vi.fn()
    const dep = 'dep1'

    const { result, rerender } = renderHook(() => useCallbackRef(callback, [dep]))

    const firstCallback = result.current
    rerender()
    const secondCallback = result.current

    expect(firstCallback).toBe(secondCallback)
  })
})
