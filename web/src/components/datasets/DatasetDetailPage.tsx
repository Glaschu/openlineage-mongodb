// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import {
  Box,
  Button,
  Divider,
  FormControlLabel,
  Grid,
  Switch,
  Tab,
  Tabs,
  createTheme,
} from '@mui/material'
import { CalendarIcon } from '@mui/x-date-pickers'
import { CircularProgress } from '@mui/material'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { LineageDataset } from '../../types/lineage'
import { MqInfo } from '../core/info/MqInfo'
import { RootState } from '../../store/store'
import { alpha } from '@mui/material/styles'
import { datasetFacetsQualityAssertions, datasetFacetsStatus } from '../../helpers/nodes'
import { dialogToggle } from '../../store/slices/displaySlice'
import { faDatabase } from '@fortawesome/free-solid-svg-icons'
import { formatUpdatedAt } from '../../helpers'
import { setTabIndex } from '../../store/slices/lineageSlice'
import { truncateText } from '../../helpers/text'
import { useDataset, useDeleteDataset } from '../../queries/datasets'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTheme } from '@emotion/react'
import { useTranslation } from 'react-i18next'
import Assertions from './Assertions'
import CloseIcon from '@mui/icons-material/Close'
import DatasetInfo from './DatasetInfo'
import DatasetTags from './DatasetTags'
import DatasetVersions from './DatasetVersions'
import Dialog from '../Dialog'
import IconButton from '@mui/material/IconButton'
import ListIcon from '@mui/icons-material/List'
import MQTooltip from '../core/tooltip/MQTooltip'
import MqStatus from '../core/status/MqStatus'
import MqText from '../core/text/MqText'
import React, { ChangeEvent, useEffect, useState } from 'react'
import RuleIcon from '@mui/icons-material/Rule'
import StorageIcon from '@mui/icons-material/Storage'

interface DatasetDetailPageProps {
  lineageDataset: LineageDataset
}

function a11yProps(index: number) {
  return {
    id: `tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  }
}

const DatasetDetailPage: React.FC<DatasetDetailPageProps> = ({ lineageDataset }) => {
  const dispatch = useDispatch()
  const deleteDatasetMutation = useDeleteDataset()
  const { data: dataset, isLoading: isDatasetLoading } = useDataset(
    lineageDataset.namespace,
    lineageDataset.name
  )
  const dialogIsOpen = useSelector((state: RootState) => state.display.dialogIsOpen)
  const tabIndex = useSelector((state: RootState) => state.lineage.tabIndex)
  const navigate = useNavigate()
  const { t } = useTranslation()
  const theme = createTheme(useTheme())
  const [, setSearchParams] = useSearchParams()
  const [showTags, setShowTags] = useState(false)

  // unmounting
  useEffect(
    () => () => {
      dispatch(setTabIndex(0))
    },
    [dispatch]
  )

  const handleChange = (_: ChangeEvent, newValue: number) => {
    dispatch(setTabIndex(newValue))
  }

  if (isDatasetLoading || !dataset) {
    return (
      <Box display={'flex'} justifyContent={'center'} mt={2}>
        <CircularProgress color='primary' />
      </Box>
    )
  }

  const { name, tags, description } = dataset
  const facetsStatus = datasetFacetsStatus(dataset.facets)
  const assertions = datasetFacetsQualityAssertions(dataset.facets)

  return (
    <Box px={2}>
      <Box
        position={'sticky'}
        top={0}
        bgcolor={theme.palette.background.default}
        pt={2}
        zIndex={theme.zIndex.appBar}
        sx={{ borderBottom: 1, borderColor: 'divider', width: '100%' }}
        mb={2}
      >
        <Box display={'flex'} alignItems={'center'} justifyContent={'space-between'} pb={2}>
          <Box display={'flex'} alignItems={'center'}>
            <Box>
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
                <MqText font={'mono'} heading>
                  {truncateText(name, 40)}
                </MqText>
              </Box>
              <MqText subdued>{description}</MqText>
            </Box>
          </Box>
          <Box display={'flex'} alignItems={'center'}>
            <Box mr={1}>
              <Button
                variant='outlined'
                size={'small'}
                sx={{
                  borderColor: theme.palette.error.main,
                  color: theme.palette.error.main,
                  '&:hover': {
                    borderColor: alpha(theme.palette.error.main, 0.3),
                    backgroundColor: alpha(theme.palette.error.main, 0.3),
                  },
                }}
                onClick={() => {
                  dispatch(dialogToggle(''))
                }}
              >
                {t('datasets.dialog_delete')}
              </Button>
              <Dialog
                dialogIsOpen={dialogIsOpen}
                dialogToggle={(field) => dispatch(dialogToggle(field))}
                title={t('jobs.dialog_confirmation_title')}
                ignoreWarning={() => {
                  deleteDatasetMutation.mutate({
                    namespace: lineageDataset.namespace,
                    datasetName: lineageDataset.name,
                  }, {
                    onSuccess: () => {
                      navigate('/datasets')
                      dispatch(dialogToggle(''))
                    }
                  })
                }}
              />
            </Box>
            <IconButton onClick={() => setSearchParams({})}>
              <CloseIcon fontSize={'small'} />
            </IconButton>
          </Box>
        </Box>
      </Box>
      <Grid container spacing={2}>
        <Grid item xs={6}>
          <MqInfo
            icon={<CalendarIcon color={'disabled'} />}
            label={'Updated at'.toUpperCase()}
            value={formatUpdatedAt(dataset.createdAt)}
          />
        </Grid>
        <Grid item xs={6}>
          <MqInfo
            icon={<StorageIcon color={'disabled'} />}
            label={'Dataset Type'.toUpperCase()}
            value={<MqText font={'mono'}>{dataset.type}</MqText>}
          />
        </Grid>
        <Grid item xs={6}>
          <MqInfo
            icon={<ListIcon color={'disabled'} />}
            label={'Fields'.toUpperCase()}
            value={`${dataset.fields.length} columns`}
          />
        </Grid>
        <Grid item xs={6}>
          <MqInfo
            icon={<RuleIcon color={'disabled'} />}
            label={'Quality'.toUpperCase()}
            value={
              facetsStatus ? (
                <Box display={'flex'}>
                  <MQTooltip
                    title={
                      <Assertions
                        assertions={assertions.filter((assertion) => assertion.success)}
                      />
                    }
                  >
                    <Box>
                      <MqStatus
                        label={`${assertions.filter((assertion) => assertion.success).length
                          } Passing`.toUpperCase()}
                        color={theme.palette.primary.main}
                      />
                    </Box>
                  </MQTooltip>
                  <Divider sx={{ mx: 1 }} orientation={'vertical'} />
                  <MQTooltip
                    title={
                      <Assertions
                        assertions={assertions.filter((assertion) => !assertion.success)}
                      />
                    }
                  >
                    <Box>
                      <MqStatus
                        label={`${assertions.filter((assertion) => !assertion.success).length
                          } Failing`.toUpperCase()}
                        color={theme.palette.error.main}
                      />
                    </Box>
                  </MQTooltip>
                </Box>
              ) : (
                <MqStatus label={'N/A'} color={theme.palette.secondary.main} />
              )
            }
          />
        </Grid>
      </Grid>
      <Divider sx={{ my: 2 }} />
      <Box display={'flex'} justifyContent={'space-between'} alignItems={'center'}>
        <DatasetTags
          datasetTags={tags}
          datasetName={lineageDataset.name}
          namespace={lineageDataset.namespace}
        />
      </Box>
      <Box display={'flex'} justifyContent={'space-between'} mb={2}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', width: '100%' }}>
          <Tabs
            value={tabIndex}
            onChange={handleChange}
            textColor='primary'
            indicatorColor='primary'
          >
            <Tab label={t('datasets.latest_tab')} {...a11yProps(0)} disableRipple={true} />
            <Tab label={t('datasets.history_tab')} {...a11yProps(2)} disableRipple={true} />
          </Tabs>
        </Box>
        {tabIndex === 0 && (
          <Box display={'flex'} alignItems={'center'}>
            <FormControlLabel
              sx={{
                textWrap: 'nowrap',
                '& .MuiFormControlLabel-label': { fontSize: '0.875rem' },
              }}
              control={
                <Switch
                  size={'small'}
                  checked={showTags}
                  onChange={() => setShowTags(!showTags)}
                  inputProps={{ 'aria-label': 'toggle show tags' }}
                  disabled={isDatasetLoading}
                />
              }
              label={t('datasets.show_field_tags')}
            />
          </Box>
        )}
      </Box>
      {tabIndex === 0 && (
        <DatasetInfo
          dataset={dataset}
          datasetFields={dataset.fields}
          facets={dataset.facets}
          showTags={showTags}
          isCurrentVersion
        />
      )}
      {tabIndex === 1 && <DatasetVersions dataset={dataset} />}
    </Box>
  )
}
export default DatasetDetailPage
