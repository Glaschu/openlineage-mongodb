import { getNamespaces } from '../store/requests/namespaces'
import { useQuery } from '@tanstack/react-query'

export const useNamespaces = () => {
  return useQuery({
    queryKey: ['namespaces'],
    queryFn: () => getNamespaces(),
    staleTime: 1000 * 60 * 60, // Namespaces rarely change, cache for 1 hour
  })
}
