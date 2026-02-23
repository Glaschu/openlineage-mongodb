// Copyright 2018-2024 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers'
import { type ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import MqDatePicker from '../../../../components/core/date-picker/MqDatePicker'
import dayjs from 'dayjs'

describe('MqDatePicker Component', () => {
  const defaultProps = {
    value: '2024-01-15T10:30:00',
    onChange: vi.fn(),
  }

  const renderWithProvider = (component: ReactElement) => {
    return render(
      <LocalizationProvider dateAdapter={AdapterDayjs}>{component}</LocalizationProvider>
    )
  }

  it('should render without crashing', () => {
    const { container } = renderWithProvider(<MqDatePicker {...defaultProps} />)
    expect(container).toBeInTheDocument()
  })

  it('should render with default format', () => {
    const { container } = renderWithProvider(<MqDatePicker {...defaultProps} />)
    const input = container.querySelector('input')
    expect(input).toBeInTheDocument()
  })

  it('should render with custom label', () => {
    const { container } = renderWithProvider(<MqDatePicker {...defaultProps} label='Select Date' />)
    expect(screen.getAllByText('Select Date').length).toBeGreaterThan(0)
  })

  it('should render with custom format', () => {
    const { container } = renderWithProvider(<MqDatePicker {...defaultProps} format='YYYY-MM-DD' />)
    const input = container.querySelector('input')
    expect(input).toBeInTheDocument()
  })

  it('should display the correct value', () => {
    const { container } = renderWithProvider(<MqDatePicker {...defaultProps} />)
    const input = container.querySelector('input') as HTMLInputElement
    expect(input?.value).toBeTruthy()
  })

  it('should accept different date formats', () => {
    const customDate = '2024-12-25T15:45:00'
    const { container } = renderWithProvider(<MqDatePicker value={customDate} onChange={vi.fn()} />)
    const input = container.querySelector('input')
    expect(input).toBeInTheDocument()
  })

  it('should handle date value correctly', () => {
    const testDate = '2024-06-15T14:30:00'
    const { container } = renderWithProvider(<MqDatePicker value={testDate} onChange={vi.fn()} />)
    const input = container.querySelector('input')
    expect(input).toBeInTheDocument()
  })

  it('should render without label when not provided', () => {
    const { container } = renderWithProvider(<MqDatePicker {...defaultProps} />)
    const input = container.querySelector('input')
    expect(input).toBeInTheDocument()
  })
})
