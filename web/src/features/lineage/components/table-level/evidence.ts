// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { ImpactRow } from './impact'

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

const escapeCell = (value: string) => value.replace(/\|/g, '\\|')

const countByNamespace = (rows: ImpactRow[]) => {
  const counts = new Map<string, number>()
  for (const row of rows) counts.set(row.namespace, (counts.get(row.namespace) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
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

  const lines: string[] = [
    `# Lineage impact: ${name}`,
    '',
    '| | |',
    '| --- | --- |',
    `| Object | \`${escapeCell(name)}\` |`,
    `| Namespace | \`${escapeCell(namespace)}\` |`,
    `| Type | ${nodeType.toUpperCase()} |`,
    `| Captured | ${capturedAt.toISOString()} |`,
    `| Depth requested | ${depth} |`,
    `| Upstream objects | ${upstream.length} |`,
    `| Downstream objects | ${downstream.length} |`,
    `| Furthest hop | ${maxHops} |`,
    '',
    `Reproduce this view: ${url}`,
    '',
  ]

  if (rows.length) {
    lines.push('## Objects by namespace', '')
    for (const [ns, count] of countByNamespace(rows)) {
      lines.push(`- \`${escapeCell(ns)}\` — ${count}`)
    }
    lines.push('')

    lines.push('## Impacted objects', '')
    lines.push('| Direction | Type | Namespace | Name | Hops | Latest run | Updated |')
    lines.push('| --- | --- | --- | --- | ---: | --- | --- |')
    for (const row of [...rows].sort((a, b) => a.hops - b.hops)) {
      lines.push(
        `| ${row.direction} | ${row.type} | \`${escapeCell(row.namespace)}\` | \`${escapeCell(
          row.name
        )}\` | ${row.hops} | ${row.state || '—'} | ${row.updatedAt || '—'} |`
      )
    }
    lines.push('')
  } else {
    lines.push(
      'No upstream or downstream objects were found in the loaded graph.',
      '',
      'This can mean the object genuinely stands alone, or that the requested depth did not reach its neighbours.',
      ''
    )
  }

  lines.push(
    '## Scope of this evidence',
    '',
    `- Covers lineage reachable within ${depth} hop${
      depth === 1 ? '' : 's'
    } of the object above, as recorded by OpenLineage events.`,
    '- Objects beyond that depth are not listed here and their absence is not evidence that none exist.',
    '- Hop counts are shortest paths; an object may also be reachable by longer routes.',
    ''
  )

  return lines.join('\n')
}

export const evidenceFilename = (namespace: string, name: string, capturedAt: Date) =>
  `lineage-evidence-${namespace}-${name}-${capturedAt.toISOString().slice(0, 10)}.md`
