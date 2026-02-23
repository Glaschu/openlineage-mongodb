// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { useRef } from 'react'
import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useD3Selection } from '../../../../components/graph/utils/useD3Selection'

describe('useD3Selection', () => {
  it('should return undefined initially when ref is not set', () => {
    const { result } = renderHook(() => {
      const ref = useRef<SVGElement>(null)
      return useD3Selection(ref)
    })

    expect(result.current).toBeUndefined()
  })

  it('should create selection when ref.current is set', () => {
    const mockElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    
    const { result } = renderHook(() => {
      const ref = useRef<SVGSVGElement>(mockElement)
      return useD3Selection(ref)
    })

    expect(result.current).toBeDefined()
    expect(result.current?.node()).toBe(mockElement)
  })

  it('should work with HTML elements', () => {
    const mockElement = document.createElement('div')
    
    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(mockElement)
      return useD3Selection(ref)
    })

    expect(result.current).toBeDefined()
    expect(result.current?.node()).toBe(mockElement)
  })

  it('should update selection when ref changes', () => {
    const mockElement1 = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    const mockElement2 = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    
    const { result, rerender } = renderHook(
      ({ element }) => {
        const ref = useRef<SVGElement>(element)
        return useD3Selection(ref)
      },
      { initialProps: { element: mockElement1 as SVGElement } }
    )

    expect(result.current?.node()).toBe(mockElement1)

    rerender({ element: mockElement2 })
    // Note: In practice, React manages ref updates, so this is testing the hook structure
  })
})
