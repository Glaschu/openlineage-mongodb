// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { PayloadAction, createSlice } from '@reduxjs/toolkit'

/**
 * The migration set outlives the page it was built on.
 *
 * Building a set means visiting each object in turn to add it, so holding the
 * set only in the current URL lost it on the first navigation — the one thing
 * the feature exists to support. The URL still carries it, for sharing and for
 * seeding from a shared link, but this is the source of truth while the
 * session lasts.
 */
export interface MigrationState {
  members: string[]
}

const STORAGE_KEY = 'marquez.migrationSet'

/**
 * A plan under construction should survive a refresh. sessionStorage rather
 * than localStorage: the set belongs to the piece of work in this tab, not to
 * the browser forever.
 *
 * Both accessors can throw — private browsing, blocked storage — and a lost
 * set is an inconvenience, not a reason to fail the page.
 */
export const loadPersistedMembers = (): string[] => {
  try {
    const raw = window.sessionStorage?.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed) ? parsed.filter((entry) => typeof entry === 'string') : []
  } catch {
    return []
  }
}

export const persistMembers = (members: string[]) => {
  try {
    if (members.length) window.sessionStorage?.setItem(STORAGE_KEY, JSON.stringify(members))
    else window.sessionStorage?.removeItem(STORAGE_KEY)
  } catch {
    // Persisting is best effort; the set still works for this page view.
  }
}

const initialState: MigrationState = {
  members: loadPersistedMembers(),
}

const migrationSlice = createSlice({
  name: 'migration',
  initialState,
  reducers: {
    setMigrationMembers: (state, action: PayloadAction<string[]>) => {
      state.members = [...new Set(action.payload.filter(Boolean))]
    },
    toggleMigrationMember: (state, action: PayloadAction<string>) => {
      state.members = state.members.includes(action.payload)
        ? state.members.filter((member) => member !== action.payload)
        : [...state.members, action.payload]
    },
    removeMigrationMember: (state, action: PayloadAction<string>) => {
      state.members = state.members.filter((member) => member !== action.payload)
    },
    clearMigrationSet: (state) => {
      state.members = []
    },
  },
})

export const {
  setMigrationMembers,
  toggleMigrationMember,
  removeMigrationMember,
  clearMigrationSet,
} = migrationSlice.actions

export default migrationSlice.reducer
