// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { EdgeLabel } from '../../../../components/graph/Edge/EdgeLabel'
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'

describe('EdgeLabel Component', () => {
  it('should render label with correct text and position', () => {
    const label = { text: 'My Label', x: 50, y: 75 }
    const { container } = render(
      <svg>
        <EdgeLabel label={label} />
      </svg>
    )
    const text = container.querySelector('text')
    expect(text).toBeTruthy()
    expect(text?.textContent).toBe('My Label')
    expect(text?.getAttribute('x')).toBe('50')
    expect(text?.getAttribute('y')).toBe('75')
  })

  it('should not render when label is undefined', () => {
    const { container } = render(
      <svg>
        <EdgeLabel label={undefined} />
      </svg>
    )
    const text = container.querySelector('text')
    expect(text).toBeFalsy()
  })

  it('should not render when label.x is undefined', () => {
    const label = { text: 'Label', y: 100 } as any
    const { container } = render(
      <svg>
        <EdgeLabel label={label} />
      </svg>
    )
    const text = container.querySelector('text')
    expect(text).toBeFalsy()
  })

  it('should not render when label.y is undefined', () => {
    const label = { text: 'Label', x: 100 } as any
    const { container } = render(
      <svg>
        <EdgeLabel label={label} />
      </svg>
    )
    const text = container.querySelector('text')
    expect(text).toBeFalsy()
  })

  it('should adjust y position when endPointY is provided and label is above', () => {
    const label = { text: 'Label', x: 50, y: 200 }
    const endPointY = 100
    const { container } = render(
      <svg>
        <EdgeLabel label={label} endPointY={endPointY} />
      </svg>
    )
    const text = container.querySelector('text')
    // When label.y - 5 >= endPointY, use endPointY + 25
    expect(text?.getAttribute('y')).toBe('125')
  })

  it('should adjust y position when endPointY is provided and label is below', () => {
    const label = { text: 'Label', x: 50, y: 90 }
    const endPointY = 100
    const { container } = render(
      <svg>
        <EdgeLabel label={label} endPointY={endPointY} />
      </svg>
    )
    const text = container.querySelector('text')
    // When label.y - 5 < endPointY, use endPointY - 15
    expect(text?.getAttribute('y')).toBe('85')
  })
})
