import { API_URL } from './index'

export const getAlationMappings = async (namespace?: string, status?: string) => {
    const url = new URL(`${API_URL}/alation-mappings`)
    if (namespace) {
        url.searchParams.append('namespace', namespace)
    }
    if (status) {
        url.searchParams.append('status', status)
    }
    const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
            Accept: 'application/json',
        },
    })

    if (!response.ok) {
        throw new Error('Failed to fetch alation mappings')
    }

    return response.json()
}

export const suggestAlationMappings = async (namespace: string, schemaId: number) => {
    const url = new URL(`${API_URL}/alation-mappings/suggest`)
    url.searchParams.append('namespace', namespace)
    url.searchParams.append('schemaId', schemaId.toString())

    const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
            Accept: 'application/json',
        },
    })

    if (!response.ok) {
        throw new Error('Failed to trigger mappings suggestion')
    }
}

export const acceptAlationMapping = async (id: string) => {
    const url = new URL(`${API_URL}/alation-mappings/${id}/accept`)
    const response = await fetch(url.toString(), {
        method: 'PUT',
        headers: {
            Accept: 'application/json',
        },
    })

    if (!response.ok) {
        throw new Error('Failed to accept alation mapping')
    }

    return response.json()
}

export const rejectAlationMapping = async (id: string) => {
    const url = new URL(`${API_URL}/alation-mappings/${id}/reject`)
    const response = await fetch(url.toString(), {
        method: 'PUT',
        headers: {
            Accept: 'application/json',
        },
    })

    if (!response.ok) {
        throw new Error('Failed to reject alation mapping')
    }

    return response.json()
}
