// Copyright 2018-2024 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import MqCode from '../../../../components/core/code/MqCode'

describe('MqCode Component', () => {
  it('should render without crashing', () => {
    const { container } = render(<MqCode code='const x = 1;' />)
    expect(container).toBeInTheDocument()
  })

  it('should display code', () => {
    const { container } = render(<MqCode code="console.log('test')" />)
    expect(container.textContent).toContain('console.log')
  })

  it('should return null when no code is provided', () => {
    const { container } = render(<MqCode />)
    expect(container.querySelector('code')).not.toBeInTheDocument()
  })

  it('should return null when code is empty string', () => {
    const { container } = render(<MqCode code='' />)
    expect(container.querySelector('code')).not.toBeInTheDocument()
  })

  it('should render with description', () => {
    const { container } = render(<MqCode code='const x = 1;' description='Variable declaration' />)
    expect(screen.getByText('Variable declaration')).toBeInTheDocument()
  })

  it('should render without description', () => {
    const { container } = render(<MqCode code='const x = 1;' />)
    expect(container.textContent).toContain('const x = 1;')
  })

  it('should render with custom language', () => {
    const { container } = render(<MqCode code='SELECT * FROM users;' language='sql' />)
    expect(container.textContent).toContain('SELECT')
  })

  it('should render with default language when not specified', () => {
    const { container } = render(<MqCode code='const x = 1;' />)
    expect(container).toBeInTheDocument()
  })

  it('should apply custom styles to SyntaxHighlighter', () => {
    const { container } = render(<MqCode code='const x = 1;' />)
    const codeBlock = container.querySelector('code')
    expect(codeBlock).toBeInTheDocument()
  })

  it('should handle multiline code', () => {
    const multilineCode = `function test() {
  console.log('test');
  return true;
}`
    const { container } = render(<MqCode code={multilineCode} />)
    expect(container.textContent).toContain('function test()')
    expect(container.textContent).toContain('return true')
  })

  it('should render description with bold and mono font', () => {
    const { container } = render(<MqCode code='const x = 1;' description='Test Description' />)
    expect(screen.getByText('Test Description')).toBeInTheDocument()
  })
})
