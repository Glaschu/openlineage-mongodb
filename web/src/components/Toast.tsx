// Copyright 2018-2024 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { RootState } from '../store/store'
import { Snackbar, SnackbarCloseReason } from '@mui/material'
import { SyntheticEvent } from 'react'
import { dialogToggle } from '../store/slices/displaySlice'
import { useDispatch, useSelector } from 'react-redux'
import CloseIcon from '@mui/icons-material/Close'
import IconButton from '@mui/material/IconButton'

const Toast = () => {
  const error = useSelector((state: RootState) => state.display.error)
  const success = useSelector((state: RootState) => state.display.success)
  const isOpen = useSelector((state: RootState) => state.display.dialogIsOpen)
  const dispatch = useDispatch()
  const handleClose = (_: SyntheticEvent | Event, reason?: SnackbarCloseReason) => {
    if (reason === 'clickaway') {
      return
    }

    dispatch(dialogToggle('error'))
  }

  const action = (
    <IconButton size='small' aria-label='close' color='inherit' onClick={handleClose}>
      <CloseIcon fontSize='small' />
    </IconButton>
  )

  return (
    <Snackbar
      open={isOpen}
      autoHideDuration={5000}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      onClose={handleClose}
      message={error || success}
      action={action}
    />
  )
}

export default Toast
