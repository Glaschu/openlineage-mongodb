// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, RenderHookOptions } from '@testing-library/react'
import React, { ReactNode } from 'react'

// Returns a fresh QueryClient that doesn't retry, so failed mocks don't spin forever.
export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })

export const renderQueryHook = <Result, Props>(
  callback: (props: Props) => Result,
  options?: Omit<RenderHookOptions<Props>, 'wrapper'>
) => {
  const queryClient = createTestQueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { ...renderHook(callback, { ...options, wrapper }), queryClient }
}
