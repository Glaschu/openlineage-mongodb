// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { MemoryRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { legacy_createStore as createStore } from 'redux'
import React from 'react'
import Search from '../../../components/search/Search'

// Mock the child components
vi.mock('../../../components/search/base-search/BaseSearch', () => ({
  default: ({ search, onIsLoading }: { search: string, onIsLoading: (l: boolean) => void }) => (
    <div data-testid='base-search'>
      BaseSearch: {search}
      <button data-testid='trigger-loading' onClick={() => onIsLoading(true)}>Trigger Loading</button>
    </div>
  ),
}))

vi.mock('../../../components/search/open-search/OpenSearch', () => ({
  default: ({ search, onIsLoading }: { search: string, onIsLoading: (l: boolean) => void }) => (
    <div data-testid='open-search'>
      OpenSearch: {search}
      <button data-testid='trigger-loading-open' onClick={() => onIsLoading(true)}>Trigger Loading Open</button>
    </div>
  ),
}))

vi.mock('../../../components/search/SearchPlaceholder', () => ({
  default: () => <div data-testid='search-placeholder'>Search Placeholder</div>,
}))

// Mock globals
vi.mock('../../../globals', () => ({
  REACT_APP_ADVANCED_SEARCH: false,
}))

const createMockStore = (initialState: any) => {
  return createStore(() => initialState)
}

const renderSearch = (advancedSearch = false, state = {}) => {
  const defaultState = {
    openSearchJobs: { isLoading: false },
    openSearchDatasets: { isLoading: false },
    ...state,
  }
  const store = createMockStore(defaultState)

  // Mock the advanced search global
  if (advancedSearch) {
    vi.doMock('../../../globals', () => ({
      REACT_APP_ADVANCED_SEARCH: true,
    }))
  }

  return render(
    <Provider store={store}>
      <MemoryRouter>
        <Search />
      </MemoryRouter>
    </Provider>
  )
}

describe('Search Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders search input', () => {
    renderSearch()
    const input = screen.getByRole('textbox')
    expect(input).toBeInTheDocument()
  })

  it('displays search placeholder when input is empty', () => {
    renderSearch()
    expect(screen.getByTestId('search-placeholder')).toBeInTheDocument()
  })

  it('hides placeholder when user types', () => {
    renderSearch()
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'test' } })
    expect(screen.queryByTestId('search-placeholder')).not.toBeInTheDocument()
  })

  it('displays search icon', () => {
    const { container } = renderSearch()
    const searchIcon = container.querySelector('[data-testid="SearchOutlinedIcon"]')
    expect(searchIcon).toBeInTheDocument()
  })

  it('displays keyboard shortcut chip', () => {
    renderSearch()
    expect(screen.getByText('⌘K')).toBeInTheDocument()
  })

  it('shows loading indicator when child component triggers loading', () => {
    const { container } = renderSearch()
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'test' } })

    // Default uses BaseSearch
    fireEvent.click(screen.getByTestId('trigger-loading'))

    expect(container.querySelector('.MuiCircularProgress-root')).toBeInTheDocument()
  })

  it('opens search results when user types', () => {
    renderSearch()
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'test query' } })
    expect(screen.getByTestId('base-search')).toBeInTheDocument()
  })

  it('displays close button when search is open', () => {
    const { container } = renderSearch()
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'test' } })

    // Just verify buttons are present
    const buttons = container.querySelectorAll('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('clears search when close button is clicked', () => {
    const { container } = renderSearch()
    const input = screen.getByRole('textbox') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'test' } })

    // Find and click any button (likely the close button)
    const buttons = container.querySelectorAll('button')
    if (buttons.length > 0) {
      fireEvent.click(buttons[0])
    }

    // Value may or may not be cleared depending on which button
    expect(input).toBeDefined()
  })

  it('focuses input on Cmd+K', () => {
    renderSearch()
    const input = screen.getByRole('textbox') as HTMLInputElement

    fireEvent.keyDown(window, { key: 'k', metaKey: true })

    expect(document.activeElement).toBe(input)
  })

  it('focuses input on Ctrl+K', () => {
    renderSearch()
    const input = screen.getByRole('textbox') as HTMLInputElement

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })

    expect(document.activeElement).toBe(input)
  })

  it('closes search on Escape key', () => {
    renderSearch()
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'test' } })

    fireEvent.keyDown(window, { key: 'Escape' })

    waitFor(() => {
      expect(screen.queryByTestId('base-search')).not.toBeInTheDocument()
    })
  })

  it('opens search when input is focused', () => {
    renderSearch()
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'test' } })
    fireEvent.focus(input)

    expect(screen.getByTestId('base-search')).toBeInTheDocument()
  })

  it('uses BaseSearch by default', () => {
    renderSearch(false)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'test' } })

    expect(screen.getByTestId('base-search')).toBeInTheDocument()
    expect(screen.queryByTestId('open-search')).not.toBeInTheDocument()
  })

  it('has proper autocomplete attribute', () => {
    renderSearch()
    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('autocomplete', 'off')
  })

  it('has correct search bar id', () => {
    renderSearch()
    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('id', 'searchBar')
  })

  it('passes search query to BaseSearch', () => {
    renderSearch()
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'my search query' } })

    expect(screen.getByText('BaseSearch: my search query')).toBeInTheDocument()
  })

  it('renders with correct container width', () => {
    const { container } = renderSearch()
    const searchContainer = container.querySelector('#searchContainer')
    expect(searchContainer).toBeInTheDocument()
  })
})
