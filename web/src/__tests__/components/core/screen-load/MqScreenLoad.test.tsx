// Copyright 2018-2024 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { MqScreenLoad } from '../../../../components/core/screen-load/MqScreenLoad'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

describe('MqScreenLoad Component', () => {
  it('should render without crashing', () => {
    const { container } = render(<MqScreenLoad loading={false} />)
    expect(container).toBeInTheDocument()
  })

  it('should show loading spinner when loading is true', () => {
    const { container } = render(<MqScreenLoad loading={true} />)
    const spinner = container.querySelector('.MuiCircularProgress-root')
    expect(spinner).toBeInTheDocument()
  })

  it('should show children when loading is false and children are provided', () => {
    const { container } = render(
      <MqScreenLoad loading={false}>
        <div data-testid='child-content'>Child Content</div>
      </MqScreenLoad>
    )
    expect(screen.getByTestId('child-content')).toBeInTheDocument()
  })

  it('should not show children when loading is true', () => {
    const { container } = render(
      <MqScreenLoad loading={true}>
        <div data-testid='child-content'>Child Content</div>
      </MqScreenLoad>
    )
    expect(screen.queryByTestId('child-content')).not.toBeInTheDocument()
  })

  it('should show loading spinner when children are not provided', () => {
    const { container } = render(<MqScreenLoad loading={false} />)
    const spinner = container.querySelector('.MuiCircularProgress-root')
    expect(spinner).toBeInTheDocument()
  })

  it('should use custom height when provided', () => {
    const { container } = render(<MqScreenLoad loading={true} customHeight='500px' />)
    const loadingBox = container.querySelector('[style*="height"]')
    expect(loadingBox).toBeInTheDocument()
  })

  it('should use default height when customHeight is not provided', () => {
    const { container } = render(<MqScreenLoad loading={true} />)
    const loadingBox = container.querySelector('[style*="height"]')
    expect(loadingBox).toBeInTheDocument()
  })

  it('should render CircularProgress with primary color', () => {
    const { container } = render(<MqScreenLoad loading={true} />)
    const spinner = container.querySelector('.MuiCircularProgress-colorPrimary')
    expect(spinner).toBeInTheDocument()
  })

  it('should transition from loading to content', () => {
    const { container, rerender } = render(<MqScreenLoad loading={true} />)
    let spinner = container.querySelector('.MuiCircularProgress-root')
    expect(spinner).toBeInTheDocument()

    rerender(
      <MqScreenLoad loading={false}>
        <div data-testid='loaded-content'>Loaded Content</div>
      </MqScreenLoad>
    )

    expect(screen.getByTestId('loaded-content')).toBeInTheDocument()
    spinner = container.querySelector('.MuiCircularProgress-root')
    expect(spinner).not.toBeInTheDocument()
  })

  it('should render complex children components', () => {
    const ComplexChild = () => (
      <div data-testid='complex-child'>
        <h1>Title</h1>
        <p>Content</p>
      </div>
    )

    render(
      <MqScreenLoad loading={false}>
        <ComplexChild />
      </MqScreenLoad>
    )

    expect(screen.getByTestId('complex-child')).toBeInTheDocument()
  })
})
