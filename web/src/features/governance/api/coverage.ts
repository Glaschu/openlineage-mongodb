// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

// Lineage coverage is computed client-side from existing endpoints: the dataset list
// marks column-lineage presence (`columnLineage: []` present / `null` absent), and the
// dataset detail carries the facet used to count mapped fields. A bank-grade rollout
// would compute this server-side; this is the POC shape of the metric.

import { Dataset } from '@/shared/types/api'
import { getDataset, getDatasets } from '@/features/datasets/api/requests'
import { useQuery } from '@tanstack/react-query'

const DATASET_LIST_LIMIT = 500
// Cap detail fetches: field-level coverage is sampled, not exhaustive, in the POC.
const DETAIL_FETCH_LIMIT = 25

export interface DatasetCoverage {
  name: string
  namespace: string
  updatedAt: string
  fieldCount: number
  hasColumnLineage: boolean
  // null when the detail was not sampled
  mappedFieldCount: number | null
  tags: string[]
}

export interface NamespaceCoverage {
  namespace: string
  totalDatasets: number
  datasetsWithColumnLineage: number
  sampledDatasets: number
  sampledFields: number
  sampledMappedFields: number
  datasets: DatasetCoverage[]
}

export const computeNamespaceCoverage = async (namespace: string): Promise<NamespaceCoverage> => {
  const { datasets } = await getDatasets(namespace, DATASET_LIST_LIMIT, 0)

  const withLineage = datasets.filter((dataset) => dataset.columnLineage !== null)
  const toSample = withLineage.slice(0, DETAIL_FETCH_LIMIT)
  const details = await Promise.all(
    toSample.map((dataset) =>
      getDataset(namespace, dataset.name).catch(() => null as Dataset | null)
    )
  )

  const mappedByName = new Map<string, number>()
  for (const detail of details) {
    if (detail) {
      mappedByName.set(detail.name, (detail.columnLineage ?? []).length)
    }
  }

  const coverage: DatasetCoverage[] = datasets.map((dataset) => ({
    name: dataset.name,
    namespace,
    updatedAt: dataset.updatedAt,
    fieldCount: dataset.fields.length,
    hasColumnLineage: dataset.columnLineage !== null,
    mappedFieldCount: mappedByName.get(dataset.name) ?? null,
    tags: dataset.tags,
  }))

  const sampled = coverage.filter((dataset) => dataset.mappedFieldCount !== null)

  return {
    namespace,
    totalDatasets: coverage.length,
    datasetsWithColumnLineage: coverage.filter((dataset) => dataset.hasColumnLineage).length,
    sampledDatasets: sampled.length,
    sampledFields: sampled.reduce((acc, dataset) => acc + dataset.fieldCount, 0),
    sampledMappedFields: sampled.reduce(
      (acc, dataset) => acc + Math.min(dataset.mappedFieldCount ?? 0, dataset.fieldCount),
      0
    ),
    datasets: coverage,
  }
}

export const useNamespaceCoverage = (namespace: string | null) =>
  useQuery({
    queryKey: ['namespace-coverage', namespace],
    queryFn: () => computeNamespaceCoverage(namespace as string),
    enabled: !!namespace,
    staleTime: 1000 * 60 * 5,
  })
