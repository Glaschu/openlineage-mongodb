// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { Icon, IconDefinition } from '@/shared/components/icons'
import Box from '@mui/material/Box'

interface MqSmallIconProps {
  icon: IconDefinition
  backgroundColor: string
  foregroundColor: string
  shape: 'circle' | 'rect'
}

const MqSmallIcon = ({ icon, backgroundColor, foregroundColor, shape }: MqSmallIconProps) => {
  return (
    <Box
      width={16}
      height={16}
      bgcolor={backgroundColor}
      borderRadius={shape === 'circle' ? '50%' : '4px'}
      display={'flex'}
      justifyContent={'center'}
      alignItems={'center'}
    >
      <Icon
        style={{
          width: '10px !important',
          height: 9,
          fontSize: 9,
        }}
        icon={icon}
        color={foregroundColor}
      />
    </Box>
  )
}

export default MqSmallIcon
