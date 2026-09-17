// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'

import reducer, {
  clearMigrationSet,
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
