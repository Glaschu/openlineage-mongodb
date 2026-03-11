import {
    AlationMapping,
    acceptAlationMapping,
    getAlationMappings,
    rejectAlationMapping,
    suggestAlationMappings,
} from '../store/requests/alation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export const ALATION_MAPPINGS_QUERY_KEY = 'alationMappings'

export const useAlationMappings = (namespace?: string, status?: string) => {
    return useQuery<AlationMapping[]>({
        queryKey: [ALATION_MAPPINGS_QUERY_KEY, namespace, status],
        queryFn: () => getAlationMappings(namespace, status),
    })
}

export const useAcceptMapping = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: acceptAlationMapping,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [ALATION_MAPPINGS_QUERY_KEY] })
        },
    })
}

export const useRejectMapping = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: rejectAlationMapping,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [ALATION_MAPPINGS_QUERY_KEY] })
        },
    })
}

export const useSuggestMappings = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ namespace, schemaId }: { namespace: string; schemaId: number }) =>
            suggestAlationMappings(namespace, schemaId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [ALATION_MAPPINGS_QUERY_KEY] })
        },
    })
}
