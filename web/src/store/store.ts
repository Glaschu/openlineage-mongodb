import { configureStore } from '@reduxjs/toolkit'

import displayReducer from './slices/displaySlice'
import lineageReducer from '@/features/lineage/slice'
import migrationReducer, { persistMembers } from '@/features/lineage/migrationSlice'
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
store.subscribe(() => {
  const { members } = store.getState().migration
  if (members === lastPersistedMembers) return
  lastPersistedMembers = members
  persistMembers(members)
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export default store
