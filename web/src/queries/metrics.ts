import { getIntervalMetrics, getLineageMetrics } from '../store/requests'
import { useQuery } from '@tanstack/react-query'

export const useIntervalMetrics = (
  asset: 'jobs' | 'datasets' | 'sources',
  unit: 'day' | 'week'
) => {
  return useQuery({
    queryKey: ['metrics', asset, unit],
    queryFn: () => getIntervalMetrics({ asset, unit }),
    refetchInterval: 30000, // Metrics often update, maybe poll? Or just standard cache.
  })
}

export const useLineageMetrics = (unit: 'day' | 'week') => {
  return useQuery({
    queryKey: ['lineageMetrics', unit],
    queryFn: () => getLineageMetrics({ unit }),
  })
}
