// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { API_URL } from '@/app/globals'
import { genericFetchWrapper } from '@/shared/api/fetch'

export const getNamespaces = async () => {
  const url = `${API_URL}/namespaces`
  return genericFetchWrapper(url, { method: 'GET' }, 'fetchNamespaces')
}
