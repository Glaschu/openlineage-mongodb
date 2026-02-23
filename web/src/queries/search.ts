import { getOpenSearchDatasets, getOpenSearchJobs, getSearch } from '../store/requests/search'
import { useQuery } from '@tanstack/react-query'

import { GroupedSearch, GroupedSearchResult, Search } from '../types/api'

export const useSearch = (q: string, filter = 'ALL', sort = 'NAME', limit = 100) => {
  return useQuery({
    queryKey: ['search', q, filter, sort, limit],
    queryFn: () => getSearch(q, filter, sort, limit),
    select: (data: Search): GroupedSearchResult => {
      const results = new Map<string, GroupedSearch[]>()
      const rawResults: GroupedSearch[] = []

      data.results.forEach((result) => {
        // Create the group string: namespace:name
        const group = `${result.namespace}:${result.name}`
        const groupedSearch: GroupedSearch = { ...result, group }

        if (!results.has(group)) {
          results.set(group, [])
        }
        results.get(group)?.push(groupedSearch)
        rawResults.push(groupedSearch)
      })

      return { results, rawResults }
    },
    enabled: q.length > 0,
  })
}

export const useOpenSearchJobs = (q: string) => {
  return useQuery({
    queryKey: ['openSearchJobs', q],
    queryFn: () => getOpenSearchJobs(q),
    enabled: q.length > 0,
  })
}

export const useOpenSearchDatasets = (q: string) => {
  return useQuery({
    queryKey: ['openSearchDatasets', q],
    queryFn: () => getOpenSearchDatasets(q),
    enabled: q.length > 0,
  })
}
