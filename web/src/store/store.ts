import { configureStore } from '@reduxjs/toolkit'
import { createBrowserHistory } from 'history'
import { createRouterMiddleware, createRouterReducer } from '@lagunovsky/redux-react-router'

import displayReducer from './slices/displaySlice'
import lineageReducer from '@/features/lineage/slice'
import namespacesReducer from '@/features/namespaces/slice'

export const history = createBrowserHistory()
const routerMiddleware = createRouterMiddleware(history)

const store = configureStore({
  reducer: {
    router: createRouterReducer(history),
    display: displayReducer,
    lineage: lineageReducer,
    namespaces: namespacesReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(routerMiddleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export default store
