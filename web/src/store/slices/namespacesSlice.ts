import { Nullable } from '../../types/util/Nullable'
import { PayloadAction, createSlice } from '@reduxjs/toolkit'

export interface INamespacesState {
  selectedNamespace: Nullable<string>
}

const getInitialSelectedNamespace = (): Nullable<string> => {
  if (typeof window !== 'undefined') {
    return window.localStorage.getItem('selectedNamespace')
  }
  return null
}

const initialState: INamespacesState = {
  selectedNamespace: getInitialSelectedNamespace(),
}

const namespacesSlice = createSlice({
  name: 'namespaces',
  initialState,
  reducers: {
    selectNamespace: (state, action: PayloadAction<string>) => {
      state.selectedNamespace = action.payload
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('selectedNamespace', action.payload)
      }
    },
  },
})

export const { selectNamespace } = namespacesSlice.actions
export default namespacesSlice.reducer
