// Copyright 2018-2024 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { BrowserRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import MqText from '../../../../components/core/text/MqText'

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

describe('MqText Component', () => {
  it('should render without crashing', () => {
    const { container } = render(<MqText>Test Text</MqText>)
    expect(container).toBeInTheDocument()
  })

  it('should render heading text', () => {
    const { getByText } = render(<MqText heading>Heading</MqText>)
    expect(getByText('Heading')).toBeInTheDocument()
  })

  it('should render subdued text', () => {
    const { getByText } = render(<MqText subdued>Subdued</MqText>)
    expect(getByText('Subdued')).toBeInTheDocument()
  })

  it('should render subheading text', () => {
    render(<MqText subheading>Subheading</MqText>)
    expect(screen.getByText('Subheading')).toBeInTheDocument()
  })

  it('should render bold text', () => {
    render(<MqText bold>Bold Text</MqText>)
    expect(screen.getByText('Bold Text')).toBeInTheDocument()
  })

  it('should render disabled text', () => {
    render(<MqText disabled>Disabled Text</MqText>)
    expect(screen.getByText('Disabled Text')).toBeInTheDocument()
  })

  it('should render label text', () => {
    render(<MqText label>Label Text</MqText>)
    expect(screen.getByText('Label Text')).toBeInTheDocument()
  })

  it('should render inline text', () => {
    render(<MqText inline>Inline Text</MqText>)
    expect(screen.getByText('Inline Text')).toBeInTheDocument()
  })

  it('should render inverse text', () => {
    render(<MqText inverse>Inverse Text</MqText>)
    expect(screen.getByText('Inverse Text')).toBeInTheDocument()
  })

  it('should render highlight text', () => {
    render(<MqText highlight>Highlight Text</MqText>)
    expect(screen.getByText('Highlight Text')).toBeInTheDocument()
  })

  it('should render paragraph text', () => {
    render(<MqText paragraph>Paragraph Text</MqText>)
    expect(screen.getByText('Paragraph Text')).toBeInTheDocument()
  })

  it('should render with overflow hidden', () => {
    render(<MqText overflowHidden>Overflow Hidden Text</MqText>)
    expect(screen.getByText('Overflow Hidden Text')).toBeInTheDocument()
  })

  it('should render with custom color', () => {
    render(<MqText color='#ff0000'>Red Text</MqText>)
    expect(screen.getByText('Red Text')).toBeInTheDocument()
  })

  it('should render with monospace font', () => {
    render(<MqText font='mono'>Monospace Text</MqText>)
    expect(screen.getByText('Monospace Text')).toBeInTheDocument()
  })

  it('should render with primary font', () => {
    render(<MqText font='primary'>Primary Font</MqText>)
    expect(screen.getByText('Primary Font')).toBeInTheDocument()
  })

  it('should render small text', () => {
    render(<MqText small>Small Text</MqText>)
    expect(screen.getByText('Small Text')).toBeInTheDocument()
  })

  it('should render large text', () => {
    render(<MqText large>Large Text</MqText>)
    expect(screen.getByText('Large Text')).toBeInTheDocument()
  })

  it('should render with bottom margin', () => {
    render(<MqText bottomMargin>Text with margin</MqText>)
    expect(screen.getByText('Text with margin')).toBeInTheDocument()
  })

  it('should render as block element', () => {
    render(<MqText block>Block Text</MqText>)
    expect(screen.getByText('Block Text')).toBeInTheDocument()
  })

  it('should render link with linkTo prop', () => {
    renderWithRouter(
      <MqText link linkTo='/test-route'>
        Link Text
      </MqText>
    )
    expect(screen.getByText('Link Text')).toBeInTheDocument()
    const link = screen.getByText('Link Text').closest('a')
    expect(link).toHaveAttribute('href', '/test-route')
  })

  it('should render external link with href prop', () => {
    render(
      <MqText link href='https://example.com'>
        External Link
      </MqText>
    )
    expect(screen.getByText('External Link')).toBeInTheDocument()
    const link = screen.getByText('External Link')
    expect(link).toHaveAttribute('href', 'https://example.com')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('should handle onClick events', () => {
    const handleClick = vi.fn()
    render(<MqText onClick={handleClick}>Clickable Text</MqText>)
    const text = screen.getByText('Clickable Text')
    fireEvent.click(text)
    expect(handleClick).toHaveBeenCalled()
  })

  it('should handle onClick on heading', () => {
    const handleClick = vi.fn()
    render(
      <MqText heading onClick={handleClick}>
        Clickable Heading
      </MqText>
    )
    const heading = screen.getByText('Clickable Heading')
    fireEvent.click(heading)
    expect(handleClick).toHaveBeenCalled()
  })

  it('should handle onClick on link', () => {
    const handleClick = vi.fn()
    render(
      <MqText link href='https://example.com' onClick={handleClick}>
        Clickable Link
      </MqText>
    )
    const link = screen.getByText('Clickable Link')
    fireEvent.click(link)
    expect(handleClick).toHaveBeenCalled()
  })

  it('should render with multiple style props', () => {
    render(
      <MqText bold subdued small>
        Multi-style Text
      </MqText>
    )
    expect(screen.getByText('Multi-style Text')).toBeInTheDocument()
  })

  it('should render with custom sx prop', () => {
    render(<MqText sx={{ padding: '10px' }}>Custom SX</MqText>)
    expect(screen.getByText('Custom SX')).toBeInTheDocument()
  })

  it('should render number as children', () => {
    render(<MqText>{42}</MqText>)
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('should render array of strings as children', () => {
    render(<MqText>{['Hello', ' ', 'World']}</MqText>)
    expect(screen.getByText(/Hello.*World/)).toBeInTheDocument()
  })

  it('should render with disabled link', () => {
    renderWithRouter(
      <MqText link linkTo='/disabled' disabled>
        Disabled Link
      </MqText>
    )
    const linkContainer = screen.getByText('Disabled Link').closest('a')
    expect(linkContainer).toHaveAttribute('aria-disabled', 'true')
  })

  it('should render heading as h4 variant', () => {
    const { container } = render(<MqText heading>H4 Heading</MqText>)
    const h4 = container.querySelector('h4')
    expect(h4).toBeInTheDocument()
  })

  it('should handle undefined children', () => {
    render(<MqText>{undefined}</MqText>)
    expect(screen.queryByText(/./)).not.toBeInTheDocument()
  })

  it('should handle null children', () => {
    render(<MqText>{null}</MqText>)
    expect(screen.queryByText(/./)).not.toBeInTheDocument()
  })

  it('should render all combined props', () => {
    render(
      <MqText bold subdued small bottomMargin inline highlight font='mono'>
        All Props
      </MqText>
    )
    expect(screen.getByText('All Props')).toBeInTheDocument()
  })
})
