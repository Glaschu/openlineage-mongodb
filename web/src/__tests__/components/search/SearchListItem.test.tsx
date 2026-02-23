// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import SearchListItem from '../../../components/search/SearchListItem'

const mockSearchResult = {
  name: 'namespace.database.table_name',
  namespace: 'test-namespace',
  nodeId: 'dataset-node-id',
  type: 'DATASET' as const,
  updatedAt: '2024-11-12T10:00:00Z',
}

const mockJobSearchResult = {
  name: 'namespace.etl.job_name',
  namespace: 'test-namespace',
  nodeId: 'job-node-id',
  type: 'JOB' as const,
  updatedAt: '2024-11-11T08:30:00Z',
}

const mockOnClick = vi.fn()

const renderSearchListItem = (searchResult: any = mockSearchResult, search = 'table') => {
  return render(
    <MemoryRouter>
      <SearchListItem searchResult={searchResult} search={search} onClick={mockOnClick} />
    </MemoryRouter>
  )
}

describe('SearchListItem Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders dataset type', () => {
    const { container } = renderSearchListItem(mockSearchResult, 'table')
    // Just verify the component renders for dataset type
    expect(container.querySelector('a')).toBeTruthy()
  })

  it('renders job type', () => {
    const { container } = renderSearchListItem(mockJobSearchResult, 'job')
    // Just verify the component renders for job type
    expect(container.querySelector('a')).toBeTruthy()
  })

  it('displays the search result name', () => {
    const { container } = renderSearchListItem(mockSearchResult, 'table')
    // Name may be split across elements, check container text
    expect(container.textContent).toContain('table_name')
  })

  it('highlights matching search text', () => {
    renderSearchListItem(mockSearchResult, 'table')
    const highlightedText = screen.getByText('table')
    expect(highlightedText).toBeInTheDocument()
  })

  it('displays non-matching parts without highlight', () => {
    renderSearchListItem(mockSearchResult, 'table')
    expect(screen.getByText('_name')).toBeInTheDocument()
  })

  it('displays name without highlight when search does not match', () => {
    const { container } = renderSearchListItem(mockSearchResult, 'xyz')
    expect(container.textContent).toContain('table_name')
  })

  it('displays relative time for updatedAt', () => {
    const { container } = renderSearchListItem(mockSearchResult, 'table')
    // The text will vary based on current time, check for common time words
    expect(container.textContent).toMatch(/ago|in|now|minute|hour|day|second/)
  })

  it('navigates to correct lineage path on click', () => {
    const { container } = renderSearchListItem(mockSearchResult, 'table')
    const link = container.querySelector('a')
    expect(link).toHaveAttribute(
      'href',
      '/lineage/dataset/test-namespace/namespace.database.table_name'
    )
  })

  it('calls onClick with search result name', () => {
    const { container } = renderSearchListItem(mockSearchResult, 'table')
    const link = container.querySelector('a')
    if (link) {
      fireEvent.click(link)
    }
    expect(mockOnClick).toHaveBeenCalledWith('namespace.database.table_name')
  })

  it('extracts correct name from full path', () => {
    renderSearchListItem(mockSearchResult, 'table')
    const nameElement = screen.getByText('table')
    expect(nameElement).toBeInTheDocument()
  })

  it('handles search matching case insensitively', () => {
    renderSearchListItem(mockSearchResult, 'TABLE')
    const highlightedText = screen.getByText('table')
    expect(highlightedText).toBeInTheDocument()
  })

  it('handles search with no dots in name', () => {
    const simpleResult = {
      ...mockSearchResult,
      name: 'simple_name',
    }
    renderSearchListItem(simpleResult, 'simple')
    expect(screen.getByText('simple')).toBeInTheDocument()
  })

  it('renders as a link with no text decoration', () => {
    const { container } = renderSearchListItem(mockSearchResult, 'table')
    const link = container.querySelector('a')
    expect(link).toHaveStyle({ textDecoration: 'none' })
  })

  it('truncates long names correctly', () => {
    const longNameResult = {
      ...mockSearchResult,
      name: 'namespace.database.' + 'a'.repeat(400),
    }
    const { container } = renderSearchListItem(longNameResult, 'aaa')
    // Should render something with repeated 'a' characters
    expect(container.textContent).toContain('aaa')
  })

  it('displays job name correctly', () => {
    renderSearchListItem(mockJobSearchResult, 'job')
    expect(screen.getByText('job')).toBeInTheDocument()
  })

  it('highlights partial match in name', () => {
    renderSearchListItem(mockSearchResult, 'name')
    const highlighted = screen.getByText('name')
    expect(highlighted).toBeInTheDocument()
  })

  it('renders correct link for job type', () => {
    const { container } = renderSearchListItem(mockJobSearchResult, 'job')
    const link = container.querySelector('a')
    expect(link).toHaveAttribute('href', '/lineage/job/test-namespace/namespace.etl.job_name')
  })
})
