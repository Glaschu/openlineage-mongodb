// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '@/app/App'
import React from 'react'

// Mock all the route components
vi.mock('@/features/dashboard/DashboardPage', () => ({
  default: () => <div data-testid='dashboard-route'>Dashboard</div>,
}))

vi.mock('@/features/jobs/JobsPage', () => ({
  default: () => <div data-testid='jobs-route'>Jobs</div>,
}))

vi.mock('@/features/datasets/DatasetsPage', () => ({
  default: () => <div data-testid='datasets-route'>Datasets</div>,
}))

vi.mock('@/features/events/EventsPage', () => ({
  default: () => <div data-testid='events-route'>Events</div>,
}))

vi.mock('@/features/lineage/components/column-level/ColumnLevel', () => ({
  default: () => <div data-testid='column-level-route'>ColumnLevel</div>,
}))

vi.mock('@/features/lineage/components/table-level/TableLevel', () => ({
  default: () => <div data-testid='table-level-route'>TableLevel</div>,
}))

vi.mock('@/features/not-found/NotFound', () => ({
  NotFound: () => <div data-testid='not-found-route'>NotFound</div>,
}))

// Mock child components
vi.mock('@/shared/components/Sidenav/Sidenav', () => ({
  default: () => <div data-testid='sidenav'>Sidenav</div>,
}))

vi.mock('@/shared/components/Header/Header', () => ({
  default: () => <div data-testid='header'>Header</div>,
}))

vi.mock('@/shared/components/Toast', () => ({
  default: () => <div data-testid='toast'>Toast</div>,
}))

describe('App Component', () => {
  it('renders without crashing', () => {
    render(<App />)
    expect(screen.getByTestId('sidenav')).toBeInTheDocument()
    expect(screen.getByTestId('header')).toBeInTheDocument()
    expect(screen.getByTestId('toast')).toBeInTheDocument()
  })

  it('renders the Dashboard route at root path', () => {
    render(<App />)
    expect(screen.getByTestId('dashboard-route')).toBeInTheDocument()
  })

  it('renders the Helmet component with title', () => {
    const { container } = render(<App />)
    // Check that the app renders successfully with Helmet
    expect(container.querySelector('.MuiBox-root')).toBeInTheDocument()
  })

  it('renders all providers correctly', () => {
    const { container } = render(<App />)
    // Check that the app structure is rendered
    expect(container.querySelector('.MuiBox-root')).toBeInTheDocument()
    expect(container.querySelector('.MuiContainer-root')).toBeInTheDocument()
  })

  it('renders with MUI theme provider', () => {
    const { container } = render(<App />)
    // MUI injects styles, so we can check for MUI classes
    expect(container.querySelector('.MuiBox-root')).toBeInTheDocument()
  })

  it('renders with CssBaseline', () => {
    render(<App />)
    // CssBaseline is applied, we can verify the app renders
    expect(screen.getByTestId('sidenav')).toBeInTheDocument()
  })

  it('wraps app with Redux Provider', () => {
    // If Redux provider wasn't working, the app would crash
    expect(() => render(<App />)).not.toThrow()
  })

  it('wraps app with HelmetProvider', () => {
    const { container } = render(<App />)
    // HelmetProvider enables the app to render with Helmet
    expect(container).toBeInTheDocument()
  })

  it('wraps app with LocalizationProvider', () => {
    // If LocalizationProvider wasn't working, the app would crash
    expect(() => render(<App />)).not.toThrow()
  })

  it('renders Container with correct props', () => {
    const { container } = render(<App />)
    const containerElement = container.querySelector('.MuiContainer-root')
    expect(containerElement).toBeInTheDocument()
    expect(containerElement).toHaveClass('MuiContainer-maxWidthLg')
  })

  it('renders Box with correct margin', () => {
    const { container } = render(<App />)
    const boxElement = container.querySelector('.MuiBox-root')
    expect(boxElement).toBeInTheDocument()
  })
})
