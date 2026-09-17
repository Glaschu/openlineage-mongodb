// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { NamespaceCoverage } from './api/coverage'
import {
  code,
  definitionTable,
  evidenceFilename as formatEvidenceFilename,
  markdownTable,
} from '@/features/lineage/components/evidenceFormat'

export interface CoverageEvidenceInput {
  coverage: NamespaceCoverage
  owner: string
  url: string
  capturedAt: Date
}

const percent = (numerator: number, denominator: number) =>
  denominator === 0 ? 0 : Math.round((numerator / denominator) * 100)

const csvEscape = (value: string) =>
  /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value

export const COVERAGE_CSV_HEADER = [
  'namespace',
  'owner',
  'dataset',
  'fields',
  'has_column_lineage',
  'mapped_fields',
  'sampled',
  'updated_at',
].join(',')

export const buildCoverageCsv = (coverage: NamespaceCoverage, owner: string): string =>
  [
    COVERAGE_CSV_HEADER,
    ...coverage.datasets.map((dataset) =>
      [
        coverage.namespace,
        owner,
        dataset.name,
        String(dataset.fieldCount),
        dataset.hasColumnLineage ? 'yes' : 'no',
        // An unsampled dataset has no mapped count; an empty cell is the
        // honest value, not a zero.
        dataset.mappedFieldCount === null ? '' : String(dataset.mappedFieldCount),
        dataset.mappedFieldCount === null ? 'no' : 'yes',
        dataset.updatedAt,
      ]
        .map(csvEscape)
        .join(',')
    ),
  ].join('\n')

/**
 * A coverage attestation for one namespace.
 *
 * The number an auditor wants is "how much of this data has recorded lineage",
 * and the honest answer here has two parts: a complete count of datasets
 * carrying a columnLineage facet, and a field-level figure measured on a
 * sample. Reporting the second as though it covered everything would overstate
 * the evidence, so the document says which datasets were sampled and which
 * were not.
 */
export const buildCoverageEvidenceMarkdown = ({
  coverage,
  owner,
  url,
  capturedAt,
}: CoverageEvidenceInput): string => {
  const gaps = coverage.datasets.filter((dataset) => !dataset.hasColumnLineage)
  const unsampled = coverage.datasets.filter(
    (dataset) => dataset.hasColumnLineage && dataset.mappedFieldCount === null
  )

  const lines: string[] = [
    `# Column lineage coverage: ${coverage.namespace}`,
    '',
    ...definitionTable([
      ['Namespace', code(coverage.namespace)],
      ['Owner', code(owner || 'Unclaimed')],
      ['Captured', capturedAt.toISOString()],
      ['Datasets', String(coverage.totalDatasets)],
      [
        'With column lineage',
        `${coverage.datasetsWithColumnLineage} of ${coverage.totalDatasets} (${percent(
          coverage.datasetsWithColumnLineage,
          coverage.totalDatasets
        )}%)`,
      ],
      ['Datasets with no column lineage', String(gaps.length)],
      [
        'Fields mapped (sampled)',
        `${coverage.sampledMappedFields} of ${coverage.sampledFields} across ${
          coverage.sampledDatasets
        } dataset${coverage.sampledDatasets === 1 ? '' : 's'}`,
      ],
    ]),
    '',
    `Reproduce this view: ${url}`,
    '',
  ]

  lines.push('## Datasets with no column lineage recorded', '')
  if (gaps.length) {
    lines.push(
      ...markdownTable(
        ['Dataset', 'Fields', 'Updated'],
        ['---', '---:', '---'],
        gaps.map((dataset) => [
          code(dataset.name),
          String(dataset.fieldCount),
          dataset.updatedAt || '—',
        ])
      ),
      ''
    )
  } else {
    lines.push('Every dataset in this namespace carries a columnLineage facet.', '')
  }

  lines.push(
    '## How this was measured',
    '',
    '- Coverage is computed in the browser from the dataset list and dataset detail endpoints, not by the server.',
    `- "With column lineage" counts every dataset in the namespace: ${coverage.totalDatasets} checked.`,
    `- The field-level figure is a sample of ${coverage.sampledDatasets} dataset${
      coverage.sampledDatasets === 1 ? '' : 's'
    }, not the whole namespace. It cannot be read as a namespace-wide percentage.`
  )
  if (unsampled.length) {
    lines.push(
      `- ${unsampled.length} dataset${
        unsampled.length === 1 ? '' : 's'
      } carrying column lineage were not sampled, so their field mapping is unmeasured here.`
    )
  }
  lines.push(
    '- A recorded facet means lineage was reported, not that it is correct or complete.',
    ''
  )

  return lines.join('\n')
}

export const coverageEvidenceFilename = (namespace: string, capturedAt: Date) =>
  formatEvidenceFilename('coverage-evidence', [namespace], capturedAt)
