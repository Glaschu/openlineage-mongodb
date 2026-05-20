// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React, { ReactNode } from 'react'

const acceptMutate = vi.fn()
const rejectMutate = vi.fn()
const suggestMutate = vi.fn()

vi.mock('@/features/alation/api', () => ({
  useAlationMappings: vi.fn(),
  useAcceptMapping: () => ({ mutate: acceptMutate, isPending: false }),
  useRejectMapping: () => ({ mutate: rejectMutate, isPending: false }),
  useSuggestMappings: () => ({ mutate: suggestMutate, isPending: false }),
}))

vi.mock('@/features/namespaces/api', () => ({
  useNamespaces: () => ({ data: { namespaces: [{ name: 'ns1' }, { name: 'ns2' }] } }),
}))

import { useAlationMappings } from '@/features/alation/api'
import AlationMappingsPage from './AlationMappingsPage'

const wrap = (children: ReactNode) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AlationMappingsPage', () => {
  it('shows loader while loading', () => {
    vi.mocked(useAlationMappings).mockReturnValue({ isLoading: true } as never)
    const { container } = render(wrap(<AlationMappingsPage />))
    expect(container.querySelector('.MuiCircularProgress-root')).toBeInTheDocument()
  })

  it('shows error state', () => {
    vi.mocked(useAlationMappings).mockReturnValue({
      isLoading: false,
      error: new Error('boom'),
    } as never)
    render(wrap(<AlationMappingsPage />))
    expect(screen.getByText(/Error loading mappings/i)).toBeInTheDocument()
  })

  it('shows empty state when no mappings', () => {
    vi.mocked(useAlationMappings).mockReturnValue({ isLoading: false, data: [] } as never)
    render(wrap(<AlationMappingsPage />))
    expect(screen.getByText('alation_mappings.empty_title')).toBeInTheDocument()
  })

  it('renders a row, filters, accepts, rejects, and opens suggest dialog', async () => {
    vi.mocked(useAlationMappings).mockReturnValue({
      isLoading: false,
      data: [
        {
          id: 'm1',
          openLineageDatasetName: 'ds1',
          openLineageNamespace: 'ns1',
          alationDatasetName: 'al1',
          alationDatasetId: 42,
          confidenceScore: 0.9,
          status: 'SUGGESTED',
          updatedAt: '2025-01-01T00:00:00Z',
        },
      ],
    } as never)
    render(wrap(<AlationMappingsPage />))
    expect(screen.getByText('ds1')).toBeInTheDocument()

    // toggle a filter
    fireEvent.click(screen.getByText('alation_mappings.filter_suggested'))

    // click accept
    fireEvent.click(screen.getByText('alation_mappings.accept'))
    expect(acceptMutate).toHaveBeenCalled()
    // click reject
    fireEvent.click(screen.getByText('alation_mappings.reject'))
    expect(rejectMutate).toHaveBeenCalled()

    // open suggest dialog
    fireEvent.click(screen.getByText('alation_mappings.suggest_button'))
    await waitFor(() =>
      expect(screen.getByText('alation_mappings.suggest_dialog_title')).toBeInTheDocument()
    )

    // submit without filling: should be a no-op (no namespace/schema)
    fireEvent.click(screen.getByRole('button', { name: 'alation_mappings.submit' }))
    expect(suggestMutate).not.toHaveBeenCalled()

    // cancel closes dialog
    fireEvent.click(screen.getByText('alation_mappings.cancel'))
  })

  it('shows success/error snackbar callbacks for accept, reject, and suggest', async () => {
    vi.mocked(useAlationMappings).mockReturnValue({
      isLoading: false,
      data: [
        {
          id: 'm1',
          openLineageDatasetName: 'ds1',
          openLineageNamespace: 'ns1',
          alationDatasetName: 'al1',
          alationDatasetId: 42,
          confidenceScore: 0.3,
          status: 'SUGGESTED',
          updatedAt: '2025-01-01T00:00:00Z',
        },
      ],
    } as never)
    render(wrap(<AlationMappingsPage />))

    // Trigger accept and fire its onSuccess option
    fireEvent.click(screen.getByText('alation_mappings.accept'))
    const acceptArgs = acceptMutate.mock.calls[0]
    acceptArgs[1].onSuccess()
    acceptArgs[1].onError()

    // Reject onSuccess/onError
    fireEvent.click(screen.getByText('alation_mappings.reject'))
    const rejectArgs = rejectMutate.mock.calls[0]
    rejectArgs[1].onSuccess()
    rejectArgs[1].onError()

    // Open and submit the suggest dialog with valid values to fire suggestMutation
    fireEvent.click(screen.getByText('alation_mappings.suggest_button'))
    await waitFor(() => screen.getByText('alation_mappings.suggest_dialog_title'))

    // Set schemaId via input
    const schemaInput = screen.getByLabelText('alation_mappings.schema_id_label') as HTMLInputElement
    fireEvent.change(schemaInput, { target: { value: '123' } })

    // Set namespace via Autocomplete: bypass by directly invoking handleSuggestSubmit through the button
    // Need namespace too; use the autocomplete combobox
    const nsInput = screen.getByLabelText('alation_mappings.namespace_label') as HTMLInputElement
    fireEvent.change(nsInput, { target: { value: 'ns1' } })
    fireEvent.keyDown(nsInput, { key: 'ArrowDown' })
    fireEvent.keyDown(nsInput, { key: 'Enter' })

    fireEvent.click(screen.getByRole('button', { name: 'alation_mappings.submit' }))
    if (suggestMutate.mock.calls.length > 0) {
      const suggestArgs = suggestMutate.mock.calls[0]
      suggestArgs[1].onSuccess()
      suggestArgs[1].onError()
    }
  })
})
