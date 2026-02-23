// Copyright 2018-2024 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import InfoIcon from '@mui/icons-material/Info'
import { MqInfo } from '../../../../components/core/info/MqInfo'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

describe('MqInfo Component', () => {
  it('should render without crashing', () => {
    const { container } = render(
      <MqInfo icon={<InfoIcon />} label='Test Label' value='Test Value' />
    )
    expect(container).toBeInTheDocument()
  })

  it('should render label correctly', () => {
    render(<MqInfo icon={<InfoIcon />} label='Status' value='Active' />)
    expect(screen.getByText('Status')).toBeInTheDocument()
  })

  it('should render string value correctly', () => {
    render(<MqInfo icon={<InfoIcon />} label='Name' value='Test Name' />)
    expect(screen.getByText('Test Name')).toBeInTheDocument()
  })

  it('should render numeric value correctly', () => {
    render(<MqInfo icon={<InfoIcon />} label='Count' value={42} />)
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('should render icon', () => {
    const { container } = render(
      <MqInfo icon={<InfoIcon data-testid='info-icon' />} label='Test' value='Value' />
    )
    expect(screen.getByTestId('info-icon')).toBeInTheDocument()
  })

  it('should render ReactElement as value', () => {
    const customValue = <span data-testid='custom-value'>Custom Element</span>
    render(<MqInfo icon={<InfoIcon />} label='Custom' value={customValue} />)
    expect(screen.getByTestId('custom-value')).toBeInTheDocument()
    expect(screen.getByText('Custom Element')).toBeInTheDocument()
  })

  it('should render multiple MqInfo components', () => {
    const { container } = render(
      <>
        <MqInfo icon={<InfoIcon />} label='Label 1' value='Value 1' />
        <MqInfo icon={<InfoIcon />} label='Label 2' value='Value 2' />
      </>
    )
    expect(screen.getByText('Label 1')).toBeInTheDocument()
    expect(screen.getByText('Value 1')).toBeInTheDocument()
    expect(screen.getByText('Label 2')).toBeInTheDocument()
    expect(screen.getByText('Value 2')).toBeInTheDocument()
  })

  it('should render with complex ReactElement value', () => {
    const complexValue = (
      <div data-testid='complex-value'>
        <span>Complex</span>
        <span>Value</span>
      </div>
    )
    render(<MqInfo icon={<InfoIcon />} label='Complex' value={complexValue} />)
    expect(screen.getByTestId('complex-value')).toBeInTheDocument()
  })

  it('should render zero as value', () => {
    render(<MqInfo icon={<InfoIcon />} label='Zero Value' value={0} />)
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('should render empty string as value', () => {
    render(<MqInfo icon={<InfoIcon />} label='Empty' value='' />)
    expect(screen.getByText('Empty')).toBeInTheDocument()
  })

  it('should render with different icon', () => {
    const CustomIcon = () => <div data-testid='custom-icon'>Icon</div>
    render(<MqInfo icon={<CustomIcon />} label='Test' value='Value' />)
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
  })
})
