// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0
//
// App providers. Composition order matters: outer providers must be available to inner ones.
//
// State strategy:
//   - React Query owns all server data (datasets, jobs, lineage, search results).
//   - Redux owns cross-cutting UI state (displaySlice — theme/layout prefs).
//   - Feature-scoped UI state (selected lineage node, current namespace) lives in
//     feature slice.ts files, registered in @/store/store.ts.

import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { LocalizationProvider } from '@mui/x-date-pickers'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Provider as ReduxProvider } from 'react-redux'
import { StyledEngineProvider, ThemeProvider } from '@mui/material/styles'
import React, { ReactElement, ReactNode } from 'react'

import { theme } from '@/shared/theme/theme'
import store from '@/store/store'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
})

interface Props {
  children: ReactNode
}

export const AppProviders = ({ children }: Props): ReactElement => (
  <QueryClientProvider client={queryClient}>
    <ReduxProvider store={store}>
      <HelmetProvider>
        <BrowserRouter>
          <StyledEngineProvider injectFirst>
            <ThemeProvider theme={theme}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>{children}</LocalizationProvider>
            </ThemeProvider>
          </StyledEngineProvider>
        </BrowserRouter>
      </HelmetProvider>
    </ReduxProvider>
  </QueryClientProvider>
)

export { queryClient }
