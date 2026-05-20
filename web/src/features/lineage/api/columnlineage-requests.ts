import { API_URL } from '@/app/globals'
import { ColumnLineageGraph } from '@/shared/types/api'
import { JobOrDataset } from '@/shared/types/lineage'

import { generateNodeId } from '@/shared/utils/nodes'
import { genericFetchWrapper } from '@/shared/api/fetch'

export interface IColumnLineageState {
  columnLineage: ColumnLineageGraph
}

export const getColumnLineage = async (
  nodeType: JobOrDataset,
  namespace: string,
  name: string,
  depth: number
) => {
  const encodedNamespace = encodeURIComponent(namespace)
  const encodedName = encodeURIComponent(name)
  const nodeId = generateNodeId(nodeType, encodedNamespace, encodedName)
  const url = `${API_URL}/column-lineage?nodeId=${nodeId}&depth=${depth}`
  return genericFetchWrapper(url, { method: 'GET' }, 'fetchColumnLineage')
}
