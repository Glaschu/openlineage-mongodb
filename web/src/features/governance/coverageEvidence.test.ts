// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'

import {
  buildCoverageCsv,
  buildCoverageEvidenceMarkdown,
  coverageEvidenceFilename,
} from './coverageEvidence'
import type { DatasetCoverage, NamespaceCoverage } from './api/coverage'

const capturedAt = new Date('2026-09-17T09:30:00.000Z')

const dataset = (overrides: Partial<DatasetCoverage>): DatasetCoverage => ({
  name: 'orders',
  namespace: 'analytics',
  updatedAt: '2026-09-14T22:00:00.000Z',
  fieldCount: 10,
  hasColumnLineage: true,
  mappedFieldCount: 8,
  tags: [],
  ...overrides,
})

const coverage = (overrides: Partial<NamespaceCoverage> = {}): NamespaceCoverage => ({
  namespace: 'analytics',
  totalDatasets: 3,
  datasetsWithColumnLineage: 2,
  sampledDatasets: 1,
  sampledFields: 10,
  sampledMappedFields: 8,
  datasets: [
    dataset({ name: 'orders' }),
    dataset({ name: 'refunds', mappedFieldCount: null }),
    dataset({ name: 'legacy_ledger', hasColumnLineage: false, mappedFieldCount: null }),
  ],
  ...overrides,
})

const build = (input = coverage(), owner = 'retail-data-eng') =>
  buildCoverageEvidenceMarkdown({
    coverage: input,
    owner,
    url: 'http://localhost:1337/governance?namespace=analytics',
    capturedAt,
  })

describe('buildCoverageEvidenceMarkdown', () => {
  it('reports complete counts and names the owner accountable for them', () => {
    const doc = build()

    expect(doc).toContain('# Column lineage coverage: analytics')
    expect(doc).toContain('| Owner | `retail-data-eng` |')
    expect(doc).toContain('| With column lineage | 2 of 3 (67%) |')
    expect(doc).toContain('| Datasets with no column lineage | 1 |')
  })

  it('says Unclaimed rather than leaving the owner blank', () => {
    expect(build(coverage(), '')).toContain('| Owner | `Unclaimed` |')
  })

  it('lists the gaps, which are the backlog', () => {
    const doc = build()

    const section = doc.slice(doc.indexOf('## Datasets with no column lineage'))
    expect(section).toContain('`legacy_ledger`')
    expect(section).not.toContain('`orders`')
  })

  it('refuses to present the sampled figure as a namespace-wide percentage', () => {
    const doc = build()

    expect(doc).toContain('| Fields mapped (sampled) | 8 of 10 across 1 dataset |')
    expect(doc).toContain('It cannot be read as a namespace-wide percentage')
  })

  it('names how many datasets with lineage went unmeasured', () => {
    const doc = build()

    // refunds has lineage but was not sampled.
    expect(doc).toContain('1 dataset carrying column lineage were not sampled')
  })

  it('says nothing about unsampled datasets when every one was measured', () => {
    const doc = build(
      coverage({
        datasets: [dataset({ name: 'orders' })],
        totalDatasets: 1,
        datasetsWithColumnLineage: 1,
      })
    )

    expect(doc).not.toContain('were not sampled')
  })

  it('does not let a recorded facet be read as a correct one', () => {
    expect(build()).toContain('means lineage was reported, not that it is correct or complete')
  })

  it('states plainly when there are no gaps at all', () => {
    const doc = build(
      coverage({
        datasets: [dataset({ name: 'orders' })],
        totalDatasets: 1,
        datasetsWithColumnLineage: 1,
      })
    )

    expect(doc).toContain('Every dataset in this namespace carries a columnLineage facet')
  })
})

describe('buildCoverageCsv', () => {
  it('writes one row per dataset with its sampling state', () => {
    const lines = buildCoverageCsv(coverage(), 'retail-data-eng').split('\n')

    expect(lines[0]).toBe(
      'namespace,owner,dataset,fields,has_column_lineage,mapped_fields,sampled,updated_at'
    )
    expect(lines[1]).toContain('orders,10,yes,8,yes,')
    // An unsampled dataset leaves mapped_fields empty rather than claiming zero.
    expect(lines[2]).toContain('refunds,10,yes,,no,')
    expect(lines[3]).toContain('legacy_ledger,10,no,,no,')
  })
})

describe('coverageEvidenceFilename', () => {
  it('names the file after the namespace and date', () => {
    expect(coverageEvidenceFilename('analytics', capturedAt)).toBe(
      'coverage-evidence-analytics-2026-09-17.md'
    )
  })
})
