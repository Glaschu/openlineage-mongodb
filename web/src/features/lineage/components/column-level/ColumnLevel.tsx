import { ActionBar, ColumnSearchOption } from './ActionBar'
import { CircularProgress, Drawer } from '@mui/material'
import { ColumnLevelNodeData, ColumnLevelNodeKinds, columnLevelNodeRenderer } from './nodes'
import { Graph, ZoomPanControls } from '@/features/lineage/components/graph'
import { HEADER_HEIGHT, theme } from '@/shared/theme/theme'
import { ZoomControls } from './ZoomControls'
import { createElkNodes } from './layout'
import { downloadColumnLineageCsv, isLineageDirection } from './columnLineageUtils'
import { useCallbackRef } from '@/shared/hooks/hooks'
import { useColumnLineage } from '@/features/lineage/api'
import { useDataset } from '@/features/datasets/api'
import { useParams, useSearchParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import ColumnLevelDrawer from './ColumnLevelDrawer'
import MqParentSize from '@/shared/components/MqParentSize/MqParentSize'
import React, { useEffect, useMemo, useRef, useState } from 'react'

const zoomInFactor = 1.5
const zoomOutFactor = 1 / zoomInFactor

const ColumnLevel: React.FC = () => {
  const { namespace, name } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()

  const [depth, setDepth] = useState(Number(searchParams.get('depth')) || 2)

  const graphControls = useRef<ZoomPanControls>()

  const {
    data: columnLineage,
    isFetching,
    refetch,
  } = useColumnLineage('DATASET', namespace || '', name || '', depth)

  // The center dataset's columnLineage facet carries the transformation metadata
  // used to annotate the CSV export and the drawer derivation cards.
  const { data: centerDataset } = useDataset(namespace || '', name || '')

  const column = searchParams.get('column')
  const directionParam = searchParams.get('direction')
  const direction = isLineageDirection(directionParam) ? directionParam : 'both'
  const isolate = searchParams.get('isolate') === 'true'

  const setGraphControls = useCallbackRef((zoomControls) => {
    graphControls.current = zoomControls
  })

  // Provide fallback empty objects if columnLineage is not loaded yet
  const { nodes, edges } = useMemo(
    () =>
      columnLineage
        ? createElkNodes(columnLineage, column, direction, isolate)
        : { nodes: [], edges: [] },
    [columnLineage, column, direction, isolate]
  )

  const searchOptions = useMemo<ColumnSearchOption[]>(() => {
    if (!columnLineage) return []

    return (
      columnLineage.graph
        .filter((node) => !!node.data)
        .map((node) => ({
          id: node.id,
          column: node.data.field,
          dataset: node.data.dataset,
          namespace: node.data.namespace,
        }))
        // Autocomplete's groupBy expects options already grouped by dataset.
        .sort((a, b) => a.dataset.localeCompare(b.dataset) || a.column.localeCompare(b.column))
    )
  }, [columnLineage])

  useEffect(() => {
    if (nodes.length > 0) {
      const timer = setTimeout(() => {
        if (column) {
          graphControls.current?.centerOnPositionedNode(column, 1)
        } else {
          graphControls.current?.fitContent()
        }
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [nodes.length, column, direction, isolate])

  if (!columnLineage) {
    return <div />
  }

  const handleScaleZoom = (inOrOut: 'in' | 'out') => {
    graphControls.current?.scaleZoom(inOrOut === 'in' ? zoomInFactor : zoomOutFactor)
  }

  const handleResetZoom = () => {
    graphControls.current?.fitContent()
  }

  const handleExportCsv = () => {
    downloadColumnLineageCsv(
      columnLineage.graph,
      namespace || 'unknown',
      name || 'unknown',
      centerDataset
    )
  }

  return (
    <>
      <ActionBar
        refresh={refetch}
        depth={depth}
        setDepth={setDepth}
        onExportCsv={handleExportCsv}
        searchOptions={searchOptions}
      />
      <Box height={`calc(100vh - ${HEADER_HEIGHT}px - 64px)`}>
        {isFetching && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              padding: '8px 16px',
              borderRadius: '20px',
              backdropFilter: 'blur(4px)',
            }}
          >
            <CircularProgress size={20} color='inherit' sx={{ mr: 1, color: 'white' }} />
            <span style={{ color: 'white', fontSize: '0.875rem' }}>Loading...</span>
          </Box>
        )}
        <Drawer
          anchor={'right'}
          open={!!searchParams.get('dataset')}
          onClose={() => setSearchParams({})}
          PaperProps={{
            sx: {
              backgroundColor: theme.palette.background.default,
              backgroundImage: 'none',
              mt: `${HEADER_HEIGHT}px`,
              height: `calc(100vh - ${HEADER_HEIGHT}px)`,
            },
          }}
        >
          <Box>
            <ColumnLevelDrawer columnLineage={columnLineage} />
          </Box>
        </Drawer>
        <ZoomControls handleScaleZoom={handleScaleZoom} handleResetZoom={handleResetZoom} />
        <MqParentSize>
          {(parent) => (
            <Graph<ColumnLevelNodeKinds, ColumnLevelNodeData>
              id='column-level-graph'
              backgroundColor={theme.palette.background.default}
              height={parent.height}
              width={parent.width}
              nodes={nodes}
              edges={edges}
              direction='right'
              nodeRenderers={columnLevelNodeRenderer}
              setZoomPanControls={setGraphControls}
            />
          )}
        </MqParentSize>
      </Box>
    </>
  )
}

export default ColumnLevel
