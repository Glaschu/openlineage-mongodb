import { Box } from '@mui/system'
import { PositionedNode } from '../../components/graph'
import { theme } from '../../helpers/theme'
import React from 'react'

export interface TableLineageGroupNodeData {
    name: string
    namespace: string
}

interface TableLineageGroupNodeProps {
    node: PositionedNode<'group', TableLineageGroupNodeData>
}

const TableLineageGroupNode = ({ node }: TableLineageGroupNodeProps) => {
    return (
        <g>
            <Box
                component={'rect'}
                sx={{
                    x: 0,
                    y: 0,
                    width: node.width,
                    height: node.height,
                    rx: 8,
                    fill: 'rgba(113, 221, 191, 0.06)', // Very faint tint of primary color
                    stroke: theme.palette.primary.main,
                    strokeWidth: 2,
                    strokeDasharray: '8 6',
                }}
            />
            <text
                x={12}
                y={20}
                fill={theme.palette.text.primary}
                fontSize={14}
                fontWeight={'bold'}
                fontFamily={'"Inter", "Roboto", "Helvetica", "Arial", sans-serif'}
            >
                {node.data.name}
            </text>
        </g>
    )
}

TableLineageGroupNode.getLayoutOptions = (node: TableLineageGroupNodeProps['node']) => {
    return {
        ...node,
        layoutOptions: {
            'elk.direction': 'RIGHT',
            'elk.padding': '[top=30,left=16,bottom=16,right=16]',
        },
    }
}

export default TableLineageGroupNode
