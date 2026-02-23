import React from 'react'

import { act, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Typewriter from '../../../components/search/Typewriter'

describe('Typewriter', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('types and deletes characters until the repeat count is reached', async () => {
    vi.useFakeTimers()

    const { container } = render(
      <Typewriter
        words={['hi']}
        typingSpeed={10}
        deletingSpeed={5}
        pauseTime={20}
        repeatCount={2}
      />
    )

    const span = container.querySelector('span')!

    expect(vi.getTimerCount()).toBeGreaterThan(0)

    expect(span.textContent).toBe('')

    const step = async (ms?: number) => {
      await act(async () => {
        if (ms !== undefined) {
          vi.advanceTimersByTime(ms)
        } else {
          vi.advanceTimersToNextTimer()
        }
        await Promise.resolve()
      })
    }

  const states: string[] = []
  const record = () => states.push(span.textContent ?? '')

  await step()
  record()

    await step()
    record()

    await step(20)
    record()

    await step()
    record()

    await step()
    record()

    await step()
    record()

    await step()
    record()

    await step()
    record()

    await step(50)
    record()

  expect(states).toEqual(['h', 'hi', 'hi', 'hi', 'h', '', '', 'h', 'hi'])
  })

  it('keeps the final word when repeat count is one', async () => {
    vi.useFakeTimers()

    const { container } = render(
      <Typewriter
        words={['go']}
        typingSpeed={10}
        deletingSpeed={5}
        pauseTime={20}
        repeatCount={1}
      />
    )

    const span = container.querySelector('span')!

    await act(async () => {
      vi.advanceTimersByTime(10)
    })
    expect(span.textContent).toBe('g')

    await act(async () => {
      vi.advanceTimersByTime(10)
    })
    expect(span.textContent).toBe('go')

    await act(async () => {
      vi.advanceTimersByTime(200)
    })

    expect(span.textContent).toBe('go')
  })
})
