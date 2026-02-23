import { JobOrDataset } from '../types/lineage'
import { getLineage } from '../store/requests/lineage'
import { keepPreviousData, useQuery } from '@tanstack/react-query'

export const useLineage = (
  nodeType: JobOrDataset,
  namespace: string,
  name: string,
  depth: number,
  aggregateByParent = false
) => {
  return useQuery({
    queryKey: ['lineage', nodeType, namespace, name, depth, aggregateByParent],
    queryFn: () => getLineage(nodeType, namespace, name, depth, aggregateByParent),
    placeholderData: keepPreviousData,
  })
}
