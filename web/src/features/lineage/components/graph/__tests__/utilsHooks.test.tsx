import React from 'react'

import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

import { useCallbackRef } from '../utils/hooks'
import { useD3Selection } from '../utils/useD3Selection'

const CallbackHarness = React.forwardRef<
  { invoke: (...args: unknown[]) => void },
  { callback: (...args: unknown[]) => void; deps?: React.DependencyList }
>(({ callback, deps = [] }, ref) => {
  const handler = useCallbackRef(callback, deps)
  React.useImperativeHandle(ref, () => ({ invoke: handler }), [handler])
  return null
})
CallbackHarness.displayName = 'CallbackHarness'

describe('useCallbackRef', () => {
  it('returns stable function that always calls latest callback', () => {
    const first = vi.fn()
    const second = vi.fn()
    const ref = React.createRef<{ invoke: (...args: unknown[]) => void }>()

    const { rerender } = render(<CallbackHarness ref={ref} callback={first} deps={[1]} />)
    ref.current?.invoke('alpha')
    expect(first).toHaveBeenCalledWith('alpha')

    rerender(<CallbackHarness ref={ref} callback={second} deps={[2]} />)
    ref.current?.invoke('beta')
    expect(second).toHaveBeenCalledWith('beta')
  })
})

describe('useD3Selection', () => {
  it('creates a d3 selection that can mutate the element', async () => {
    const TestComponent = () => {
      const ref = React.useRef<SVGSVGElement>(null)
      const selection = useD3Selection(ref)

      React.useEffect(() => {
        selection?.attr('data-active', 'true')
      }, [selection])

      return <svg ref={ref} data-testid='target-svg' />
    }

    render(<TestComponent />)

    const svg = await screen.findByTestId('target-svg')
    await waitFor(() => expect(svg.getAttribute('data-active')).toBe('true'))
  })
})
