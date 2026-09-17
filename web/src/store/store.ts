import { configureStore } from '@reduxjs/toolkit'

import displayReducer from './slices/displaySlice'
import lineageReducer from '@/features/lineage/slice'
import migrationReducer, {
  COLUMN_MIGRATION_STORAGE_KEY,
  persistMembers,
} from '@/features/lineage/migrationSlice'
import namespacesReducer from '@/features/namespaces/slice'

const store = configureStore({
  reducer: {
    display: displayReducer,
    lineage: lineageReducer,
    migration: migrationReducer,
    namespaces: namespacesReducer,
  },
})

// A migration plan under construction outlives a refresh.
let lastPersistedMembers = store.getState().migration.members
let lastPersistedColumns = store.getState().migration.columnMembers
store.subscribe(() => {
  const { members, columnMembers } = store.getState().migration
  if (members !== lastPersistedMembers) {
    lastPersistedMembers = members
    persistMembers(members)
  }
  if (columnMembers !== lastPersistedColumns) {
    lastPersistedColumns = columnMembers
    persistMembers(columnMembers, COLUMN_MIGRATION_STORAGE_KEY)
  }
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export default store
