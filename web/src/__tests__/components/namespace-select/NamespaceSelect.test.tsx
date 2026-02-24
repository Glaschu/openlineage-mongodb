// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { Provider } from 'react-redux'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import NamespaceSelect from '../../../components/namespace-select/NamespaceSelect'
import React from 'react'
import { createStore } from 'redux'
import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderWithProviders } from '../../../helpers/testUtils'
import * as useNamespacesHook from '../../../queries/namespaces'

// Mock action creator
const { selectNamespaceMock } = vi.hoisted(() => ({
  selectNamespaceMock: vi.fn((value: string) => ({ type: 'SELECT_NAMESPACE', payload: value })),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => (key === 'namespace_select.prompt' ? 'Namespace' : key),
  }),
}))

vi.mock('../../../store/slices/namespacesSlice', () => ({
  selectNamespace: (value: string) => selectNamespaceMock(value),
}))

describe('NamespaceSelect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // We need a store because component selects 'selectedNamespace' from Redux state
  const createMockStore = (selectedNamespace: string | null) => {
    const state = {
      namespaces: {
        selectedNamespace,
      },
    }
    const store = createStore(() => state)
    store.dispatch = vi.fn()
    return store
  }

  const renderComponent = (selectedNamespace: string | null = null, namespacesList: string[] = []) => {
    const store = createMockStore(selectedNamespace)
    const theme = createTheme()

    vi.spyOn(useNamespacesHook, 'useNamespaces').mockReturnValue({
      data: { namespaces: namespacesList.map((name) => ({ name })) },
      isLoading: false,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any)

    return renderWithProviders(
      <ThemeProvider theme={theme}>
        <NamespaceSelect />
      </ThemeProvider>,
      { store }
    )
  }

  it('does not render when no namespace is selected', () => {
    const { container } = renderComponent(null, ['default'])
    expect(container.firstChild).toBeNull()
  })

  it('renders the prompt and selected namespace', () => {
    renderComponent('default', ['default'])

    expect(screen.getByPlaceholderText('Namespace')).toBeTruthy()
    // Select component structure is complex; check for value presence
    // Material UI select puts val in hidden input or displayed div.
    // 'default' should be visible.
    expect(screen.getByDisplayValue('default')).toBeTruthy()
  })

  it('dispatches selectNamespace when a different namespace is chosen', async () => {
    const store = createMockStore('default')
    const theme = createTheme()

    vi.spyOn(useNamespacesHook, 'useNamespaces').mockReturnValue({
      data: { namespaces: [{ name: 'default' }, { name: 'analytics' }] },
      isLoading: false,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any)

    renderWithProviders(
      <ThemeProvider theme={theme}>
        <NamespaceSelect />
      </ThemeProvider>,
      { store }
    )

    // Open select
    const trigger = screen.getByRole('combobox')
    fireEvent.mouseDown(trigger) // MUI Select uses mouseDown to open menu

    const option = await screen.findByRole('option', { name: 'analytics' })
    fireEvent.click(option)

    expect(selectNamespaceMock).toHaveBeenCalledWith('analytics')
    expect(store.dispatch).toHaveBeenCalled()
  })
})
