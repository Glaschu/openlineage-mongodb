// Copyright 2018-2024 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { createTheme } from '@mui/material/styles'
import { useTheme } from '@emotion/react'
import InputBase, { InputBaseProps } from '@mui/material/InputBase'

export interface MqInputBaseProps extends InputBaseProps {}

export const MqInputBase = (props: MqInputBaseProps) => {
  const theme = createTheme(useTheme())
  return (
    <InputBase
      {...props}
      sx={{
        borderRadius: theme.spacing(4),
        position: 'relative',
        backgroundColor: 'transparent',
        fontSize: 16,
        padding: `${theme.spacing(1)} ${theme.spacing(2)}`,
        transition: theme.transitions.create(['border-color', 'box-shadow']),
        ...props.sx,
      }}
    />
  )
}

export const MqInputNoIcon = (props: InputBaseProps) => {
  const theme = createTheme(useTheme())

  return (
    <InputBase
      {...props}
      sx={{
        borderRadius: theme.spacing(4),
        position: 'relative',
        backgroundColor: 'transparent',
        fontSize: 16,
        padding: `${theme.spacing(1)} 0 ${theme.spacing(1)} ${theme.spacing(1)}`,
        transition: theme.transitions.create(['border-color', 'box-shadow']),
      }}
    />
  )
}
