// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { getColumnLineage } from '@/features/lineage/api/columnlineage-requests'
import { useQueries } from '@tanstack/react-query'

import { describeColumnMember } from '@/features/lineage/components/column-level/columnMigration'

/**
 * Fetches column lineage for every dataset the set touches.
 *
 * Column lineage is fetched per dataset, not per column, so members sharing a
 * dataset share one request. The query key matches the single-dataset view's,
 * so a dataset already open is served from cache.
 */
export const useColumnMigrationLineage = (members: string[], depth: number) => {
  const datasets = [
    ...new Map(
      members.map((member) => {
        const { namespace, dataset } = describeColumnMember(member)
        return [`${namespace}:${dataset}`, { namespace, dataset }]
      })
    ).values(),
  ]

  const queries = useQueries({
    queries: datasets.map(({ namespace, dataset }) => ({
      queryKey: ['column-lineage', 'DATASET', namespace, dataset, depth],
      queryFn: () => getColumnLineage('DATASET', namespace, dataset, depth),
      enabled: Boolean(namespace && dataset),
    })),
  })

  return { datasets, queries }
}
