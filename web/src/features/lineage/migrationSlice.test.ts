// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest'

import reducer, {
  clearMigrationSet,
  loadPersistedMembers,
  persistMembers,
  removeMigrationMember,
  setMigrationMembers,
  toggleMigrationMember,
} from './migrationSlice'

const state = (members: string[]) => ({ members })

describe('migration slice', () => {
  it('starts empty', () => {
    expect(reducer(undefined, { type: 'init' })).toEqual({ members: [] })
  })

  it('adopts a set wholesale, as a shared link does', () => {
    expect(reducer(state([]), setMigrationMembers(['a', 'b']))).toEqual({ members: ['a', 'b'] })
  })

  it('drops duplicates and blanks from an adopted set', () => {
    expect(reducer(state([]), setMigrationMembers(['a', '', 'a', 'b']))).toEqual({
      members: ['a', 'b'],
    })
  })

  it('toggles a member in and out', () => {
    const added = reducer(state(['a']), toggleMigrationMember('b'))
    expect(added.members).toEqual(['a', 'b'])
    expect(reducer(added, toggleMigrationMember('a')).members).toEqual(['b'])
  })

  it('removes a named member without touching the others', () => {
    expect(reducer(state(['a', 'b', 'c']), removeMigrationMember('b')).members).toEqual(['a', 'c'])
  })

  it('clears the whole set', () => {
    expect(reducer(state(['a', 'b']), clearMigrationSet()).members).toEqual([])
  })
})

describe('persisting a plan across a refresh', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it('round trips the set', () => {
    persistMembers(['job:etl:a', 'dataset:raw:b'])

    expect(loadPersistedMembers()).toEqual(['job:etl:a', 'dataset:raw:b'])
  })

  it('clears the record when the set empties, rather than leaving a stale one', () => {
    persistMembers(['job:etl:a'])
    persistMembers([])

    expect(loadPersistedMembers()).toEqual([])
    expect(window.sessionStorage.getItem('marquez.migrationSet')).toBeNull()
  })

  it('ignores a stored value that is not a list of ids', () => {
    window.sessionStorage.setItem('marquez.migrationSet', '"not an array"')
    expect(loadPersistedMembers()).toEqual([])

    window.sessionStorage.setItem('marquez.migrationSet', 'nonsense{')
    expect(loadPersistedMembers()).toEqual([])

    window.sessionStorage.setItem('marquez.migrationSet', '["ok", 42, null]')
    expect(loadPersistedMembers()).toEqual(['ok'])
  })

  it('survives storage being unavailable', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })

    expect(loadPersistedMembers()).toEqual([])
    expect(() => persistMembers(['a'])).not.toThrow()

    getItem.mockRestore()
    setItem.mockRestore()
  })
})
