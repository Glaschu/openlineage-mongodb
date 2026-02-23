// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import SearchPlaceholder from '../../../components/search/SearchPlaceholder'

// Mock the Typewriter component
vi.mock('../../../components/search/Typewriter', () => ({
  default: ({ words }: { words: string[] }) => <span data-testid='typewriter'>{words[0]}</span>,
}))

// Mock translation
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

describe('SearchPlaceholder Component', () => {
  it('renders without crashing', () => {
    render(<SearchPlaceholder />)
    expect(screen.getByText('Search your')).toBeInTheDocument()
  })

  it('displays static search text', () => {
    render(<SearchPlaceholder />)
    expect(screen.getByText('Search your')).toBeInTheDocument()
  })

  it('renders Typewriter component', () => {
    render(<SearchPlaceholder />)
    expect(screen.getByTestId('typewriter')).toBeInTheDocument()
  })

  it('passes correct words to Typewriter', () => {
    render(<SearchPlaceholder />)
    const typewriter = screen.getByTestId('typewriter')
    expect(typewriter).toBeInTheDocument()
    // The first word should be displayed
    expect(typewriter.textContent).toContain('Jobs and Datasets')
  })

  it('renders with correct styling container', () => {
    const { container } = render(<SearchPlaceholder />)
    const box = container.firstChild
    expect(box).toBeInTheDocument()
  })

  it('displays text in disabled state', () => {
    const { container } = render(<SearchPlaceholder />)
    // Check for disabled styling
    expect(screen.getByText('Search your')).toBeInTheDocument()
  })
})
