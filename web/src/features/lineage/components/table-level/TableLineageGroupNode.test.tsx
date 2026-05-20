// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'
import TableLineageGroupNode from './TableLineageGroupNode'

const node = {
  id: 'g1',
  type: 'group' as const,
  x: 0,
  y: 0,
  width: 200,
  height: 80,
  data: { name: 'mygroup', namespace: 'ns' },
}

describe('TableLineageGroupNode', () => {
  it('renders group label inside an SVG container', () => {
    const { container } = render(
      <svg>
        <TableLineageGroupNode node={node as never} />
      </svg>
    )
    expect(container.textContent).toContain('mygroup')
  })

  it('exposes getLayoutOptions with elk hints', () => {
    const opts = TableLineageGroupNode.getLayoutOptions(node as never)
    expect(opts.layoutOptions['elk.direction']).toBe('RIGHT')
    expect(opts.layoutOptions['elk.padding']).toContain('top=30')
  })
})
