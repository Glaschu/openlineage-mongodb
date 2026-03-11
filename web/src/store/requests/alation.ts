import { API_URL } from '../../globals'
import { genericFetchWrapper } from './index'

export interface AlationMapping {
    id: string
    openLineageNamespace: string
    openLineageDatasetName: string
    alationDatasetId: number
    alationDatasetName: string
    confidenceScore: number
    status: 'SUGGESTED' | 'ACCEPTED' | 'REJECTED'
    createdAt: string
    updatedAt: string
}

export const getAlationMappings = async (
    namespace?: string,
    status?: string
): Promise<AlationMapping[]> => {
    const params = new URLSearchParams()
    if (namespace) {
        params.append('namespace', namespace)
    }
    if (status) {
        params.append('status', status)
    }
    const queryString = params.toString()
    const url = `${API_URL}/alation-mappings${queryString ? `?${queryString}` : ''}`
    return genericFetchWrapper(url, { method: 'GET' }, 'getAlationMappings')
}

export const suggestAlationMappings = async (namespace: string, schemaId: number): Promise<void> => {
    const params = new URLSearchParams()
    params.append('namespace', namespace)
    params.append('schemaId', schemaId.toString())
    const url = `${API_URL}/alation-mappings/suggest?${params.toString()}`
    return genericFetchWrapper(url, { method: 'POST' }, 'suggestAlationMappings')
}

export const acceptAlationMapping = async (id: string): Promise<AlationMapping> => {
    const url = `${API_URL}/alation-mappings/${encodeURIComponent(id)}/accept`
    return genericFetchWrapper(url, { method: 'PUT' }, 'acceptAlationMapping')
}

export const rejectAlationMapping = async (id: string): Promise<AlationMapping> => {
    const url = `${API_URL}/alation-mappings/${encodeURIComponent(id)}/reject`
    return genericFetchWrapper(url, { method: 'PUT' }, 'rejectAlationMapping')
}
