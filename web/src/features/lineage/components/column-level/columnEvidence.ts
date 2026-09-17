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
import { isUnclaimed, summariseOwners } from '@/features/namespaces/owners'

export interface ColumnEvidenceInput {
  namespace: string
  dataset: string
  column: string
  depth: number
  url: string
  rows: ColumnImpactRow[]
  capturedAt: Date
}

/**
 * The evidence document for a single field.
 *
 * Where the table-level pack answers "what else is affected", this one answers
 * "where did this value come from and who consumes it" — the question asked of
 * a regulated field. Derivation comes first, because that is what has to be
 * defensible; consumers follow.
 */
export const buildColumnEvidenceMarkdown = ({
  namespace,
  dataset,
  column,
  depth,
  url,
  rows,
  capturedAt,
}: ColumnEvidenceInput): string => {
  const upstream = rows.filter((row) => row.direction === 'upstream')
  const downstream = rows.filter((row) => row.direction === 'downstream')
  const maxHops = rows.reduce((furthest, row) => Math.max(furthest, row.hops), 0)
  const described = rows.filter((row) => row.transformation).length
  const ownerCounts = summariseOwners(rows.map((row) => row.owner ?? ''))
  const unclaimedCount = rows.filter((row) => isUnclaimed(row.owner ?? '')).length

  const lines: string[] = [
    `# Column lineage: ${dataset}.${column}`,
    '',
    ...definitionTable([
      ['Column', code(column)],
      ['Dataset', code(dataset)],
      ['Namespace', code(namespace)],
      ['Captured', capturedAt.toISOString()],
      ['Depth requested', String(depth)],
      ['Derived from', `${upstream.length} column${upstream.length === 1 ? '' : 's'}`],
      ['Consumed by', `${downstream.length} column${downstream.length === 1 ? '' : 's'}`],
      ['Furthest hop', String(maxHops)],
      ['Transformations recorded', `${described} of ${rows.length}`],
      ['Owning teams', String(ownerCounts.filter(([owner]) => !isUnclaimed(owner)).length)],
      ['Columns in unclaimed namespaces', String(unclaimedCount)],
    ]),
    '',
    `Reproduce this view: ${url}`,
    '',
  ]

  const section = (title: string, sectionRows: ColumnImpactRow[], emptyNote: string) => {
    lines.push(`## ${title}`, '')
    if (!sectionRows.length) {
      lines.push(emptyNote, '')
      return
    }

    lines.push(
      ...markdownTable(
        ['Namespace', 'Owner', 'Dataset', 'Column', 'Hops', 'Via column', 'Transformation'],
        ['---', '---', '---', '---', '---:', '---', '---'],
        [...sectionRows]
          .sort((a, b) => a.hops - b.hops)
          .map((row) => [
            code(row.namespace),
            code(row.owner || 'Unclaimed'),
            code(row.dataset),
            code(row.column),
            String(row.hops),
            code(row.via),
            row.transformation || '—',
          ])
      ),
      ''
    )
  }

  section(
    'Derived from',
    upstream,
    'No upstream columns in the loaded graph: this field has no recorded derivation within the requested depth.'
  )
  section(
    'Consumed by',
    downstream,
    'No downstream columns in the loaded graph: nothing recorded consumes this field within the requested depth.'
  )

  if (rows.length) {
    lines.push('## Ownership', '')
    for (const [owner, count] of ownerCounts) {
      lines.push(`- ${code(owner)} — ${count}`)
    }
    if (unclaimedCount) {
      lines.push(
        '',
        `${unclaimedCount} of ${rows.length} related columns sit in namespaces nobody has claimed.`
      )
    }
    lines.push('')

    lines.push('## Columns by dataset', '')
    for (const [name, count] of countBy(rows, (row) => `${row.namespace}.${row.dataset}`)) {
      lines.push(`- ${code(name)} — ${count}`)
    }
    lines.push('')
  }

  lines.push(
    ...scopeLines(depth, [
      'Transformation types come from the focused dataset’s columnLineage facet, which describes only the edges into that dataset. A dash means no transformation was recorded for that edge, not that the value passed through unchanged.',
    ])
  )

  return lines.join('\n')
}

export const columnEvidenceFilename = (
  namespace: string,
  dataset: string,
  column: string,
  capturedAt: Date
) => formatEvidenceFilename('column-evidence', [namespace, dataset, column], capturedAt)
