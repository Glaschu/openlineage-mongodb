// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { JobOrDataset } from '@/shared/types/lineage'
import { getLineage } from '@/features/lineage/api/lineage-requests'
import { useQueries } from '@tanstack/react-query'

import { describeMember } from '@/features/lineage/components/table-level/migrationSet'

/**
 * Fetches lineage for every member of a migration set.
 *
 * Deliberately one request per member rather than a bulk endpoint: the query
 * keys match the ones the single-node view already uses, so a member whose
 * lineage was just viewed is served from cache instead of refetched.
 */
export const useMigrationSetLineage = (members: string[], depth: number) =>
  useQueries({
    queries: members.map((member) => {
      const { type, namespace, name } = describeMember(member)
      const nodeType = type.toUpperCase() as JobOrDataset

      return {
        queryKey: ['lineage', nodeType, namespace, name, depth, false],
        queryFn: () => getLineage(nodeType, namespace, name, depth, false),
        enabled: Boolean(namespace && name),
      }
    }),
  })
