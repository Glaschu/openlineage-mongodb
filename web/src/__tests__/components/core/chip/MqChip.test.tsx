// Copyright 2018-2024 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest'
import { faDatabase } from '@fortawesome/free-solid-svg-icons'
import { fireEvent, render, screen } from '@testing-library/react'
import MqChip from '../../../../components/core/chip/MqChip'

describe('MqChip Component', () => {
  it('should render without crashing', () => {
    const { container } = render(<MqChip value='test-chip' />)
    expect(container).toBeInTheDocument()
  })

  it('should render with text', () => {
    const { container } = render(<MqChip value='test-chip' text='Test Chip' />)
    expect(container.textContent).toContain('Test Chip')
  })

  it('should render with icon', () => {
    const { container } = render(
      <MqChip
        value='test-chip'
        icon={faDatabase}
        foregroundColor='#ffffff'
        backgroundColor='#000000'
      />
    )
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('should render with both icon and text', () => {
    const { container } = render(
      <MqChip
        value='test-chip'
        text='Test Chip'
        icon={faDatabase}
        foregroundColor='#ffffff'
        backgroundColor='#000000'
      />
    )
    expect(container.querySelector('svg')).toBeInTheDocument()
    expect(container.textContent).toContain('Test Chip')
  })

  it('should handle click when selectable and onSelect is provided', () => {
    const handleSelect = vi.fn()
    const { container } = render(
      <MqChip value='test-chip' text='Test Chip' onSelect={handleSelect} />
    )
    const chipElement = container.querySelector('#chip-test-chip')
    if (chipElement) {
      fireEvent.click(chipElement)
      expect(handleSelect).toHaveBeenCalledWith('test-chip')
    }
  })

  it('should not call onSelect when selectable is false', () => {
    const handleSelect = vi.fn()
    const { container } = render(
      <MqChip value='test-chip' text='Test Chip' onSelect={handleSelect} selectable={false} />
    )
    const chipElement = container.querySelector('#chip-test-chip')
    if (chipElement) {
      fireEvent.click(chipElement)
      expect(handleSelect).not.toHaveBeenCalled()
    }
  })

  it('should display with selected state', () => {
    const { container } = render(<MqChip value='test-chip' text='Test Chip' selected={true} />)
    const chipElement = container.querySelector('#chip-test-chip')
    expect(chipElement).toBeInTheDocument()
  })

  it('should have correct chip id', () => {
    const { container } = render(<MqChip value='my-unique-chip' text='Test' />)
    expect(container.querySelector('#chip-my-unique-chip')).toBeInTheDocument()
  })
})
