// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach } from 'vitest'
import reducer, { selectNamespace } from '../../../store/slices/namespacesSlice'

const baseState = { selectedNamespace: null }

const createNamespacesPayload = (namespaces: any[]) => ({ namespaces })

describe('namespaces reducer', () => {
  const storage = new Map<string, string>()

  beforeEach(() => {
    storage.clear()
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value)
        },
        removeItem: (key: string) => storage.delete(key),
        clear: () => storage.clear(),
      },
      configurable: true,
    })
  })

  it('should return initial state for unknown actions', () => {
    expect(reducer(undefined, { type: 'UNKNOWN' } as any)).toEqual(baseState)
  })

  it('should handle selectNamespace and persist selection', () => {
    const initial = { selectedNamespace: 'default' }
    const state = reducer(initial as any, selectNamespace('ml'))
    expect(state.selectedNamespace).toBe('ml')
    expect(window.localStorage.getItem('selectedNamespace')).toBe('ml')
  })
})
