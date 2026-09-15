import { describe, expect, it } from 'vitest'

import { deepEqual } from '@/shared/utils/deepEqual'

describe('deepEqual', () => {
  it('compares primitives', () => {
    expect(deepEqual(1, 1)).toBe(true)
    expect(deepEqual('a', 'a')).toBe(true)
    expect(deepEqual(1, '1')).toBe(false)
    expect(deepEqual(null, null)).toBe(true)
    expect(deepEqual(null, undefined)).toBe(false)
    expect(deepEqual(NaN, NaN)).toBe(true)
  })

  it('compares nested objects structurally', () => {
    expect(deepEqual({ a: { b: [1, 2, { c: 3 }] } }, { a: { b: [1, 2, { c: 3 }] } })).toBe(true)
    expect(deepEqual({ a: { b: [1, 2, { c: 3 }] } }, { a: { b: [1, 2, { c: 4 }] } })).toBe(false)
  })

  it('is key-order independent but key-count sensitive', () => {
    expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true)
    expect(deepEqual({ a: 1 }, { a: 1, b: undefined })).toBe(false)
  })

  it('distinguishes arrays from objects and differing lengths', () => {
    expect(deepEqual([1, 2], { 0: 1, 1: 2 })).toBe(false)
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false)
    expect(deepEqual([], [])).toBe(true)
  })

  it('matches the elk layout input shape it guards', () => {
    const input = {
      id: 'root',
      children: [{ id: 'a', width: 10, height: 20, layoutOptions: { 'elk.padding': '[10]' } }],
      edges: [{ id: 'e1', sources: ['a'], targets: ['b'] }],
    }
    expect(deepEqual(input, JSON.parse(JSON.stringify(input)))).toBe(true)
  })
})
