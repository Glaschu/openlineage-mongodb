// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { DateTimePicker } from '@mui/x-date-pickers'
import { alpha, createTheme } from '@mui/material/styles'
import { useTheme } from '@emotion/react'
import dayjs from '../../../helpers/dayjs'

interface DatePickerProps {
  value: string
  onChange: (e: any) => void
  label?: string
  format?: string
}

const MqDatePicker = ({
  value,
  onChange,
  label = '',
  format = 'MM DD YYYY hh:mm a',
}: DatePickerProps) => {
  const theme = createTheme(useTheme())

  return (
    <DateTimePicker
      label={label}
      slotProps={{
        desktopPaper: {
          sx: {
            backgroundImage: 'none',
          },
        },
      }}
      sx={{
        label: {
          left: theme.spacing(2),
        },
        '.MuiOutlinedInput-input': {
          padding: '6.5px 14px',
        },
        '&:hover': {
          '.MuiOutlinedInput-notchedOutline': {
            borderColor: `${theme.palette.primary.main} !important`,
            boxShadow: `${alpha(theme.palette.primary.main, 0.25)} 0 0 0 3px`,
            transition: theme.transitions.create(['border-color', 'box-shadow']),
          },
        },
        '.MuiOutlinedInput-notchedOutline': {
          borderRadius: theme.spacing(4),
          '> legend': {
            marginLeft: theme.spacing(2),
            left: theme.spacing(2),
          },
        },
      }}
      value={dayjs(value)}
      onChange={onChange}
      format={format}
    />
  )
}

export default MqDatePicker
