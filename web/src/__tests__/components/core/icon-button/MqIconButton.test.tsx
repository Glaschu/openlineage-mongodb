// Copyright 2018-2024 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { BrowserRouter } from 'react-router-dom'
import Home from '@mui/icons-material/Home'
import { type ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import MqIconButton from '../../../../components/core/icon-button/MqIconButton'

describe('MqIconButton Component', () => {
  const defaultProps = {
    id: 'test-button',
    title: 'Test Button',
    active: false,
    to: '/test-route',
    children: <Home />,
  }

  const renderWithRouter = (component: ReactElement) => {
    return render(<BrowserRouter>{component}</BrowserRouter>)
  }

  it('should render without crashing', () => {
    const { container } = renderWithRouter(<MqIconButton {...defaultProps} />)
    expect(container).toBeInTheDocument()
  })

  it('should render with correct title', () => {
    renderWithRouter(<MqIconButton {...defaultProps} />)
    expect(screen.getByText('Test Button')).toBeInTheDocument()
  })

  it('should render with correct id', () => {
    const { container } = renderWithRouter(<MqIconButton {...defaultProps} />)
    const button = container.querySelector('#test-button')
    expect(button).toBeInTheDocument()
  })

  it('should render children icon', () => {
    const { container } = renderWithRouter(<MqIconButton {...defaultProps} />)
    const icon = container.querySelector('svg')
    expect(icon).toBeInTheDocument()
  })

  it('should apply active state styling', () => {
    const { container } = renderWithRouter(<MqIconButton {...defaultProps} active={true} />)
    const button = container.querySelector('#test-button')
    expect(button).toBeInTheDocument()
  })

  it('should apply inactive state styling', () => {
    const { container } = renderWithRouter(<MqIconButton {...defaultProps} active={false} />)
    const button = container.querySelector('#test-button')
    expect(button).toBeInTheDocument()
  })

  it('should link to correct route', () => {
    const { container } = renderWithRouter(<MqIconButton {...defaultProps} to='/dashboard' />)
    const link = container.querySelector('a[href="/dashboard"]')
    expect(link).toBeInTheDocument()
  })

  it('should render with different icon', () => {
    const customIcon = <div data-testid='custom-icon'>Custom</div>
    const { container } = renderWithRouter(<MqIconButton {...defaultProps} children={customIcon} />)
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
  })

  it('should have correct button base properties', () => {
    const { container } = renderWithRouter(<MqIconButton {...defaultProps} />)
    const anchor = container.querySelector('a')
    expect(anchor).toBeInTheDocument()
  })

  it('should display title below button', () => {
    renderWithRouter(<MqIconButton {...defaultProps} title='Dashboard' />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })
})
