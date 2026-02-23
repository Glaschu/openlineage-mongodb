import { getEvents } from '../store/requests/events'
import { useQuery } from '@tanstack/react-query'

export const useEvents = (
  after = '',
  before = '',
  limit = 100,
  offset = 0,
  sortDirection = 'desc'
) => {
  return useQuery({
    queryKey: ['events', after, before, limit, offset, sortDirection],
    queryFn: () => getEvents(after, before, limit, offset, sortDirection),
  })
}
