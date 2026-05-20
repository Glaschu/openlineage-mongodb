// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { Box, Container, CssBaseline } from '@mui/material'
import { Helmet } from 'react-helmet-async'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import React, { ReactElement } from 'react'

import { AppProviders } from './providers'
import { AppRouter } from './router'
import Header from '@/shared/components/Header/Header'
import Sidenav from '@/shared/components/Sidenav/Sidenav'
import Toast from '@/shared/components/Toast'

const TITLE = 'Marquez'

const App = (): ReactElement => (
  <AppProviders>
    <Helmet>
      <title>{TITLE}</title>
    </Helmet>
    <CssBaseline />
    <Box ml={'80px'}>
      <Sidenav />
      <Container maxWidth={'lg'} disableGutters={true}>
        <Header />
      </Container>
      <AppRouter />
      <Toast />
    </Box>
    <ReactQueryDevtools initialIsOpen={false} />
  </AppProviders>
)

export default App
