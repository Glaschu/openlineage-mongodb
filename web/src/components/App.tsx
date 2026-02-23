// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { Box, Container, CssBaseline } from '@mui/material'
import { Helmet, HelmetProvider } from 'react-helmet-async'
import { LocalizationProvider } from '@mui/x-date-pickers'
import { MqScreenLoad } from './core/screen-load/MqScreenLoad'
import { NotFound } from '../routes/not-found/NotFound'
import { Provider } from 'react-redux'
import { ReduxRouter } from '@lagunovsky/redux-react-router'
import { Route, Routes } from 'react-router-dom'
import { StyledEngineProvider, ThemeProvider } from '@mui/material/styles'

import { theme } from '../helpers/theme'
import Header from './header/Header'
import React, { ReactElement, Suspense, lazy } from 'react'
import Sidenav from './sidenav/Sidenav'
import Toast from './Toast'

const ColumnLevel = lazy(() => import('../routes/column-level/ColumnLevel'))
const Dashboard = lazy(() => import('../routes/dashboard/Dashboard'))
const Datasets = lazy(() => import('../routes/datasets/Datasets'))
const Events = lazy(() => import('../routes/events/Events'))
const Jobs = lazy(() => import('../routes/jobs/Jobs'))
const TableLevel = lazy(() => import('../routes/table-level/TableLevel'))

import { history, default as store } from '../store/store'

const TITLE = 'Marquez'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
})

const App = (): ReactElement => {
  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <HelmetProvider>
          <ReduxRouter history={history}>
            <StyledEngineProvider injectFirst>
              <ThemeProvider theme={theme}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <Helmet>
                    <title>{TITLE}</title>
                  </Helmet>
                  <CssBaseline />
                  <Box ml={'80px'}>
                    <Sidenav />
                    <Container maxWidth={'lg'} disableGutters={true}>
                      <Header />
                    </Container>
                    <Suspense fallback={<MqScreenLoad loading={true} />}>
                      <Routes>
                        <Route path={'/'} element={<Dashboard />} />
                        <Route path={'/jobs'} element={<Jobs />} />
                        <Route path={'/datasets'} element={<Datasets />} />
                        <Route path={'/events'} element={<Events />} />
                        <Route
                          path={'/datasets/column-level/:namespace/:name'}
                          element={<ColumnLevel />}
                        />
                        <Route
                          path={'/lineage/:nodeType/:namespace/:name'}
                          element={<TableLevel />}
                        />
                        <Route path='*' element={<NotFound />} />
                      </Routes>
                    </Suspense>
                    <Toast />
                  </Box>
                </LocalizationProvider>
              </ThemeProvider>
            </StyledEngineProvider>
          </ReduxRouter>
        </HelmetProvider>
      </Provider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

export default App
