// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { ThemeProvider, createTheme } from '@mui/material/styles'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../../helpers/testUtils'
import JobTags from '../../../components/jobs/JobTags'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as useJobsHook from '../../../queries/jobs'
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

// Mock Autocomplete due to MUI complexity in tests
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

const addJobTagMock = vi.fn()
const deleteJobTagMock = vi.fn()
const addTagsMock = vi.fn()

const renderJobTags = (selectedTags: string[] = ['priority']) => {
  const theme = createTheme()

  vi.spyOn(useTagsHook, 'useTags').mockReturnValue({
    data: [
      { name: 'priority', description: 'Priority pipelines' },
      { name: 'beta', description: 'Beta workloads' },
    ],
    isLoading: false,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  } as any)

  vi.spyOn(useJobsHook, 'useAddJobTag').mockReturnValue({
    mutate: addJobTagMock,
    isPending: false,
    isError: false,
    error: null,
  } as any)

  vi.spyOn(useJobsHook, 'useDeleteJobTag').mockReturnValue({
    mutate: deleteJobTagMock,
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

  return renderWithProviders(
    <ThemeProvider theme={theme}>
      <JobTags namespace='analytics' jobName='daily-job' jobTags={selectedTags} />
    </ThemeProvider>
  )
}

describe('JobTags', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    addJobTagMock.mockClear()
    deleteJobTagMock.mockClear()
    addTagsMock.mockClear()
  })

  it('shows existing tags and allows removing them', async () => {
    renderJobTags(['priority'])

    expect(screen.getAllByText('priority').length).toBeGreaterThan(0)

    const removeBtn = screen.getByTestId('remove-priority')
    fireEvent.click(removeBtn)

    expect(deleteJobTagMock).toHaveBeenCalledWith({ namespace: 'analytics', jobName: 'daily-job', tag: 'priority' })
  })

  it('adds another tag through the autocomplete menu', async () => {
    renderJobTags(['priority'])

    fireEvent.change(screen.getByTestId('dataset-tags'), { target: { value: 'beta' } })

    expect(addJobTagMock).toHaveBeenCalledWith({ namespace: 'analytics', jobName: 'daily-job', tag: 'beta' })
  })

  it('opens the dialog and submits a new tag description', async () => {
    renderJobTags(['priority'])

    fireEvent.click(screen.getByRole('button', { name: 'Edit Tag' }))

    const dialog = await screen.findByRole('dialog')
    const tagSelect = within(dialog).getByRole('combobox')
    fireEvent.change(tagSelect, { target: { value: 'beta' } })

    const descriptionInput = dialog.querySelector<HTMLTextAreaElement>('#tag-description')!
    fireEvent.change(descriptionInput, { target: { value: 'Updated description' } })

    const submitButton = within(dialog).getByRole('button', { name: 'Submit' })
    await waitFor(() => expect(submitButton).not.toBeDisabled())
    fireEvent.click(submitButton)

    await waitFor(() => expect(addTagsMock).toHaveBeenCalledWith({ tag: 'beta', description: 'Updated description' }))
  })
})
