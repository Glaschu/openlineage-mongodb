// Copyright 2018-2024 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import MqEmpty from '../../../../components/core/empty/MqEmpty'

describe('MqEmpty Component', () => {
  it('should render without crashing', () => {
    const { container } = render(<MqEmpty title='No Data' body='No data available' />)
    expect(container).toBeInTheDocument()
  })

  it('should display title and body', () => {
    const { getByText } = render(<MqEmpty title='No Results' body='Try a different search' />)
    expect(getByText('No Results')).toBeInTheDocument()
    expect(getByText('Try a different search')).toBeInTheDocument()
  })

  it('should render without title', () => {
    const { container } = render(<MqEmpty body='Only body text' />)
    expect(screen.getByText('Only body text')).toBeInTheDocument()
  })

  it('should render without body', () => {
    const { container } = render(<MqEmpty title='Only title' />)
    expect(screen.getByText('Only title')).toBeInTheDocument()
  })

  it('should render with emoji', () => {
    const { container } = render(<MqEmpty title='No Data' body='No data available' emoji='📭' />)
    expect(screen.getByText('No Data')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'icon' })).toBeInTheDocument()
    expect(screen.getByText('📭')).toBeInTheDocument()
  })

  it('should render with children', () => {
    const CustomChild = () => <div data-testid='custom-child'>Custom Content</div>
    const { container } = render(
      <MqEmpty title='Custom'>
        <CustomChild />
      </MqEmpty>
    )
    expect(screen.getByTestId('custom-child')).toBeInTheDocument()
    expect(screen.getByText('Custom Content')).toBeInTheDocument()
  })

  it('should render with all props', () => {
    const CustomChild = () => <div data-testid='all-props-child'>All Props Child</div>
    const { container } = render(
      <MqEmpty title='Complete Example' body='This has everything' emoji='🎉'>
        <CustomChild />
      </MqEmpty>
    )
    expect(screen.getByText('Complete Example')).toBeInTheDocument()
    expect(screen.getByText('This has everything')).toBeInTheDocument()
    expect(screen.getByText('🎉')).toBeInTheDocument()
    expect(screen.getByTestId('all-props-child')).toBeInTheDocument()
  })

  it('should render without any props', () => {
    const { container } = render(<MqEmpty />)
    expect(container).toBeInTheDocument()
  })

  it('should render with only emoji', () => {
    const { container } = render(<MqEmpty emoji='⚠️' />)
    expect(screen.getByText('⚠️')).toBeInTheDocument()
  })

  it('should render with complex children', () => {
    const ComplexChild = () => (
      <div data-testid='complex-child'>
        <button>Click me</button>
        <p>More info</p>
      </div>
    )
    render(
      <MqEmpty title='Complex'>
        <ComplexChild />
      </MqEmpty>
    )
    expect(screen.getByTestId('complex-child')).toBeInTheDocument()
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })
})
