// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { MqScreenLoad } from '@/shared/components/MqScreenLoad/MqScreenLoad'
import { NotFound } from '@/features/not-found/NotFound'
import { Route, Routes } from 'react-router-dom'
import React, { ReactElement, Suspense, lazy } from 'react'

const ColumnLevel = lazy(() => import('@/features/lineage/components/column-level/ColumnLevel'))
const Dashboard = lazy(() => import('@/features/dashboard/DashboardPage'))
const Datasets = lazy(() => import('@/features/datasets/DatasetsPage'))
const Events = lazy(() => import('@/features/events/EventsPage'))
const Jobs = lazy(() => import('@/features/jobs/JobsPage'))
const TableLevel = lazy(() => import('@/features/lineage/components/table-level/TableLevel'))
const AlationMappings = lazy(() => import('@/features/alation/AlationMappingsPage'))

export const AppRouter = (): ReactElement => (
  <Suspense fallback={<MqScreenLoad loading={true} />}>
    <Routes>
      <Route path={'/'} element={<Dashboard />} />
      <Route path={'/jobs'} element={<Jobs />} />
      <Route path={'/datasets'} element={<Datasets />} />
      <Route path={'/events'} element={<Events />} />
      <Route path={'/datasets/column-level/:namespace/:name'} element={<ColumnLevel />} />
      <Route path={'/lineage/:nodeType/:namespace/:name'} element={<TableLevel />} />
      <Route path={'/alation-mappings'} element={<AlationMappings />} />
      <Route path='*' element={<NotFound />} />
    </Routes>
  </Suspense>
)
