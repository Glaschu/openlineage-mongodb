import { Nullable } from '../types/util/Nullable'
import { RunState } from '../types/api'
import {
  addJobTag,
  deleteJob,
  deleteJobTag,
  getJob,
  getJobs,
  getRuns,
} from '../store/requests/jobs'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export const useJobs = (
  namespace: Nullable<string>,
  limit = 25,
  offset = 0,
  lastRunStates?: RunState,
  hasLineage = false
) => {
  return useQuery({
    queryKey: ['jobs', namespace, limit, offset, lastRunStates, hasLineage],
    queryFn: () => getJobs(namespace, limit, offset, lastRunStates, hasLineage),
    enabled: true, // Jobs can be fetched without namespace (all jobs)
  })
}
export const useJob = (namespace: string, jobName: string) => {
  return useQuery({
    queryKey: ['jobs', namespace, jobName],
    queryFn: () => getJob(namespace, jobName),
    enabled: !!namespace && !!jobName,
  })
}

export const useJobRuns = (namespace: string, jobName: string, limit = 25, offset = 0) => {
  return useQuery({
    queryKey: ['runs', namespace, jobName, limit, offset],
    queryFn: () => getRuns(jobName, namespace, limit, offset),
    enabled: !!namespace && !!jobName,
  })
}

export const useDeleteJob = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ namespace, jobName }: { namespace: string; jobName: string }) =>
      deleteJob(namespace, jobName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })
}

export const useAddJobTag = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      namespace,
      jobName,
      tag,
    }: {
      namespace: string
      jobName: string
      tag: string
    }) => addJobTag(namespace, jobName, tag),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['jobs', variables.namespace, variables.jobName] })
    },
  })
}

export const useDeleteJobTag = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      namespace,
      jobName,
      tag,
    }: {
      namespace: string
      jobName: string
      tag: string
    }) => deleteJobTag(namespace, jobName, tag),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['jobs', variables.namespace, variables.jobName] })
    },
  })
}
