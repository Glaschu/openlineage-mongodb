import { addTags, getTags } from '../store/requests/tags'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export const useTags = () => {
  return useQuery({
    queryKey: ['tags'],
    queryFn: () => getTags(),
  })
}

export const useAddTags = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ tag, description }: { tag: string; description: string }) =>
      addTags(tag, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
    },
  })
}
