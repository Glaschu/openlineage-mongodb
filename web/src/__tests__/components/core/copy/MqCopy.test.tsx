// Copyright 2018-2024 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import MqCopy from '../../../../components/core/copy/MqCopy'

describe('MqCopy Component', () => {
  beforeEach(() => {
    // Mock the clipboard API
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn(() => Promise.resolve()),
      },
      writable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should render copy icon button', () => {
    const { container } = render(<MqCopy string='test-string' />)
    const button = container.querySelector('button')
    expect(button).toBeInTheDocument()
  })

  it('should copy string to clipboard when clicked', async () => {
    const testString = 'test-string'
    const { container } = render(<MqCopy string={testString} />)
    const button = container.querySelector('button')

    if (button) {
      fireEvent.click(button)
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(testString)
    }
  })

  it('should show snackbar after copying', async () => {
    const { container } = render(<MqCopy string='test-string' />)
    const button = container.querySelector('button')

    if (button) {
      fireEvent.click(button)

      await waitFor(() => {
        const snackbar = screen.queryByText('Copied test-string')
        expect(snackbar).toBeInTheDocument()
      })
    }
  })

  it('should change icon to check after copying', async () => {
    const { container } = render(<MqCopy string='test-string' />)
    const button = container.querySelector('button')

    if (button) {
      // Initially should show copy icon
      const copyIcon = container.querySelector('[data-testid="ContentCopyIcon"]')
      expect(copyIcon).toBeInTheDocument()

      fireEvent.click(button)

      // After click, should show check icon
      await waitFor(() => {
        const checkIcon = container.querySelector('[data-testid="CheckIcon"]')
        expect(checkIcon).toBeInTheDocument()
      })
    }
  })

  it('should reset icon back to copy after timeout', async () => {
    const { container } = render(<MqCopy string='test-string' />)
    const button = container.querySelector('button')

    if (button) {
      fireEvent.click(button)

      // After click, should show check icon
      await waitFor(() => {
        const checkIcon = container.querySelector('[data-testid="CheckIcon"]')
        expect(checkIcon).toBeInTheDocument()
      })

      // Wait for the timeout (3000ms)
      await new Promise((resolve) => setTimeout(resolve, 3100))

      // Should be back to copy icon
      const copyIcon = container.querySelector('[data-testid="ContentCopyIcon"]')
      expect(copyIcon).toBeInTheDocument()
    }
  }, 10000)

  it('should stop propagation when clicked', async () => {
    const parentClickHandler = vi.fn()
    const { container } = render(
      <div onClick={parentClickHandler}>
        <MqCopy string='test-string' />
      </div>
    )
    const button = container.querySelector('button')

    if (button) {
      fireEvent.click(button)
      expect(parentClickHandler).not.toHaveBeenCalled()
    }
  })

  it('should handle special characters in string', async () => {
    const specialString = 'test@#$%^&*()'
    const { container } = render(<MqCopy string={specialString} />)
    const button = container.querySelector('button')

    if (button) {
      fireEvent.click(button)
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(specialString)
    }
  })

  it('should handle empty string', async () => {
    const { container } = render(<MqCopy string='' />)
    const button = container.querySelector('button')

    if (button) {
      fireEvent.click(button)
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('')
    }
  })

  it('should handle long strings', async () => {
    const longString = 'a'.repeat(1000)
    const { container } = render(<MqCopy string={longString} />)
    const button = container.querySelector('button')

    if (button) {
      fireEvent.click(button)
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(longString)
    }
  })

  it('should have correct aria-label', () => {
    const { container } = render(<MqCopy string='test-string' />)
    const button = container.querySelector('button[aria-label="copy"]')
    expect(button).toBeInTheDocument()
  })

  it('should use small icon size', () => {
    const { container } = render(<MqCopy string='test-string' />)
    const svg = container.querySelector('svg.MuiSvgIcon-fontSizeSmall')
    expect(svg).toBeInTheDocument()
  })

  it('should use secondary color for button', () => {
    const { container } = render(<MqCopy string='test-string' />)
    const button = container.querySelector('button.MuiIconButton-colorSecondary')
    expect(button).toBeInTheDocument()
  })
})
