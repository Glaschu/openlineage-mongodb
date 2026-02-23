// Copyright 2018-2024 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { MemoryRouter } from 'react-router-dom'
import { NotFound } from '../../../routes/not-found/NotFound'
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'

describe('NotFound Component', () => {
  it('should render without crashing', () => {
    const { container } = render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    )
    expect(container).toBeInTheDocument()
  })

  it('should display 404 message', () => {
    const { container } = render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    )
    expect(container.textContent).toContain('Not Found')
  })
})
