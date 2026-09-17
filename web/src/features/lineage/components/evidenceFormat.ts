// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

/**
 * Shared shapes for the evidence documents the lineage views export.
 *
 * Both packs are Markdown: it reads as plain text anywhere, renders in every
 * ticket tracker, and needs no dependency to produce.
 */

/** A pipe inside a value would otherwise end the table cell it sits in. */
export const escapeCell = (value: string) => value.replace(/\|/g, '\\|')

export const code = (value: string) => `\`${escapeCell(value)}\``

/** The two-column header table every pack opens with. */
export const definitionTable = (entries: [string, string][]): string[] => [
  '| | |',
  '| --- | --- |',
  ...entries.map(([label, value]) => `| ${label} | ${value} |`),
]

export const markdownTable = (
  headers: string[],
  alignments: string[],
  rows: string[][]
): string[] => [
  `| ${headers.join(' | ')} |`,
  `| ${alignments.join(' | ')} |`,
  ...rows.map((row) => `| ${row.join(' | ')} |`),
]

/** Tallies a field, busiest first, then alphabetically for a stable order. */
export const countBy = <T>(items: T[], key: (item: T) => string): [string, number][] => {
  const counts = new Map<string, number>()
  for (const item of items) {
    const value = key(item)
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}

export const hopWord = (depth: number) => (depth === 1 ? 'hop' : 'hops')

/**
 * The caveats every pack carries. A document that overstates its own
 * completeness is worse than no document: depth bounds what was even looked
 * at, and a shortest path is not the only path.
 */
export const scopeLines = (depth: number, extra: string[] = []): string[] => [
  '## Scope of this evidence',
  '',
  `- Covers lineage reachable within ${depth} ${hopWord(
    depth
  )} of the subject above, as recorded by OpenLineage events.`,
  '- Objects beyond that depth are not listed here and their absence is not evidence that none exist.',
  '- Hop counts are shortest paths; an object may also be reachable by longer routes.',
  ...extra.map((line) => `- ${line}`),
  '',
]

export const evidenceFilename = (kind: string, parts: string[], capturedAt: Date) =>
  [kind, ...parts.filter(Boolean), capturedAt.toISOString().slice(0, 10)].join('-') + '.md'
