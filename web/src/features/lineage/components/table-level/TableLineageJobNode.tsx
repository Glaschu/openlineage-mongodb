import { Divider } from '@mui/material'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { RootState } from '@/store/store'
import { LineageGraph } from '@/shared/types/api'
import { LineageJob } from '@/shared/types/lineage'
import { PositionedNode } from '@/features/lineage/components/graph'
import { TableLineageJobNodeData } from './nodes'
import { faCog } from '@fortawesome/free-solid-svg-icons/faCog'
import { formatUpdatedAt } from '@/shared/utils'
import { runStateColor } from '@/shared/utils/nodes'
import { theme } from '@/shared/theme/theme'
import { truncateText, truncateTextFront } from '@/shared/utils/text'
import { useNavigate, useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Box from '@mui/system/Box'
import MQTooltip from '@/shared/components/MqTooltip/MQTooltip'
import MqStatus from '@/shared/components/MqStatus/MqStatus'
import MqText from '@/shared/components/MqText/MqText'
import React from 'react'

interface TableLineageJobNodeProps {
  node: PositionedNode<'job', TableLineageJobNodeData>
}

const ICON_SIZE = 12

const TableLineageJobNode = ({ node }: TableLineageJobNodeProps) => {
  const lineage = useSelector((state: RootState) => state.lineage.lineage)
  const navigate = useNavigate()
  const { name, namespace } = useParams()
  const isSelected = name === node.data.job.name && namespace === node.data.job.namespace
  const handleClick = () => {
    navigate(
      `/lineage/job/${encodeURIComponent(node.data.job.namespace)}/${encodeURIComponent(
        node.data.job.name
      )}?tableLevelNode=${encodeURIComponent(node.id)}`
    )
  }

  const addToToolTip = (job: LineageJob) => {
    return (
      <Box>
        <Box display={'flex'} justifyContent={'space-between'}>
          <MqText block bold sx={{ mr: 6 }}>
            Namespace:
          </MqText>
          <MqText block font={'mono'}>
            {truncateTextFront(job.namespace, 40)}
          </MqText>
        </Box>
        <Box display={'flex'} justifyContent={'space-between'}>
          <MqText block bold sx={{ mr: 6 }}>
            Name:
          </MqText>
          <MqText block font={'mono'}>
            {truncateTextFront(job.name, 40)}
          </MqText>
        </Box>
        {job.description && (
          <Box display={'flex'} justifyContent={'space-between'}>
            <MqText block bold sx={{ mr: 6 }}>
              Description:
            </MqText>
            <MqText block font={'mono'}>
              {job.description}
            </MqText>
          </Box>
        )}
        <Box display={'flex'} justifyContent={'space-between'}>
          <MqText block bold sx={{ mr: 6 }}>
            Updated at:
          </MqText>
          <MqText block font={'mono'}>
            {formatUpdatedAt(job.updatedAt)}
          </MqText>
        </Box>
        <Divider sx={{ my: 1 }} />
        <Box display={'flex'} justifyContent={'space-between'} alignItems={'center'}>
          <MqText block bold sx={{ mr: 6 }}>
            Latest Run:
          </MqText>
          <MqStatus
            label={job.latestRun?.state || 'N/A'}
            color={
              job.latestRun?.state
                ? runStateColor(job.latestRun?.state)
                : theme.palette.secondary.main
            }
          />
        </Box>
      </Box>
    )
  }

  return (
    <g>
      <Box
        component={'rect'}
        sx={{
          x: 0,
          y: 0,
          width: node.width,
          height: node.height,
          filter: isSelected ? `drop-shadow( 0 0 4px ${theme.palette.primary.main})` : 'none',
          rx: 4,
          fill: theme.palette.background.paper,
          cursor: 'pointer',
          transition: 'filter 0.3',
        }}
        onClick={handleClick}
      />
      <Box
        component={'rect'}
        x={0}
        y={0}
        height={node.height}
        width={24}
        sx={{
          rx: 4,
          fill: node.data.job.latestRun
            ? runStateColor(node.data.job.latestRun.state)
            : theme.palette.secondary.main,
        }}
      />
      <FontAwesomeIcon
        aria-hidden={'true'}
        title={'Job'}
        icon={faCog}
        width={ICON_SIZE}
        height={ICON_SIZE}
        x={6}
        y={ICON_SIZE / 2}
        color={theme.palette.common.white}
        onClick={handleClick}
      />
      <MQTooltip title={addToToolTip(node.data.job)} placement={'right-start'}>
        <g>
          <text
            fontSize='8'
            fontFamily={`${'Source Code Pro'}, mono`}
            fill={'white'}
            x={28}
            y={10}
            onClick={handleClick}
            cursor={'pointer'}
          >
            JOB
          </text>
          <text fontSize='8' fill={'white'} x={28} y={20} onClick={handleClick} cursor={'pointer'}>
            {truncateText(node.data.job.name, 16)}
          </text>
        </g>
      </MQTooltip>
    </g>
  )
}

TableLineageJobNode.getLayoutOptions = (node: TableLineageJobNodeProps['node']) => ({
  ...node,
})

export default TableLineageJobNode
