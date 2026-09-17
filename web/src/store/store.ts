import { configureStore } from '@reduxjs/toolkit'

import displayReducer from './slices/displaySlice'
import lineageReducer from '@/features/lineage/slice'
import migrationReducer from '@/features/lineage/migrationSlice'
import namespacesReducer from '@/features/namespaces/slice'

const store = configureStore({
  reducer: {
    display: displayReducer,
    lineage: lineageReducer,
    migration: migrationReducer,
    namespaces: namespacesReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export default store
