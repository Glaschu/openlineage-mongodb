import { getJobFacets, getRunFacets } from '../store/requests'
import { useQuery } from '@tanstack/react-query'

export const useRunFacets = (runId: string) => {
  return useQuery({
    queryKey: ['runFacets', runId],
    queryFn: () => getRunFacets(runId),
    enabled: !!runId,
  })
}

export const useJobFacets = (runId: string) => {
  return useQuery({
    queryKey: ['jobFacets', runId],
    queryFn: () => getJobFacets(runId),
    enabled: !!runId,
  })
}
