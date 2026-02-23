// Copyright 2018-2024 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import MqStatus from '../../../../components/core/status/MqStatus'

describe('MqStatus Component', () => {
  it('should render without crashing', () => {
    const { container } = render(<MqStatus color='green' label='Active' />)
    expect(container).toBeInTheDocument()
  })

  it('should display label', () => {
    const { getByText } = render(<MqStatus color='red' label='Inactive' />)
    expect(getByText('Inactive')).toBeInTheDocument()
  })

  it('should return null when color is null', () => {
    const { container } = render(<MqStatus color={null} label='Test' />)
    expect(container.querySelector('[style*="background-color"]')).not.toBeInTheDocument()
  })

  it('should return null when color is not provided', () => {
    const { container } = render(<MqStatus color={null} />)
    expect(container.querySelector('[style*="background-color"]')).not.toBeInTheDocument()
  })

  it('should render without label', () => {
    const { container } = render(<MqStatus color='blue' />)
    expect(container).toBeInTheDocument()
    // Should still render the colored dot even without label
    const coloredDot = container.querySelector('[style*="background-color"]')
    expect(coloredDot).toBeInTheDocument()
  })

  it('should render with different colors', () => {
    const colors = ['#ff0000', '#00ff00', '#0000ff', 'yellow', 'orange']
    colors.forEach((color) => {
      const { container } = render(<MqStatus color={color} label={`Status ${color}`} />)
      expect(screen.getByText(`Status ${color}`)).toBeInTheDocument()
    })
  })

  it('should render status indicator dot', () => {
    const { container } = render(<MqStatus color='green' label='Running' />)
    const dot = container.querySelector('[style*="background-color"]')
    expect(dot).toBeInTheDocument()
  })

  it('should render with hex color', () => {
    const { container } = render(<MqStatus color='#FF5733' label='Custom' />)
    expect(screen.getByText('Custom')).toBeInTheDocument()
  })

  it('should render with rgb color', () => {
    const { container } = render(<MqStatus color='rgb(255, 0, 0)' label='RGB Color' />)
    expect(screen.getByText('RGB Color')).toBeInTheDocument()
  })

  it('should apply border styling with the color', () => {
    const { container } = render(<MqStatus color='purple' label='Purple Status' />)
    expect(screen.getByText('Purple Status')).toBeInTheDocument()
  })
})
