// Copyright 2018-2024 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import MqPaging from '@/shared/components/Paging/MqPaging'

describe('MqPaging Component', () => {
  it('renders the range label', () => {
    const { container } = render(
      <MqPaging
        pageSize={10}
        currentPage={0}
        totalCount={100}
        incrementPage={() => {}}
        decrementPage={() => {}}
      />
    )
    expect(container.textContent).toContain('1')
    expect(container.textContent).toContain('100')
  })

  it('disables previous on page 0 and next on last page', () => {
    const { container, rerender } = render(
      <MqPaging
        pageSize={10}
        currentPage={0}
        totalCount={10}
        incrementPage={() => {}}
        decrementPage={() => {}}
      />
    )
    const buttons = container.querySelectorAll('button')
    expect(buttons[0]).toBeDisabled()
    expect(buttons[1]).toBeDisabled()
    rerender(
      <MqPaging
        pageSize={10}
        currentPage={0}
        totalCount={20}
        incrementPage={() => {}}
        decrementPage={() => {}}
      />
    )
    const buttons2 = container.querySelectorAll('button')
    expect(buttons2[0]).toBeDisabled()
    expect(buttons2[1]).not.toBeDisabled()
  })

  it('invokes increment/decrement callbacks', () => {
    const inc = vi.fn()
    const dec = vi.fn()
    const { container } = render(
      <MqPaging
        pageSize={10}
        currentPage={1}
        totalCount={100}
        incrementPage={inc}
        decrementPage={dec}
      />
    )
    const [prev, next] = container.querySelectorAll('button')
    fireEvent.click(prev)
    fireEvent.click(next)
    expect(dec).toHaveBeenCalledWith(1)
    expect(inc).toHaveBeenCalledWith(1)
  })
})
