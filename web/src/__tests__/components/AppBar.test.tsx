// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import Header from '../../components/header/Header'

describe('AppBar Test', () => {
  // TODO: Wrap in Redux Provider for tests to work
  it.skip('Should render', () => {
    const { container } = render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    )
    expect(container).toBeInTheDocument()
  })

  it.skip('should render the header component', () => {
    const { container } = render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    )
    expect(container.querySelector('header')).toBeInTheDocument()
  })
})
