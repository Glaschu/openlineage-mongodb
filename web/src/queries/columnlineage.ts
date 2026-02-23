import { JobOrDataset } from '../types/lineage'
import { getColumnLineage } from '../store/requests/columnlineage'
import { keepPreviousData, useQuery } from '@tanstack/react-query'

export const useColumnLineage = (
  nodeType: JobOrDataset,
  namespace: string,
  name: string,
  depth: number
) => {
  return useQuery({
    queryKey: ['column-lineage', nodeType, namespace, name, depth],
    queryFn: () => getColumnLineage(nodeType, namespace, name, depth),
    placeholderData: keepPreviousData,
  })
}
