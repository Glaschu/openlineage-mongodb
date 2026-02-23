// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { ThemeProvider, createTheme } from '@mui/material/styles'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../../helpers/testUtils'
import DatasetTags from '../../../components/datasets/DatasetTags'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as useDatasetsHook from '../../../queries/datasets'
import * as useTagsHook from '../../../queries/tags'

// Mock Tooltip
// Mock Tooltip
vi.mock('../../../components/core/tooltip/MQTooltip', () => {
  const React = require('react')
  return {
    __esModule: true,
    default: React.forwardRef(({ title, children }: { title: string; children: React.ReactElement }, ref: any) => (
      <span ref={ref} aria-label={typeof title === 'string' ? title : undefined}>{children}</span>
    )),
  }
})

// Mock Autocomplete
const { MockAutocomplete } = vi.hoisted(() => {
  const React = require('react') as typeof import('react')

  const Component = ({
    id,
    options,
    multiple = false,
    freeSolo = false,
    value,
    onChange,
    renderInput,
    renderTags,
  }: any) => {
    const controlId = id ?? 'mock-autocomplete'

    const handleFreeSoloChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const selected = event.target.value
      onChange(event, selected, 'selectOption', { option: selected })
    }

    const handleSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
      const selected = event.target.value
      if (!selected) {
        return
      }

      if (multiple) {
        const current = value as string[]
        const isSelected = current.includes(selected)
        const updated = isSelected
          ? current.filter((tag: string) => tag !== selected)
          : [...current, selected]
        onChange(event, updated, isSelected ? 'removeOption' : 'selectOption', {
          option: selected,
        })
      } else {
        onChange(event, selected, 'selectOption', { option: selected })
      }
      event.target.value = ''
    }

    const handleRemove = (tag: string) => {
      if (!multiple) {
        return
      }
      const current = value as string[]
      onChange({}, current.filter((item: string) => item !== tag), 'removeOption', { option: tag })
    }

    return (
      <div>
        {renderInput?.({
          id: controlId,
          inputProps: {},
          InputLabelProps: {},
          InputProps: {},
        })}
        {freeSolo && (
          <input data-testid={`${controlId}-free-input`} onChange={handleFreeSoloChange} value='' />
        )}
        <select data-testid={controlId} onChange={handleSelect} value=''>
          <option value='' disabled>
            select...
          </option>
          {options.map((option: string) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {multiple && renderTags && (
          <div data-testid={`${id}-rendered-tags`}>{renderTags(value as string[], {})}</div>
        )}
        {multiple && (
          <ul>
            {(value as string[]).map((tag: string) => (
              <li key={tag} data-testid={`tag-${tag}`}>
                {tag}
                <button type='button' data-testid={`remove-${tag}`} onClick={() => handleRemove(tag)}>
                  remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  return { MockAutocomplete: Component }
})

vi.mock('@mui/material', async () => {
  const actual = await vi.importActual<typeof import('@mui/material')>('@mui/material')
  return {
    ...actual,
    Autocomplete: MockAutocomplete,
  }
})

vi.mock('@mui/material/Snackbar', () => ({
  __esModule: true,
  default: ({ open, message, onClose }: any) =>
    open ? (
      <div role='alert'>
        {message}
        <button
          type='button'
          data-testid='snackbar-close'
          onClick={(event: React.MouseEvent<HTMLButtonElement>) => onClose?.(event, 'timeout')}
        >
          Close
        </button>
      </div>
    ) : null,
}))

const addDatasetTagMock = vi.fn()
const deleteDatasetTagMock = vi.fn()
const addDatasetFieldTagMock = vi.fn()
const deleteDatasetFieldTagMock = vi.fn()
const addTagsMock = vi.fn()

const renderDatasetTags = (propsOverride = {}, tagsState = [
  { name: 'beta', description: 'Beta tag' },
  { name: 'alpha', description: 'Alpha tag' }
]) => {
  const theme = createTheme()

  vi.spyOn(useTagsHook, 'useTags').mockReturnValue({
    data: tagsState,
    isLoading: false,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  } as any)

  vi.spyOn(useDatasetsHook, 'useAddDatasetTag').mockReturnValue({
    mutate: addDatasetTagMock,
    isPending: false,
    isError: false,
    error: null,
  } as any)

  vi.spyOn(useDatasetsHook, 'useDeleteDatasetTag').mockReturnValue({
    mutate: deleteDatasetTagMock,
    isPending: false,
    isError: false,
    error: null,
  } as any)

  vi.spyOn(useDatasetsHook, 'useAddDatasetFieldTag').mockReturnValue({
    mutate: addDatasetFieldTagMock,
    isPending: false,
    isError: false,
    error: null,
  } as any)

  vi.spyOn(useDatasetsHook, 'useDeleteDatasetFieldTag').mockReturnValue({
    mutate: deleteDatasetFieldTagMock,
    isPending: false,
    isError: false,
    error: null,
  } as any)

  vi.spyOn(useTagsHook, 'useAddTags').mockReturnValue({
    mutate: addTagsMock,
    isPending: false,
    isError: false,
    error: null,
  } as any)

  const defaultProps = {
    namespace: 'analytics',
    datasetName: 'orders',
    datasetTags: ['alpha'],
    datasetField: undefined,
  }

  return renderWithProviders(
    <ThemeProvider theme={theme}>
      <DatasetTags {...defaultProps} {...propsOverride} />
    </ThemeProvider>
  )
}

describe('DatasetTags', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('adds and removes dataset tags', () => {
    renderDatasetTags()

    // Add tag by selecting 'beta' from list (mocked select)
    fireEvent.change(screen.getByTestId('dataset-tags'), { target: { value: 'beta' } })
    expect(addDatasetTagMock).toHaveBeenCalledWith({ namespace: 'analytics', datasetName: 'orders', tag: 'beta' })

    // Remove tag 'alpha'
    // My mock renders <ul> list for existing tags if passed
    const removeBtn = screen.getByTestId('remove-alpha')
    fireEvent.click(removeBtn)
    expect(deleteDatasetTagMock).toHaveBeenCalledWith({ namespace: 'analytics', datasetName: 'orders', tag: 'alpha' })
  })

  it('opens dialog, edits descriptions, and submits new tags', async () => {
    renderDatasetTags()

    fireEvent.click(screen.getByRole('button', { name: 'Edit Tag' }))
    const dialog = await screen.findByRole('dialog')

    // Add new option in mocked autocomplete
    // Add new option in mocked autocomplete - target specifically by default mock ID as component has no ID
    const tagSelect = within(dialog).getByTestId('mock-autocomplete')
    fireEvent.change(tagSelect, { target: { value: 'beta' } }) // Existing tag not currently selected

    // Description
    const descriptionField = dialog.querySelector<HTMLTextAreaElement>('#tag-description')!
    fireEvent.change(descriptionField, { target: { value: 'Updated description' } })

    const submitButton = within(dialog).getByRole('button', { name: 'Submit' })
    await waitFor(() => expect(submitButton).not.toBeDisabled())
    fireEvent.click(submitButton)

    await waitFor(() => expect(addTagsMock).toHaveBeenCalledWith({ tag: 'beta', description: 'Updated description' }))
  })

  it('handles dataset field tags', () => {
    renderDatasetTags({ datasetField: 'country', datasetTags: ['beta'] })

    // Tag 'beta' is pre-selected
    expect(screen.getAllByText('beta').length).toBeGreaterThan(0)

    // Add 'alpha'
    fireEvent.change(screen.getByTestId('dataset-tags'), { target: { value: 'alpha' } })
    expect(addDatasetFieldTagMock).toHaveBeenCalledWith({ namespace: 'analytics', datasetName: 'orders', field: 'country', tag: 'alpha' })

    // Remove 'beta'
    const removeBtn = screen.getByTestId('remove-beta')
    fireEvent.click(removeBtn)
    expect(deleteDatasetFieldTagMock).toHaveBeenCalledWith({ namespace: 'analytics', datasetName: 'orders', field: 'country', tag: 'beta' })
  })
})
