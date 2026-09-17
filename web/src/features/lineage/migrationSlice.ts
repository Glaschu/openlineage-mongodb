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
  /** Datasets and jobs, as `{type}:{namespace}:{name}`. */
  members: string[]
  /** Columns, as `datasetField:{namespace}:{dataset}:{column}`. */
  columnMembers: string[]
}

const STORAGE_KEY = 'marquez.migrationSet'
const COLUMN_STORAGE_KEY = 'marquez.migrationSet.columns'

/**
 * A plan under construction should survive a refresh. sessionStorage rather
 * than localStorage: the set belongs to the piece of work in this tab, not to
 * the browser forever.
 *
 * Both accessors can throw — private browsing, blocked storage — and a lost
 * set is an inconvenience, not a reason to fail the page.
 */
export const loadPersistedMembers = (key: string = STORAGE_KEY): string[] => {
  try {
    const raw = window.sessionStorage?.getItem(key)
    const parsed = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed) ? parsed.filter((entry) => typeof entry === 'string') : []
  } catch {
    return []
  }
}

export const persistMembers = (members: string[], key: string = STORAGE_KEY) => {
  try {
    if (members.length) window.sessionStorage?.setItem(key, JSON.stringify(members))
    else window.sessionStorage?.removeItem(key)
  } catch {
    // Persisting is best effort; the set still works for this page view.
  }
}

const initialState: MigrationState = {
  members: loadPersistedMembers(STORAGE_KEY),
  columnMembers: loadPersistedMembers(COLUMN_STORAGE_KEY),
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
      state.columnMembers = []
    },
    setColumnMigrationMembers: (state, action: PayloadAction<string[]>) => {
      state.columnMembers = [...new Set(action.payload.filter(Boolean))]
    },
    toggleColumnMigrationMember: (state, action: PayloadAction<string>) => {
      state.columnMembers = state.columnMembers.includes(action.payload)
        ? state.columnMembers.filter((member) => member !== action.payload)
        : [...state.columnMembers, action.payload]
    },
    removeColumnMigrationMember: (state, action: PayloadAction<string>) => {
      state.columnMembers = state.columnMembers.filter((member) => member !== action.payload)
    },
  },
})

export const {
  setMigrationMembers,
  toggleMigrationMember,
  removeMigrationMember,
  clearMigrationSet,
  setColumnMigrationMembers,
  toggleColumnMigrationMember,
  removeColumnMigrationMember,
} = migrationSlice.actions

export const COLUMN_MIGRATION_STORAGE_KEY = COLUMN_STORAGE_KEY

export default migrationSlice.reducer
