// Copyright 2018-2024 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { MqInputBase, MqInputNoIcon } from '../../../../components/core/input-base/MqInputBase'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

describe('MqInputBase Component', () => {
  it('should render without crashing', () => {
    const { container } = render(<MqInputBase />)
    expect(container).toBeInTheDocument()
  })

  it('should render with placeholder', () => {
    const { container } = render(<MqInputBase placeholder='Enter text' />)
    const input = container.querySelector('input')
    expect(input?.placeholder).toBe('Enter text')
  })

  it('should handle value prop', () => {
    const { container } = render(<MqInputBase value='test value' onChange={() => {}} />)
    const input = container.querySelector('input') as HTMLInputElement
    expect(input?.value).toBe('test value')
  })

  it('should call onChange when input changes', () => {
    const handleChange = vi.fn()
    const { container } = render(<MqInputBase onChange={handleChange} />)
    const input = container.querySelector('input')

    if (input) {
      fireEvent.change(input, { target: { value: 'new value' } })
      expect(handleChange).toHaveBeenCalled()
    }
  })

  it('should accept custom className', () => {
    const { container } = render(<MqInputBase className='custom-class' />)
    expect(container.querySelector('.custom-class')).toBeInTheDocument()
  })

  it('should be disabled when disabled prop is true', () => {
    const { container } = render(<MqInputBase disabled={true} />)
    const input = container.querySelector('input')
    expect(input).toBeDisabled()
  })

  it('should accept type prop', () => {
    const { container } = render(<MqInputBase type='password' />)
    const input = container.querySelector('input')
    expect(input?.type).toBe('password')
  })

  it('should handle multiline prop', () => {
    const { container } = render(<MqInputBase multiline rows={4} />)
    const textarea = container.querySelector('textarea')
    expect(textarea).toBeInTheDocument()
  })

  it('should accept sx prop for custom styling', () => {
    const { container } = render(<MqInputBase sx={{ color: 'red' }} />)
    expect(container).toBeInTheDocument()
  })

  it('should handle autoFocus', () => {
    const { container } = render(<MqInputBase autoFocus />)
    const input = container.querySelector('input')
    expect(input).toBeInTheDocument()
  })
})

describe('MqInputNoIcon Component', () => {
  it('should render without crashing', () => {
    const { container } = render(<MqInputNoIcon />)
    expect(container).toBeInTheDocument()
  })

  it('should render with placeholder', () => {
    const { container } = render(<MqInputNoIcon placeholder='Enter text' />)
    const input = container.querySelector('input')
    expect(input?.placeholder).toBe('Enter text')
  })

  it('should handle value prop', () => {
    const { container } = render(<MqInputNoIcon value='test value' onChange={() => {}} />)
    const input = container.querySelector('input') as HTMLInputElement
    expect(input?.value).toBe('test value')
  })

  it('should call onChange when input changes', () => {
    const handleChange = vi.fn()
    const { container } = render(<MqInputNoIcon onChange={handleChange} />)
    const input = container.querySelector('input')

    if (input) {
      fireEvent.change(input, { target: { value: 'new value' } })
      expect(handleChange).toHaveBeenCalled()
    }
  })

  it('should be disabled when disabled prop is true', () => {
    const { container } = render(<MqInputNoIcon disabled={true} />)
    const input = container.querySelector('input')
    expect(input).toBeDisabled()
  })

  it('should accept type prop', () => {
    const { container } = render(<MqInputNoIcon type='email' />)
    const input = container.querySelector('input')
    expect(input?.type).toBe('email')
  })

  it('should handle multiline prop', () => {
    const { container } = render(<MqInputNoIcon multiline rows={3} />)
    const textarea = container.querySelector('textarea')
    expect(textarea).toBeInTheDocument()
  })
})
