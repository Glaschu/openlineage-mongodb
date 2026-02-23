import { PayloadAction, createSlice } from '@reduxjs/toolkit'

export interface IDisplayState {
  error: string
  success: string
  dialogIsOpen: boolean
  editWarningField?: string
  isLoading: boolean
}

const initialState: IDisplayState = {
  error: '',
  success: '',
  dialogIsOpen: false,
  editWarningField: '',
  isLoading: false,
}

const displaySlice = createSlice({
  name: 'display',
  initialState,
  reducers: {
    dialogToggle: (state, action: PayloadAction<string>) => {
      state.dialogIsOpen = !state.dialogIsOpen
      state.editWarningField = action.payload
    },
    applicationError: (state, action: PayloadAction<string>) => {
      state.error = action.payload
      state.dialogIsOpen = true
      state.success = ''
    },
    setIsLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
  },
})

export const { dialogToggle, applicationError, setIsLoading } = displaySlice.actions
export default displaySlice.reducer
