// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'

import {
  combineMigrationImpact,
  describeMember,
  parseMigrationSet,
  serialiseMigrationSet,
  summariseMigration,
  toggleMember,
} from './migrationSet'
import type { ImpactRow } from './impact'

const row = (overrides: Partial<ImpactRow>): ImpactRow => ({
  id: 'dataset:analytics:orders',
  direction: 'downstream',
  type: 'DATASET',
  namespace: 'analytics',
  name: 'orders',
  hops: 1,
  updatedAt: '',
  state: '',
  owner: '',
  ...overrides,
})

describe('the set itself', () => {
  it('survives a round trip through the URL', () => {
    const members = ['job:etl:a', 'dataset:raw:b']

    expect(parseMigrationSet(serialiseMigrationSet(members))).toEqual(members)
  })

  it('ignores blanks and stray whitespace in a hand-edited URL', () => {
    expect(parseMigrationSet(' job:etl:a , ,dataset:raw:b,')).toEqual([
      'job:etl:a',
      'dataset:raw:b',
    ])
    expect(parseMigrationSet(null)).toEqual([])
  })

  it('never stores the same member twice', () => {
    expect(serialiseMigrationSet(['a', 'b', 'a'])).toBe('a,b')
  })

  it('toggles a member in and out', () => {
    expect(toggleMember(['a'], 'b')).toEqual(['a', 'b'])
    expect(toggleMember(['a', 'b'], 'a')).toEqual(['b'])
  })

  it('keeps colons that belong to a name', () => {
    expect(describeMember('dataset:s3://bucket:path')).toEqual({
      type: 'dataset',
      namespace: 's3',
      name: '//bucket:path',
    })
  })
})

describe('combineMigrationImpact', () => {
  const members = ['job:etl:a', 'job:etl:b']

  it('marks impacted objects that are themselves moving', () => {
    const rows = combineMigrationImpact(members, [
      { member: 'job:etl:a', rows: [row({ id: 'dataset:raw:shared' }), row({ id: 'job:etl:b' })] },
      { member: 'job:etl:b', rows: [] },
    ])

    expect(rows.find((r) => r.id === 'dataset:raw:shared')?.inSet).toBe(false)
    // A dependency that is already part of the move is kept and marked: it is
    // how a reader confirms the set is closed, not noise to be dropped.
    expect(rows.find((r) => r.id === 'job:etl:b')?.inSet).toBe(true)
  })

  it('lists a shared dependency once, naming every member that reaches it', () => {
    const rows = combineMigrationImpact(members, [
      { member: 'job:etl:a', rows: [row({ id: 'dataset:raw:shared', hops: 3 })] },
      { member: 'job:etl:b', rows: [row({ id: 'dataset:raw:shared', hops: 1 })] },
    ])

    expect(rows).toHaveLength(1)
    expect(rows[0].reachedFrom).toEqual(['job:etl:a', 'job:etl:b'])
    // The shortest distance from any member is the one that matters.
    expect(rows[0].hops).toBe(1)
  })

  it('does not double-count a member reaching the same object twice', () => {
    const rows = combineMigrationImpact(
      ['job:etl:a'],
      [
        {
          member: 'job:etl:a',
          rows: [row({ id: 'dataset:raw:shared' }), row({ id: 'dataset:raw:shared', hops: 2 })],
        },
      ]
    )

    expect(rows[0].reachedFrom).toEqual(['job:etl:a'])
  })
})

describe('summariseMigration', () => {
  it('separates what the move already contains from what it does not', () => {
    const rows = combineMigrationImpact(
      ['job:etl:a', 'dataset:raw:inside'],
      [
        {
          member: 'job:etl:a',
          rows: [
            row({ id: 'dataset:raw:inside' }),
            row({ id: 'dataset:other:outside', owner: 'payments-data-eng' }),
          ],
        },
      ]
    )

    const summary = summariseMigration(['job:etl:a', 'dataset:raw:inside'], rows)

    expect(summary.members).toBe(2)
    expect(summary.internal).toBe(1)
    expect(summary.external).toBe(1)
    expect(summary.teamsToCoordinate).toEqual(['payments-data-eng'])
  })

  it('counts unowned external dependencies separately, since nobody can be asked', () => {
    const rows = combineMigrationImpact(
      ['job:etl:a'],
      [
        {
          member: 'job:etl:a',
          rows: [row({ id: 'd:1', owner: 'Unclaimed' }), row({ id: 'd:2', owner: '' })],
        },
      ]
    )

    const summary = summariseMigration(['job:etl:a'], rows)

    expect(summary.unclaimedExternal).toBe(2)
    expect(summary.teamsToCoordinate).toEqual([])
  })
})
