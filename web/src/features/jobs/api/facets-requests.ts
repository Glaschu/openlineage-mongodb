// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { API_URL } from '@/app/globals'
import { Facets } from '@/shared/types/api'
import { genericFetchWrapper } from '@/shared/api/fetch'

export const getRunFacets = async (runId: string) => {
  const url = `${API_URL}/jobs/runs/${runId}/facets?type=run`
  return genericFetchWrapper(url, { method: 'GET' }, 'fetchRunFacets').then((r: Facets) => r)
}

export const getJobFacets = async (runId: string) => {
  const url = `${API_URL}/jobs/runs/${runId}/facets?type=job`
  return genericFetchWrapper(url, { method: 'GET' }, 'fetchJobFacets').then((r: Facets) => r)
}
