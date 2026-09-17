// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'

import { buildOwnerIndex, isUnclaimed, ownerFor, summariseOwners } from './owners'
import type { Namespace } from '@/shared/types/api'

const namespace = (name: string, ownerName: string): Namespace =>
  ({ name, ownerName } as unknown as Namespace)

describe('owner index', () => {
  it('maps each namespace to its owner', () => {
    const owners = buildOwnerIndex([
      namespace('retail', 'retail-data-eng'),
      namespace('spare', 'Unclaimed'),
    ])

    expect(ownerFor(owners, 'retail')).toBe('retail-data-eng')
    expect(ownerFor(owners, 'spare')).toBe('Unclaimed')
  })

  it('returns an empty owner for a namespace it has never seen', () => {
    expect(ownerFor(buildOwnerIndex([]), 'missing')).toBe('')
    expect(ownerFor(buildOwnerIndex(undefined), 'missing')).toBe('')
  })

  it('treats both the API sentinel and an absent owner as unclaimed', () => {
    expect(isUnclaimed('Unclaimed')).toBe(true)
    expect(isUnclaimed('')).toBe(true)
    expect(isUnclaimed('payments-data-eng')).toBe(false)
  })
})

describe('summariseOwners', () => {
  it('counts owners, busiest first', () => {
    expect(summariseOwners(['a', 'b', 'a'])).toEqual([
      ['a', 2],
      ['b', 1],
    ])
  })

  it('puts unclaimed last however many there are, so real teams read first', () => {
    expect(summariseOwners(['Unclaimed', 'Unclaimed', 'Unclaimed', 'retail'])).toEqual([
      ['retail', 1],
      ['Unclaimed', 3],
    ])
  })

  it('folds a missing owner into unclaimed rather than inventing a blank group', () => {
    expect(summariseOwners(['', 'Unclaimed'])).toEqual([['Unclaimed', 2]])
  })
})
