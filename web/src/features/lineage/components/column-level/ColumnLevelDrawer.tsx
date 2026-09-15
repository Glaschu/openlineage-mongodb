import { Icon, faArrowRightLong, faDatabase } from '@/shared/components/icons'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material'
import { Box } from '@mui/system'
import { ColumnLineageGraph } from '@/shared/types/api'
import { Fragment } from 'react'
import { parseColumnLineageNode } from './layout'
import { theme } from '@/shared/theme/theme'
import { useDataset } from '@/features/datasets/api'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from '@/i18n'
import CloseIcon from '@mui/icons-material/Close'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import IconButton from '@mui/material/IconButton'
import MqEmpty from '@/shared/components/MqEmpty/MqEmpty'
import MqJsonView from '@/shared/components/MqJsonView/MqJsonView'
import MqText from '@/shared/components/MqText/MqText'

const WIDTH = 600

interface ColumnRef {
  namespace: string
  dataset: string
  field: string
  transformationType?: string | null
  transformationDescription?: string | null
}

interface ColumnLevelDrawerProps {
  columnLineage?: ColumnLineageGraph
}

const ColumnLevelDrawer = ({ columnLineage }: ColumnLevelDrawerProps) => {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const datasetName = searchParams.get('dataset') || ''
  const namespace = searchParams.get('namespace') || ''
  const selectedColumn = searchParams.get('columnName')

  const { data: dataset, isLoading: isDatasetLoading } = useDataset(namespace, datasetName)

  const selectColumn = (field: string) => {
    setSearchParams({
      ...Object.fromEntries(searchParams.entries()),
      dataset: datasetName,
      namespace,
      column: `datasetField:${namespace}:${datasetName}:${field}`,
      columnName: field,
    })
  }

  const goToColumn = (ref: ColumnRef) => {
    const params = new URLSearchParams({
      dataset: ref.dataset,
      namespace: ref.namespace,
      column: `datasetField:${ref.namespace}:${ref.dataset}:${ref.field}`,
      columnName: ref.field,
    })
    const depth = searchParams.get('depth')
    if (depth) params.set('depth', depth)
    navigate(
      `/datasets/column-level/${encodeURIComponent(ref.namespace)}/${encodeURIComponent(
        ref.dataset
      )}?${params.toString()}`
    )
  }

  // Upstream: read straight from the dataset's columnLineage facet — it carries the
  // transformation metadata the graph edges lack.
  const derivedFrom: ColumnRef[] =
    selectedColumn && dataset?.columnLineage
      ? (
          dataset.columnLineage.find((entry) => entry.name === selectedColumn)?.inputFields ?? []
        ).map((input) => {
          const entry = dataset.columnLineage.find((e) => e.name === selectedColumn)
          return {
            namespace: input.namespace,
            dataset: input.name,
            field: input.field,
            transformationType: input.transformationType ?? entry?.transformationType,
            transformationDescription:
              input.transformationDescription ?? entry?.transformationDescription,
          }
        })
      : []

  // Downstream: consumers of this column within the loaded lineage graph.
  const columnNodeId = searchParams.get('column')
  const feedsInto: ColumnRef[] =
    selectedColumn && columnNodeId && columnLineage
      ? (columnLineage.graph.find((node) => node.id === columnNodeId)?.outEdges ?? []).map(
          (edge) => {
            const parsed = parseColumnLineageNode(edge.destination)
            return { namespace: parsed.namespace, dataset: parsed.dataset, field: parsed.column }
          }
        )
      : []

  const renderColumnRefCard = (ref: ColumnRef, keyPrefix: string) => (
    <Box
      key={`${keyPrefix}:${ref.namespace}:${ref.dataset}:${ref.field}`}
      onClick={() => goToColumn(ref)}
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 1,
        p: 1.5,
        mb: 1,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        '&:hover': { borderColor: theme.palette.primary.main },
      }}
    >
      <Box>
        <MqText font={'mono'}>{`${ref.dataset}.${ref.field}`}</MqText>
        <MqText subdued small>
          {ref.namespace}
        </MqText>
      </Box>
      <Box display={'flex'} alignItems={'center'}>
        {ref.transformationType && (
          <Chip
            size={'small'}
            variant={'outlined'}
            color={'primary'}
            label={ref.transformationType}
            sx={{ mr: 1 }}
          />
        )}
        {ref.transformationDescription && (
          <Chip size={'small'} variant={'outlined'} label={ref.transformationDescription} />
        )}
      </Box>
    </Box>
  )

  return (
    <Box width={`${WIDTH}px`}>
      <Box
        position={'sticky'}
        top={0}
        bgcolor={theme.palette.background.default}
        pt={2}
        zIndex={theme.zIndex.appBar}
        sx={{ borderBottom: 1, borderColor: 'divider', width: '100%' }}
      >
        <Box px={2} pb={2} display={'flex'} justifyContent={'space-between'} alignItems={'center'}>
          <Box display={'flex'} alignItems={'center'}>
            <Box display={'flex'} alignItems={'center'}>
              <Box
                mr={2}
                borderRadius={theme.spacing(1)}
                p={1}
                width={32}
                height={32}
                display={'flex'}
                bgcolor={theme.palette.info.main}
              >
                <Icon
                  aria-hidden={'true'}
                  title={'Dataset'}
                  icon={faDatabase}
                  width={16}
                  height={16}
                  color={theme.palette.common.white}
                />
              </Box>
            </Box>
            <Box>
              <MqText heading>{datasetName}</MqText>
              <MqText subdued small>
                {namespace}
              </MqText>
            </Box>
          </Box>
          <IconButton
            onClick={() => {
              setSearchParams({})
            }}
          >
            <CloseIcon fontSize={'small'} />
          </IconButton>
        </Box>
      </Box>
      {!dataset || isDatasetLoading ? (
        <Box mt={2} display={'flex'} justifyContent={'center'}>
          <CircularProgress color='primary' />
        </Box>
      ) : (
        <>
          {selectedColumn && (
            <Box p={2}>
              <Box display={'flex'} alignItems={'center'} mb={2}>
                <MqText subheading>COLUMN</MqText>
                <Chip
                  size={'small'}
                  color={'primary'}
                  variant={'outlined'}
                  label={selectedColumn}
                  sx={{ ml: 1 }}
                />
              </Box>
              <Box mb={1} display={'flex'} alignItems={'center'}>
                <Icon
                  icon={faArrowRightLong}
                  color={theme.palette.primary.main}
                  style={{ transform: 'rotate(180deg)', marginRight: 8 }}
                />
                <MqText subdued>DERIVED FROM</MqText>
              </Box>
              {derivedFrom.length > 0 ? (
                derivedFrom.map((ref) => renderColumnRefCard(ref, 'in'))
              ) : (
                <Box mb={1}>
                  <MqText subdued small>
                    No upstream column lineage recorded for this column.
                  </MqText>
                </Box>
              )}
              <Box mb={1} mt={2} display={'flex'} alignItems={'center'}>
                <Icon
                  icon={faArrowRightLong}
                  color={theme.palette.primary.main}
                  style={{ marginRight: 8 }}
                />
                <MqText subdued>FEEDS INTO</MqText>
              </Box>
              {feedsInto.length > 0 ? (
                feedsInto.map((ref) => renderColumnRefCard(ref, 'out'))
              ) : (
                <Box mb={1}>
                  <MqText subdued small>
                    No downstream consumers within the loaded graph. Increase depth to trace
                    further.
                  </MqText>
                </Box>
              )}
            </Box>
          )}
          <Box p={2} pb={0}>
            <MqText subheading>SCHEMA</MqText>
            {selectedColumn === null && (
              <MqText subdued small>
                Select a row to trace a column.
              </MqText>
            )}
          </Box>
          {dataset.fields.length > 0 ? (
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell align='left'>
                    <MqText subheading inline>
                      {t('dataset_info_columns.name')}
                    </MqText>
                  </TableCell>
                  <TableCell align='left'>
                    <MqText subheading inline>
                      {t('dataset_info_columns.type')}
                    </MqText>
                  </TableCell>
                  <TableCell align='left'>
                    <MqText subheading inline>
                      {t('dataset_info_columns.description')}
                    </MqText>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dataset.fields.map((field) => {
                  const isSelected = field.name === selectedColumn
                  return (
                    <Fragment key={field.name}>
                      <TableRow
                        hover
                        selected={isSelected}
                        onClick={() => selectColumn(field.name)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell align='left'>
                          <MqText font={'mono'}>{field.name}</MqText>
                        </TableCell>
                        <TableCell align='left'>
                          <Chip
                            size={'small'}
                            label={<MqText font={'mono'}>{field.type}</MqText>}
                            variant={'outlined'}
                          />
                        </TableCell>
                        <TableCell align='left'>
                          <MqText subdued>{field.description || 'no description'}</MqText>
                        </TableCell>
                      </TableRow>
                    </Fragment>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <Box p={2}>
              <MqEmpty title={'No schema available'} />
            </Box>
          )}
          {dataset.columnLineage && dataset.columnLineage.length > 0 && (
            <Box p={2}>
              <Accordion
                disableGutters
                elevation={0}
                sx={{ border: `1px solid ${theme.palette.divider}` }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <MqText subheading>RAW COLUMN LINEAGE FACET</MqText>
                </AccordionSummary>
                <AccordionDetails>
                  <MqJsonView data={dataset.columnLineage} />
                </AccordionDetails>
              </Accordion>
            </Box>
          )}
        </>
      )}
    </Box>
  )
}

export default ColumnLevelDrawer
