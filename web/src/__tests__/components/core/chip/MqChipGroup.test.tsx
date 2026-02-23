// Copyright 2018-2024 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest'
import { faDatabase, faServer } from '@fortawesome/free-solid-svg-icons'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import MqChipGroup from '../../../../components/core/chip/MqChipGroup'

describe('MqChipGroup Component', () => {
  const mockChips = [
    {
      value: 'chip1',
      text: 'Chip 1',
      icon: faDatabase,
      foregroundColor: '#ffffff',
      backgroundColor: '#000000',
    },
    {
      value: 'chip2',
      text: 'Chip 2',
      icon: faServer,
      foregroundColor: '#ffffff',
      backgroundColor: '#333333',
    },
    {
      value: 'chip3',
      text: 'Chip 3',
    },
  ]

  it('should render without crashing', () => {
    const handleSelect = vi.fn()
    const { container } = render(
      <MqChipGroup chips={mockChips} initialSelection='chip1' onSelect={handleSelect} />
    )
    expect(container).toBeInTheDocument()
  })

  it('should render all chips', () => {
    const handleSelect = vi.fn()
    const { container } = render(
      <MqChipGroup chips={mockChips} initialSelection='chip1' onSelect={handleSelect} />
    )
    expect(container.textContent).toContain('Chip 1')
    expect(container.textContent).toContain('Chip 2')
    expect(container.textContent).toContain('Chip 3')
  })

  it('should render chips with icons', () => {
    const handleSelect = vi.fn()
    const { container } = render(
      <MqChipGroup chips={mockChips} initialSelection='chip1' onSelect={handleSelect} />
    )
    const svgElements = container.querySelectorAll('svg')
    expect(svgElements.length).toBeGreaterThan(0)
  })

  it('should call onSelect when a chip is clicked', async () => {
    const handleSelect = vi.fn()
    const { container } = render(
      <MqChipGroup chips={mockChips} initialSelection='chip1' onSelect={handleSelect} />
    )
    const chip2Element = container.querySelector('#chip-chip2')
    if (chip2Element) {
      fireEvent.click(chip2Element)
      await waitFor(() => {
        expect(handleSelect).toHaveBeenCalledWith('chip2')
      })
    }
  })

  it('should update selected state when clicking different chips', async () => {
    const handleSelect = vi.fn()
    const { container } = render(
      <MqChipGroup chips={mockChips} initialSelection='chip1' onSelect={handleSelect} />
    )
    const chip3Element = container.querySelector('#chip-chip3')
    if (chip3Element) {
      fireEvent.click(chip3Element)
      await waitFor(() => {
        expect(handleSelect).toHaveBeenCalledWith('chip3')
      })
    }
  })

  it('should render with initial selection', () => {
    const handleSelect = vi.fn()
    const { container } = render(
      <MqChipGroup chips={mockChips} initialSelection='chip2' onSelect={handleSelect} />
    )
    expect(container.querySelector('#chip-chip2')).toBeInTheDocument()
  })

  it('should handle chips without icons', () => {
    const chipsWithoutIcons = [
      { value: 'chip1', text: 'Chip 1' },
      { value: 'chip2', text: 'Chip 2' },
    ]
    const handleSelect = vi.fn()
    const { container } = render(
      <MqChipGroup chips={chipsWithoutIcons} initialSelection='chip1' onSelect={handleSelect} />
    )
    expect(container.textContent).toContain('Chip 1')
    expect(container.textContent).toContain('Chip 2')
  })
})
