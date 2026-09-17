// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { ImpactRow } from './impact'
import { Nullable } from '@/shared/types/util/Nullable'

/**
 * A migration moves a set of objects, not one. The combined blast radius of a
 * set is not the sum of its members' blast radii: objects inside the set move
 * together, so a dependency between two members is internal to the move, while
 * a dependency on anything outside it needs coordinating with another team.
 * That distinction is the whole point of the set.
 */
export interface MigrationSetRow extends ImpactRow {
  /** True when the impacted object is itself part of the move. */
  inSet: boolean
  /** Members of the set this object was reached from. */
  reachedFrom: string[]
}

export const parseMigrationSet = (value: Nullable<string> | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)

export const serialiseMigrationSet = (members: string[]) => [...new Set(members)].join(',')

export const toggleMember = (members: string[], nodeId: string): string[] =>
  members.includes(nodeId) ? members.filter((member) => member !== nodeId) : [...members, nodeId]

/** Node ids are `{type}:{namespace}:{name}`; names may contain colons. */
export const describeMember = (nodeId: string) => {
  const [type, namespace, ...rest] = nodeId.split(':')
  return { type, namespace, name: rest.join(':') }
}

interface MemberImpact {
  member: string
  rows: ImpactRow[]
}

/**
 * Merges each member's impact into one list.
 *
 * An object reached from several members appears once, at its shortest
 * distance from any of them, naming every member it was reached from —
 * a shared dependency is more interesting than a private one, not less.
 *
 * A member that another member depends on stays in the list, marked inSet.
 * Dropping it would be tidier but less useful: "moving A needs B, and B is
 * already in the set" is how a reader checks the move is closed.
 */
export const combineMigrationImpact = (
  members: string[],
  impacts: MemberImpact[]
): MigrationSetRow[] => {
  const memberSet = new Set(members)
  const merged = new Map<string, MigrationSetRow>()

  for (const { member, rows } of impacts) {
    for (const row of rows) {
      const existing = merged.get(row.id)
      if (!existing) {
        merged.set(row.id, {
          ...row,
          inSet: memberSet.has(row.id),
          reachedFrom: [member],
        })
        continue
      }

      if (!existing.reachedFrom.includes(member)) existing.reachedFrom.push(member)
      if (row.hops < existing.hops) {
        existing.hops = row.hops
        existing.direction = row.direction
      }
    }
  }

  return [...merged.values()]
}

export interface MigrationSummary {
  members: number
  external: number
  internal: number
  unclaimedExternal: number
  teamsToCoordinate: string[]
}

/**
 * What a reader needs before they can plan: how much of the blast radius the
 * move already contains, and who owns the rest.
 */
export const summariseMigration = (
  members: string[],
  rows: MigrationSetRow[]
): MigrationSummary => {
  const external = rows.filter((row) => !row.inSet)
  const teams = new Set<string>()
  let unclaimedExternal = 0

  for (const row of external) {
    const owner = row.owner ?? ''
    if (!owner || owner === 'Unclaimed') unclaimedExternal += 1
    else teams.add(owner)
  }

  return {
    members: members.length,
    external: external.length,
    internal: rows.length - external.length,
    unclaimedExternal,
    teamsToCoordinate: [...teams].sort(),
  }
}
