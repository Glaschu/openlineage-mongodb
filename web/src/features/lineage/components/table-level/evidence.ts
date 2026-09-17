// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { ImpactRow } from './impact'
import {
  code,
  countBy,
  definitionTable,
  evidenceFilename as formatEvidenceFilename,
  markdownTable,
  scopeLines,
} from '../evidenceFormat'
import { isUnclaimed, summariseOwners } from '@/features/namespaces/owners'

export interface EvidenceInput {
  /** The object the lineage was traced from. */
  nodeType: string
  namespace: string
  name: string
  /** How many hops were requested from the API. */
  depth: number
  /** The exact view, so a reader can reproduce it. */
  url: string
  rows: ImpactRow[]
  capturedAt: Date
}

/**
 * A single self-contained file describing what was traced, when, from where,
 * and what was found.
 *
 * A CSV is the machine artifact; this is the one a person attaches to a change
 * ticket or hands to an auditor, so it states its own provenance and its own
 * limits. Markdown because it reads as text anywhere and renders in every
 * ticket tracker, and because it needs no dependency to produce.
 */
export const buildEvidenceMarkdown = ({
  nodeType,
  namespace,
  name,
  depth,
  url,
  rows,
  capturedAt,
}: EvidenceInput): string => {
  const upstream = rows.filter((row) => row.direction === 'upstream')
  const downstream = rows.filter((row) => row.direction === 'downstream')
  const maxHops = rows.reduce((furthest, row) => Math.max(furthest, row.hops), 0)
  const ownerCounts = summariseOwners(rows.map((row) => row.owner ?? ''))
  const unclaimedCount = rows.filter((row) => isUnclaimed(row.owner ?? '')).length

  const lines: string[] = [
    `# Lineage impact: ${name}`,
    '',
    ...definitionTable([
      ['Object', code(name)],
      ['Namespace', code(namespace)],
      ['Type', nodeType.toUpperCase()],
      ['Captured', capturedAt.toISOString()],
      ['Depth requested', String(depth)],
      ['Upstream objects', String(upstream.length)],
      ['Downstream objects', String(downstream.length)],
      ['Furthest hop', String(maxHops)],
      ['Owning teams', String(ownerCounts.filter(([owner]) => !isUnclaimed(owner)).length)],
      ['Objects in unclaimed namespaces', String(unclaimedCount)],
    ]),
    '',
    `Reproduce this view: ${url}`,
    '',
  ]

  if (rows.length) {
    lines.push('## Objects by namespace', '')
    for (const [ns, count] of countBy(rows, (row) => row.namespace)) {
      lines.push(`- ${code(ns)} — ${count}`)
    }
    lines.push('')

    lines.push('## Ownership', '')
    for (const [owner, count] of ownerCounts) {
      lines.push(`- ${code(owner)} — ${count}`)
    }
    if (unclaimedCount) {
      lines.push(
        '',
        `${unclaimedCount} of ${rows.length} impacted objects sit in namespaces nobody has claimed; a change here has no owner to consult.`
      )
    }
    lines.push('')

    lines.push('## Impacted objects', '')
    lines.push(
      ...markdownTable(
        ['Direction', 'Type', 'Namespace', 'Owner', 'Name', 'Hops', 'Latest run', 'Updated'],
        ['---', '---', '---', '---', '---', '---:', '---', '---'],
        [...rows]
          .sort((a, b) => a.hops - b.hops)
          .map((row) => [
            row.direction,
            row.type,
            code(row.namespace),
            code(row.owner || 'Unclaimed'),
            code(row.name),
            String(row.hops),
            row.state || '—',
            row.updatedAt || '—',
          ])
      )
    )
    lines.push('')
  } else {
    lines.push(
      'No upstream or downstream objects were found in the loaded graph.',
      '',
      'This can mean the object genuinely stands alone, or that the requested depth did not reach its neighbours.',
      ''
    )
  }

  lines.push(...scopeLines(depth))

  return lines.join('\n')
}

export const evidenceFilename = (namespace: string, name: string, capturedAt: Date) =>
  formatEvidenceFilename('lineage-evidence', [namespace, name], capturedAt)
