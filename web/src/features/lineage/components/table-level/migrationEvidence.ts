// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { MigrationSetRow, MigrationSummary, describeMember } from './migrationSet'
import {
  code,
  countBy,
  definitionTable,
  evidenceFilename as formatEvidenceFilename,
  markdownTable,
  scopeLines,
} from '../evidenceFormat'
import { summariseOwners } from '@/features/namespaces/owners'

export interface MigrationEvidenceInput {
  members: string[]
  rows: MigrationSetRow[]
  summary: MigrationSummary
  depth: number
  url: string
  capturedAt: Date
}

/**
 * The plan document for a move.
 *
 * Ordered the way the decision is made: what is moving, what has to move with
 * it or be coordinated, and who to ask. External dependencies come before
 * internal ones because they are the ones that can block.
 */
export const buildMigrationEvidenceMarkdown = ({
  members,
  rows,
  summary,
  depth,
  url,
  capturedAt,
}: MigrationEvidenceInput): string => {
  const external = rows.filter((row) => !row.inSet)
  const internal = rows.filter((row) => row.inSet)
  const ownerCounts = summariseOwners(external.map((row) => row.owner ?? ''))

  const lines: string[] = [
    '# Migration set impact',
    '',
    ...definitionTable([
      ['Objects moving', String(summary.members)],
      ['Captured', capturedAt.toISOString()],
      ['Depth requested', String(depth)],
      ['Affected outside the set', String(summary.external)],
      ['Dependencies already in the set', String(summary.internal)],
      ['Teams to coordinate with', summary.teamsToCoordinate.join(', ') || 'none'],
      ['Affected objects with no owner', String(summary.unclaimedExternal)],
    ]),
    '',
    `Reproduce this view: ${url}`,
    '',
    '## Objects moving',
    '',
  ]

  for (const member of members) {
    const { type, namespace, name } = describeMember(member)
    lines.push(`- ${type.toUpperCase()} ${code(`${namespace}.${name}`)}`)
  }
  lines.push('')

  lines.push('## Affected outside the set', '')
  if (external.length) {
    lines.push(
      ...markdownTable(
        ['Direction', 'Type', 'Namespace', 'Owner', 'Name', 'Hops', 'Reached from'],
        ['---', '---', '---', '---', '---', '---:', '---'],
        [...external]
          .sort((a, b) => a.hops - b.hops)
          .map((row) => [
            row.direction,
            row.type,
            code(row.namespace),
            code(row.owner || 'Unclaimed'),
            code(row.name),
            String(row.hops),
            row.reachedFrom.map((member) => code(describeMember(member).name)).join(', '),
          ])
      ),
      ''
    )

    lines.push('### Owners to coordinate with', '')
    for (const [owner, count] of ownerCounts) {
      lines.push(`- ${code(owner)} — ${count}`)
    }
    if (summary.unclaimedExternal) {
      lines.push(
        '',
        `${summary.unclaimedExternal} affected object${
          summary.unclaimedExternal === 1 ? '' : 's'
        } sit in namespaces nobody has claimed. There is no owner to consult before this move.`
      )
    }
    lines.push('')
  } else {
    lines.push(
      'Nothing outside the set depends on these objects, and they depend on nothing outside it, within the requested depth. The move is self-contained as far as recorded lineage shows.',
      ''
    )
  }

  if (internal.length) {
    lines.push(
      '## Dependencies already inside the set',
      '',
      'These are already part of the move, so they need no coordination — listed so the set can be checked for completeness.',
      ''
    )
    for (const [name, count] of countBy(internal, (row) => `${row.namespace}.${row.name}`)) {
      lines.push(`- ${code(name)}${count > 1 ? ` — reached ${count} times` : ''}`)
    }
    lines.push('')
  }

  lines.push(
    ...scopeLines(depth, [
      'Each member of the set was traced independently; an object reached from several members is listed once, at its shortest distance from any of them.',
    ])
  )

  return lines.join('\n')
}

export const migrationEvidenceFilename = (capturedAt: Date) =>
  formatEvidenceFilename('migration-set-evidence', [], capturedAt)
