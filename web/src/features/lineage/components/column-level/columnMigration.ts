// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { ColumnImpactRow } from './columnImpact'
import {
  code,
  countBy,
  definitionTable,
  evidenceFilename as formatEvidenceFilename,
  markdownTable,
  scopeLines,
} from '../evidenceFormat'
import { parseColumnLineageNode } from './layout'
import { summariseOwners } from '@/features/namespaces/owners'

export interface ColumnMigrationRow extends ColumnImpactRow {
  /** True when the impacted column is itself part of the change. */
  inSet: boolean
  /** Members of the set this column was reached from, as `dataset.column`. */
  reachedFrom: string[]
}

export const describeColumnMember = (nodeId: string) => {
  const { namespace, dataset, column } = parseColumnLineageNode(nodeId)
  return { namespace, dataset, column, label: `${dataset}.${column}` }
}

interface MemberImpact {
  member: string
  rows: ColumnImpactRow[]
}

/**
 * Merges the impact of every column in the set into one list.
 *
 * Same rule as the table-level set: a column reached from several members
 * appears once, at its shortest distance from any of them, and a column that
 * is itself in the set is marked rather than dropped — that mark is how a
 * reader checks the change is self-consistent.
 */
export const combineColumnMigrationImpact = (
  members: string[],
  impacts: MemberImpact[]
): ColumnMigrationRow[] => {
  const memberSet = new Set(members)
  const merged = new Map<string, ColumnMigrationRow>()

  for (const { member, rows } of impacts) {
    const label = describeColumnMember(member).label

    for (const row of rows) {
      const existing = merged.get(row.id)
      if (!existing) {
        merged.set(row.id, { ...row, inSet: memberSet.has(row.id), reachedFrom: [label] })
        continue
      }

      if (!existing.reachedFrom.includes(label)) existing.reachedFrom.push(label)
      if (row.hops < existing.hops) {
        existing.hops = row.hops
        existing.direction = row.direction
        existing.transformation = row.transformation
      }
    }
  }

  return [...merged.values()]
}

export interface ColumnMigrationSummary {
  members: number
  external: number
  internal: number
  downstream: number
  upstream: number
  teamsToCoordinate: string[]
}

export const summariseColumnMigration = (
  members: string[],
  rows: ColumnMigrationRow[]
): ColumnMigrationSummary => {
  const external = rows.filter((row) => !row.inSet)
  const teams = new Set<string>()
  for (const row of external) {
    const owner = row.owner ?? ''
    if (owner && owner !== 'Unclaimed') teams.add(owner)
  }

  return {
    members: members.length,
    external: external.length,
    internal: rows.length - external.length,
    // Downstream is the half that breaks when a field changes.
    downstream: external.filter((row) => row.direction === 'downstream').length,
    // Upstream is the half that has to come with it, or be pointed somewhere new.
    upstream: external.filter((row) => row.direction === 'upstream').length,
    teamsToCoordinate: [...teams].sort(),
  }
}

export interface ColumnMigrationEvidenceInput {
  members: string[]
  rows: ColumnMigrationRow[]
  summary: ColumnMigrationSummary
  depth: number
  url: string
  capturedAt: Date
}

/**
 * The plan document for a field-level change.
 *
 * Downstream comes first here, unlike the table-level pack: changing a column
 * breaks what reads it, and that is the list somebody has to act on.
 */
export const buildColumnMigrationEvidenceMarkdown = ({
  members,
  rows,
  summary,
  depth,
  url,
  capturedAt,
}: ColumnMigrationEvidenceInput): string => {
  const external = rows.filter((row) => !row.inSet)
  const downstream = external.filter((row) => row.direction === 'downstream')
  const upstream = external.filter((row) => row.direction === 'upstream')
  const ownerCounts = summariseOwners(downstream.map((row) => row.owner ?? ''))

  const lines: string[] = [
    '# Column change impact',
    '',
    ...definitionTable([
      ['Columns changing', String(summary.members)],
      ['Captured', capturedAt.toISOString()],
      ['Depth requested', String(depth)],
      ['Columns that read these (downstream)', String(summary.downstream)],
      ['Columns these are derived from (upstream)', String(upstream.length)],
      ['Related columns already in the set', String(summary.internal)],
      ['Teams to coordinate with', summary.teamsToCoordinate.join(', ') || 'none'],
    ]),
    '',
    `Reproduce this view: ${url}`,
    '',
    '## Columns changing',
    '',
  ]

  for (const member of members) {
    const { namespace, label } = describeColumnMember(member)
    lines.push(`- ${code(label)} in ${code(namespace)}`)
  }
  lines.push('')

  const section = (title: string, sectionRows: ColumnMigrationRow[], emptyNote: string) => {
    lines.push(`## ${title}`, '')
    if (!sectionRows.length) {
      lines.push(emptyNote, '')
      return
    }
    lines.push(
      ...markdownTable(
        ['Namespace', 'Owner', 'Dataset', 'Column', 'Hops', 'Transformation', 'Reached from'],
        ['---', '---', '---', '---', '---:', '---', '---'],
        [...sectionRows]
          .sort((a, b) => a.hops - b.hops)
          .map((row) => [
            code(row.namespace),
            code(row.owner || 'Unclaimed'),
            code(row.dataset),
            code(row.column),
            String(row.hops),
            row.transformation || '—',
            row.reachedFrom.map(code).join(', '),
          ])
      ),
      ''
    )
  }

  section(
    'Breaks if these columns change',
    downstream,
    'Nothing recorded reads these columns within the requested depth. That is not a guarantee nothing does.'
  )
  section(
    'These columns are derived from',
    upstream,
    'No upstream columns recorded within the requested depth.'
  )

  if (downstream.length) {
    lines.push('### Owners of affected columns', '')
    for (const [owner, count] of ownerCounts) {
      lines.push(`- ${code(owner)} — ${count}`)
    }
    lines.push('')
  }

  if (rows.some((row) => row.inSet)) {
    lines.push('## Related columns already in this change', '')
    for (const [label, count] of countBy(
      rows.filter((row) => row.inSet),
      (row) => `${row.dataset}.${row.column}`
    )) {
      lines.push(`- ${code(label)}${count > 1 ? ` — reached ${count} times` : ''}`)
    }
    lines.push('')
  }

  lines.push(
    ...scopeLines(depth, [
      'Each column was traced independently; a column reached from several members is listed once, at its shortest distance from any of them.',
      'Transformation types come from each focused dataset’s columnLineage facet. A dash means none was recorded for that edge, not that the value passes through unchanged.',
    ])
  )

  return lines.join('\n')
}

export const columnMigrationEvidenceFilename = (capturedAt: Date) =>
  formatEvidenceFilename('column-change-evidence', [], capturedAt)
