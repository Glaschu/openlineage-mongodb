// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { API_URL } from '@/app/globals'
import { JobOrDataset } from '@/shared/types/lineage'
import { generateNodeId } from '@/shared/utils/nodes'
import { genericFetchWrapper } from '@/shared/api/fetch'

export const getLineage = async (
  nodeType: JobOrDataset,
  namespace: string,
  name: string,
  depth: number,
  aggregateByParent = false
) => {
  const encodedNamespace = encodeURIComponent(namespace)
  const encodedName = encodeURIComponent(name)
  const nodeId = generateNodeId(nodeType, encodedNamespace, encodedName)
  const url = `${API_URL}/lineage?nodeId=${nodeId}&depth=${depth}&aggregateByParent=${aggregateByParent}`
  return genericFetchWrapper(url, { method: 'GET' }, 'fetchLineage')
}
