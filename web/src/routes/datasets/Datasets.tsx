// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import {
  Button,
  Chip,
  Container,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  createTheme,
} from '@mui/material'
import { Dataset } from '../../types/api'
import { HEADER_HEIGHT } from '../../helpers/theme'
import { RootState } from '../../store/store'
import { MqScreenLoad } from '../../components/core/screen-load/MqScreenLoad'
import {
  datasetFacetsQualityAssertions,
  datasetFacetsStatus,
  encodeNode,
} from '../../helpers/nodes'
import Refresh from '@mui/icons-material/Refresh'

import { formatUpdatedAt } from '../../helpers'
import { truncateText } from '../../helpers/text'
import { useDatasets } from '../../queries/datasets'
import { useSelector } from 'react-redux'
import { useTheme } from '@emotion/react'
import { useTranslation } from 'react-i18next'
import Assertions from '../../components/datasets/Assertions'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress/CircularProgress'
import IconButton from '@mui/material/IconButton'
import MQTooltip from '../../components/core/tooltip/MQTooltip'
import MqEmpty from '../../components/core/empty/MqEmpty'
import MqPaging from '../../components/paging/MqPaging'
import MqStatus from '../../components/core/status/MqStatus'
import MqText from '../../components/core/text/MqText'
import NamespaceSelect from '../../components/namespace-select/NamespaceSelect'
import React from 'react'

interface DatasetsState {
  page: number
}

const PAGE_SIZE = 20
const DATASET_HEADER_HEIGHT = 64

const Datasets: React.FC = () => {
  const selectedNamespace = useSelector((state: RootState) => state.namespaces.selectedNamespace)
  const [state, setState] = React.useState<DatasetsState>({ page: 0 })
  const {
    data: datasetsData,
    isLoading: isDatasetsLoading,
    refetch,
  } = useDatasets(selectedNamespace || '', PAGE_SIZE, state.page * PAGE_SIZE)

  const datasets = datasetsData?.datasets || []
  const totalCount = datasetsData?.totalCount || 0

  const theme = createTheme(useTheme())

  React.useEffect(() => {
    // If selectedNamespace changes, we reset page but data fetching is handled by the hook key
    if (selectedNamespace) {
      if (state.page !== 0) {
        setState({ ...state, page: 0 })
      }
    }
  }, [selectedNamespace])

  const handleClickPage = (direction: 'prev' | 'next') => {
    const directionPage = direction === 'next' ? state.page + 1 : state.page - 1

    // reset page scroll
    window.scrollTo(0, 0)
    setState({ ...state, page: directionPage })
  }

  const { t } = useTranslation()
  return (
    <Container maxWidth={'lg'} disableGutters>
      <Box p={2} display={'flex'} justifyContent={'space-between'} alignItems={'center'}>
        <Box display={'flex'}>
          <MqText heading>{t('datasets_route.heading')}</MqText>
          {!isDatasetsLoading && (
            <Chip
              size={'small'}
              variant={'outlined'}
              color={'primary'}
              sx={{ marginLeft: 1 }}
              label={totalCount + ' total'}
            ></Chip>
          )}
        </Box>
        <Box display={'flex'} alignItems={'center'}>
          {isDatasetsLoading && <CircularProgress size={16} />}
          <NamespaceSelect />
          <MQTooltip title={'Refresh'}>
            <IconButton
              sx={{ ml: 2 }}
              color={'primary'}
              size={'small'}
              onClick={() => {
                refetch()
              }}
            >
              <Refresh fontSize={'small'} />
            </IconButton>
          </MQTooltip>
        </Box>
      </Box>
      <MqScreenLoad
        loading={isDatasetsLoading}
        customHeight={`calc(100vh - ${HEADER_HEIGHT}px - ${DATASET_HEADER_HEIGHT}px)`}
      >
        <>
          {datasets.length === 0 ? (
            <Box p={2}>
              <MqEmpty title={t('datasets_route.empty_title')}>
                <>
                  <MqText subdued>{t('datasets_route.empty_body')}</MqText>
                  <Button
                    color={'primary'}
                    size={'small'}
                    onClick={() => {
                      refetch()
                    }}
                  >
                    Refresh
                  </Button>
                </>
              </MqEmpty>
            </Box>
          ) : (
            <>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell key={t('datasets_route.name_col')} align='left'>
                      <MqText subheading>{t('datasets_route.name_col')}</MqText>
                    </TableCell>
                    <TableCell key={t('datasets_route.namespace_col')} align='left'>
                      <MqText subheading>{t('datasets_route.namespace_col')}</MqText>
                    </TableCell>
                    <TableCell key={t('datasets_route.source_col')} align='left'>
                      <MqText subheading>{t('datasets_route.source_col')}</MqText>
                    </TableCell>
                    <TableCell key={t('datasets_route.updated_col')} align='left'>
                      <MqText subheading>{t('datasets_route.updated_col')}</MqText>
                    </TableCell>
                    <TableCell key={t('datasets_route.quality')} align='left'>
                      <MqText subheading>{t('datasets_route.quality')}</MqText>
                    </TableCell>
                    <TableCell key={t('datasets.column_lineage_tab')} align='left'>
                      <MqText inline subheading>
                        COLUMN LINEAGE
                      </MqText>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {datasets
                    .filter((dataset: Dataset) => !dataset.deleted)
                    .map((dataset: Dataset) => {
                      const assertions = datasetFacetsQualityAssertions(dataset.facets)
                      return (
                        <TableRow key={dataset.name}>
                          <TableCell align='left'>
                            <MqText
                              link
                              linkTo={`/lineage/${encodeNode(
                                'DATASET',
                                dataset.namespace,
                                dataset.name
                              )}`}
                            >
                              {truncateText(dataset.name, 40)}
                            </MqText>
                          </TableCell>
                          <TableCell align='left'>
                            <MqText>{truncateText(dataset.namespace, 40)}</MqText>
                          </TableCell>
                          <TableCell align='left'>
                            <MqText>{dataset.sourceName}</MqText>
                          </TableCell>
                          <TableCell align='left'>
                            <MqText>{formatUpdatedAt(dataset.updatedAt)}</MqText>
                          </TableCell>
                          <TableCell align='left'>
                            {datasetFacetsStatus(dataset.facets) ? (
                              <>
                                <MQTooltip title={<Assertions assertions={assertions} />}>
                                  <Box>
                                    <MqStatus
                                      label={
                                        assertions.find((a) => !a.success) ? 'UNHEALTHY' : 'HEALTHY'
                                      }
                                      color={datasetFacetsStatus(dataset.facets)}
                                    />
                                  </Box>
                                </MQTooltip>
                              </>
                            ) : (
                              <MqStatus label={'N/A'} color={theme.palette.secondary.main} />
                            )}
                          </TableCell>
                          <TableCell>
                            {dataset.columnLineage ? (
                              <MqText
                                link
                                linkTo={`column-level/${encodeURIComponent(
                                  encodeURIComponent(dataset.id.namespace)
                                )}/${encodeURIComponent(dataset.id.name)}`}
                              >
                                VIEW
                              </MqText>
                            ) : (
                              <MqText subdued>N/A</MqText>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                </TableBody>
              </Table>
              <MqPaging
                pageSize={PAGE_SIZE}
                currentPage={state.page}
                totalCount={totalCount}
                incrementPage={() => handleClickPage('next')}
                decrementPage={() => handleClickPage('prev')}
              />
            </>
          )}
        </>
      </MqScreenLoad>
    </Container>
  )
}

export default Datasets
