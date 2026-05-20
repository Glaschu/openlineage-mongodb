// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { type ReactElement, type SyntheticEvent } from 'react'
import { createTheme } from '@mui/material/styles'
import { darken } from '@mui/material'
import { useTheme } from '@emotion/react'
import Tooltip from '@mui/material/Tooltip'

interface MqToolTipProps {
  title: string | ReactElement
  children: ReactElement
  onOpen?: (event: SyntheticEvent) => void
  onClose?: (event: SyntheticEvent) => void
  placement?:
    | 'left'
    | 'right'
    | 'top'
    | 'right-end'
    | 'left-end'
    | 'top-end'
    | 'bottom'
    | 'bottom-end'
    | 'top-start'
    | 'bottom-start'
    | 'left-start'
    | 'right-start'
}

const MQTooltip = ({ title, onOpen, onClose, children, placement }: MqToolTipProps) => {
  const theme = createTheme(useTheme())
  return (
    <Tooltip
      onOpen={onOpen}
      onClose={onClose}
      title={title}
      placement={placement || 'bottom'}
      componentsProps={{
        tooltip: {
          sx: {
            backgroundColor: `${darken(theme.palette.background.paper, 0.1)}`,
            color: theme.palette.common.white,
            border: `1px solid ${theme.palette.secondary.main}`,
            maxWidth: '600px',
            fontSize: 14,
          },
        },
      }}
    >
      {children}
    </Tooltip>
  )
}

export default MQTooltip
