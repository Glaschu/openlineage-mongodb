// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import Assertions from '../../../components/datasets/Assertions'
import React from 'react'
import type { Assertion } from '../../../types/api'

describe('Assertions Component', () => {
  const mockAssertions: Assertion[] = [
    {
      column: 'email',
      assertion: 'NOT_NULL',
      success: true,
    },
    {
      column: 'age',
      assertion: 'RANGE(0, 120)',
      success: false,
    },
    {
      column: 'status',
      assertion: 'IN(active, inactive, pending)',
      success: true,
    },
  ]

  it('should return null when assertions array is empty', () => {
    const { container } = render(<Assertions assertions={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('should render table with assertions', () => {
    render(<Assertions assertions={mockAssertions} />)

    expect(screen.getByText('email')).toBeTruthy()
    expect(screen.getByText('NOT_NULL')).toBeTruthy()
    const passElements = screen.getAllByText('PASS')
    expect(passElements.length).toBeGreaterThan(0)

    expect(screen.getByText('age')).toBeTruthy()
    expect(screen.getByText('RANGE(0, 120)')).toBeTruthy()
    expect(screen.getByText('FAIL')).toBeTruthy()

    expect(screen.getByText('status')).toBeTruthy()
    expect(screen.getByText('IN(active, inactive, pending)')).toBeTruthy()
  })

  it('should render table headers when hasHeader is true', () => {
    render(<Assertions assertions={mockAssertions} hasHeader={true} />)

    expect(screen.getByText('COLUMN')).toBeTruthy()
    expect(screen.getByText('ASSERTION')).toBeTruthy()
    expect(screen.getByText('STATUS')).toBeTruthy()
  })

  it('should not render table headers when hasHeader is false', () => {
    render(<Assertions assertions={mockAssertions} hasHeader={false} />)

    expect(screen.queryByText('COLUMN')).toBeFalsy()
    expect(screen.queryByText('ASSERTION')).toBeFalsy()
    expect(screen.queryByText('STATUS')).toBeFalsy()
  })

  it('should not render table headers by default', () => {
    render(<Assertions assertions={mockAssertions} />)

    expect(screen.queryByText('COLUMN')).toBeFalsy()
    expect(screen.queryByText('ASSERTION')).toBeFalsy()
    expect(screen.queryByText('STATUS')).toBeFalsy()
  })

  it('should render all assertions in the array', () => {
    render(<Assertions assertions={mockAssertions} />)

    const rows = screen.getAllByRole('row')
    // Should have 3 rows (one for each assertion)
    expect(rows.length).toBe(3)
  })

  it('should display success status as PASS', () => {
    const successAssertion: Assertion[] = [
      {
        column: 'test',
        assertion: 'TEST',
        success: true,
      },
    ]

    render(<Assertions assertions={successAssertion} />)
    expect(screen.getByText('PASS')).toBeTruthy()
  })

  it('should display failure status as FAIL', () => {
    const failureAssertion: Assertion[] = [
      {
        column: 'test',
        assertion: 'TEST',
        success: false,
      },
    ]

    render(<Assertions assertions={failureAssertion} />)
    expect(screen.getByText('FAIL')).toBeTruthy()
  })

  it('should render table structure correctly', () => {
    const { container } = render(<Assertions assertions={mockAssertions} hasHeader={true} />)

    const table = container.querySelector('table')
    const thead = container.querySelector('thead')
    const tbody = container.querySelector('tbody')

    expect(table).toBeTruthy()
    expect(thead).toBeTruthy()
    expect(tbody).toBeTruthy()
  })

  it('should apply small table size', () => {
    const { container } = render(<Assertions assertions={mockAssertions} />)
    const tableCells = container.querySelectorAll('td')
    // Check that table cells have the small size class
    expect(tableCells.length).toBeGreaterThan(0)
  })
})
