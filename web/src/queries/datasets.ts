import {
  addDatasetFieldTag,
  addDatasetTag,
  deleteDataset,
  deleteDatasetFieldTag,
  deleteDatasetTag,
  getDataset,
  getDatasetVersions,
  getDatasets,
} from '../store/requests/datasets'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export const useDatasets = (namespace: string, limit = 20, offset = 0) => {
  return useQuery({
    queryKey: ['datasets', namespace, limit, offset],
    queryFn: () => getDatasets(namespace, limit, offset),
    enabled: !!namespace,
  })
}

export const useDataset = (namespace: string, datasetName: string, enabled = true) => {
  return useQuery({
    queryKey: ['datasets', namespace, datasetName],
    queryFn: () => getDataset(namespace, datasetName),
    enabled: !!namespace && !!datasetName && enabled,
  })
}

export const useDatasetVersions = (
  namespace: string,
  datasetName: string,
  limit = 25,
  offset = 0
) => {
  return useQuery({
    queryKey: ['datasetVersions', namespace, datasetName, limit, offset],
    queryFn: () => getDatasetVersions(namespace, datasetName, limit, offset),
    enabled: !!namespace && !!datasetName,
  })
}

export const useDeleteDataset = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ namespace, datasetName }: { namespace: string; datasetName: string }) =>
      deleteDataset(namespace, datasetName),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['datasets', variables.namespace] })
    },
  })
}

export const useAddDatasetTag = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      namespace,
      datasetName,
      tag,
    }: {
      namespace: string
      datasetName: string
      tag: string
    }) => addDatasetTag(namespace, datasetName, tag),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['datasets', variables.namespace, variables.datasetName],
      })
    },
  })
}

export const useDeleteDatasetTag = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      namespace,
      datasetName,
      tag,
    }: {
      namespace: string
      datasetName: string
      tag: string
    }) => deleteDatasetTag(namespace, datasetName, tag),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['datasets', variables.namespace, variables.datasetName],
      })
    },
  })
}

export const useAddDatasetFieldTag = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      namespace,
      datasetName,
      field,
      tag,
    }: {
      namespace: string
      datasetName: string
      field: string
      tag: string
    }) => addDatasetFieldTag(namespace, datasetName, field, tag),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['datasets', variables.namespace, variables.datasetName],
      })
    },
  })
}

export const useDeleteDatasetFieldTag = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      namespace,
      datasetName,
      field,
      tag,
    }: {
      namespace: string
      datasetName: string
      field: string
      tag: string
    }) => deleteDatasetFieldTag(namespace, datasetName, field, tag),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['datasets', variables.namespace, variables.datasetName],
      })
    },
  })
}
