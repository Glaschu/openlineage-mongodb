// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import Sidenav from '../../../components/sidenav/Sidenav'

const { changeLanguageMock, buttonRenders } = vi.hoisted(() => ({
  changeLanguageMock: vi.fn(),
  buttonRenders: [] as Array<{ id: string; active: boolean; title: string; to: string }>,
}))

vi.mock('../../../i18n/config', () => ({}))

vi.mock('react-inlinesvg', () => ({
  __esModule: true,
  default: ({ src }: { src: string }) => <span data-testid='inline-svg'>{src}</span>,
}))

vi.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: () => <span data-testid='font-awesome-icon' />,
}))

vi.mock('../../../img/iconSearchArrow.svg', () => ({
  __esModule: true,
  default: 'icon.svg',
}))

vi.mock('../../../components/sidenav/marquez-icon-white-solid.svg', () => ({
  __esModule: true,
  default: 'logo.svg',
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        'sidenav.dataOps': 'DataOps',
        'sidenav.jobs': 'Jobs',
        'sidenav.datasets': 'Datasets',
        'sidenav.events': 'Events',
      }[key] ?? key),
    i18n: {
      changeLanguage: changeLanguageMock,
      resolvedLanguage: 'en',
    },
  }),
}))

vi.mock('../../../components/core/icon-button/MqIconButton', () => ({
  __esModule: true,
  default: ({ id, title, active, to, children }: { id: string; title: string; active: boolean; to: string; children: React.ReactNode }) => {
    buttonRenders.push({ id, title, active, to })

    return (
      <div data-testid={id} data-active={active} data-to={to}>
        <span>{title}</span>
        {children}
      </div>
    )
  },
}))

const renderSidenav = (initialEntry: string = '/') => {
  const theme = createTheme()

  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Sidenav />
      </MemoryRouter>
    </ThemeProvider>
  )
}

beforeEach(() => {
  changeLanguageMock.mockReset()
  buttonRenders.length = 0
})

describe('Sidenav', () => {
  it('marks the link that matches the current location as active', () => {
    renderSidenav('/jobs')

    expect(screen.getByTestId('homeDrawerButton')).toHaveAttribute('data-active', 'false')
    expect(screen.getByTestId('jobsDrawerButton')).toHaveAttribute('data-active', 'true')
    expect(screen.getByTestId('datasetsDrawerButton')).toHaveAttribute('data-active', 'false')
  })

  it('switches languages through the selector and reloads the page', async () => {
    const reloadSpy = vi.spyOn(window.location, 'reload').mockImplementation(() => {})

    renderSidenav()

    const selector = screen.getByRole('combobox')
    fireEvent.mouseDown(selector)

    fireEvent.click(await screen.findByRole('option', { name: 'fr' }))

    expect(changeLanguageMock).toHaveBeenCalledWith('fr')
    expect(reloadSpy).toHaveBeenCalled()

    reloadSpy.mockRestore()
  })
})
