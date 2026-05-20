// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { API_URL } from '@/app/globals'
import { Events } from '@/shared/types/api'
import { genericFetchWrapper } from '@/shared/api/fetch'

export const getEvents = async (
  after = '',
  before = '',
  limit = 100,
  offset = 0,
  sortDirection = 'desc'
) => {
  const url = `${API_URL}/events/lineage?limit=${limit}&before=${before}&after=${after}&offset=${offset}&sortDirection=${sortDirection}`
  return genericFetchWrapper(url, { method: 'GET' }, 'fetchEvents').then((events: Events) => {
    return events
  })
}
