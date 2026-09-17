import { Provider } from 'react-redux'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RenderOptions, render } from '@testing-library/react'
import { legacy_createStore as createStore } from '@reduxjs/toolkit'
import React, { ReactElement } from 'react'

/**
 * Slices a rendered component may read even when a test says nothing about
 * them. Without these a component that selects from a slice crashes on an
 * undefined branch, which says nothing about the behaviour under test.
 */
const DEFAULT_STATE = {
  migration: { members: [], columnMembers: [] },
}

const createMockStore = (initialState: any) => {
  return createStore(() => ({ ...DEFAULT_STATE, ...initialState }))
}

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

export const renderWithProviders = (
  ui: ReactElement,
  {
    initialState = {},
    store = createMockStore(initialState),
    ...renderOptions
  }: { initialState?: any; store?: any } & RenderOptions = {}
) => {
  const queryClient = createTestQueryClient()
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return (
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </Provider>
    )
  }
  return render(ui, { wrapper: Wrapper, ...renderOptions })
}
