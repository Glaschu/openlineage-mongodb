// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { type ReactElement } from 'react'
import Box from '@mui/material/Box'
import MqText from '../text/MqText'

interface MqInfoProps {
  icon: ReactElement
  label: string
  value: ReactElement | string | number
}

export const MqInfo = ({ icon, label, value }: MqInfoProps) => {
  return (
    <Box>
      <Box display={'flex'} alignItems={'center'} mb={1}>
        {icon}
        <Box ml={1}>
          <MqText subdued>{label}</MqText>
        </Box>
      </Box>
      <Box display={'flex'} alignItems={'center'}>
        <MqText bold>{value}</MqText>
      </Box>
    </Box>
  )
}
