import { Box } from '@mui/system'
import {
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material'
import { ColumnLineageGraph, Dataset } from '../../types/api'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Fragment, useEffect } from 'react'
import { RootState } from '../../store/store'
import { faDatabase } from '@fortawesome/free-solid-svg-icons'
import { theme } from '../../helpers/theme'
import { useDataset } from '../../queries/datasets'
import { useSearchParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import CloseIcon from '@mui/icons-material/Close'
import IconButton from '@mui/material/IconButton'
import MqJsonView from '../../components/core/json-view/MqJsonView'
import MqText from '../../components/core/text/MqText'

const WIDTH = 600

const ColumnLevelDrawer = () => {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const datasetName = searchParams.get('dataset') || ''
  const namespace = searchParams.get('namespace') || ''

  const { data: dataset, isLoading: isDatasetLoading } = useDataset(namespace, datasetName)
  const columnLineage = useSelector((state: RootState) => state.columnLineage.columnLineage)

  if (!columnLineage) {
    return null
  }

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
                <FontAwesomeIcon
                  aria-hidden={'true'}
                  title={'Dataset'}
                  icon={faDatabase}
                  width={16}
                  height={16}
                  color={theme.palette.common.white}
                />
              </Box>
            </Box>
            <MqText heading>{searchParams.get('dataset')}</MqText>
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
          <Box p={2}>
            <MqText subheading>SCHEMA</MqText>
          </Box>
          {dataset.fields.length > 0 && (
            <>
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
                    <TableCell align='left'></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dataset.fields.map((field) => {
                    return (
                      <Fragment key={field.name}>
                        <TableRow>
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
            </>
          )}
        </>
      )}
      {dataset && dataset.columnLineage && (
        <>
          <Box p={2}>
            <MqText subheading>FACETS</MqText>
            <MqJsonView data={dataset.columnLineage} />
          </Box>
        </>
      )}
    </Box>
  )
}

export default ColumnLevelDrawer
