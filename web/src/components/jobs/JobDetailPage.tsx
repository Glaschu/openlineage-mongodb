// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { useDeleteJob, useJob } from '../../queries/jobs'
import { useTranslation } from 'react-i18next'
import React, { ChangeEvent, useEffect } from 'react'

import '../../i18n/config'
import { Box, Button, CircularProgress, Divider, Grid, Tab, Tabs } from '@mui/material'
import { CalendarIcon } from '@mui/x-date-pickers'
import {
  DirectionsRun,
  EscalatorWarning,
  Speed,
  SportsScore,
  Start,
  Title,
} from '@mui/icons-material'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { LineageJob } from '../../types/lineage'
import { MqInfo } from '../core/info/MqInfo'
import { RootState } from '../../store/store'
import { Run } from '../../types/api'
import { alpha, createTheme } from '@mui/material/styles'
import { dialogToggle } from '../../store/slices/displaySlice'
import { faCog } from '@fortawesome/free-solid-svg-icons/faCog'
import { formatUpdatedAt } from '../../helpers'
import { runStateColor } from '../../helpers/nodes'
import { setTabIndex } from '../../store/slices/lineageSlice'
import { stopWatchDuration } from '../../helpers/time'
import { truncateText } from '../../helpers/text'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTheme } from '@emotion/react'
import CloseIcon from '@mui/icons-material/Close'
import Dialog from '../Dialog'
import IconButton from '@mui/material/IconButton'
import JobTags from './JobTags'
import MQTooltip from '../core/tooltip/MQTooltip'
import MqEmpty from '../core/empty/MqEmpty'
import MqStatus from '../core/status/MqStatus'
import MqText from '../core/text/MqText'
import RunInfo from './RunInfo'
import Runs from './Runs'

interface JobDetailPageProps {
  lineageJob: LineageJob
}

const JobDetailPage: React.FC<JobDetailPageProps> = ({ lineageJob }) => {
  const dispatch = useDispatch()
  const deleteJobMutation = useDeleteJob()
  const { data: job, isLoading: isJobLoading } = useJob(lineageJob.namespace, lineageJob.name)
  const dialogIsOpen = useSelector((state: RootState) => state.display.dialogIsOpen)
  const tabIndex = useSelector((state: RootState) => state.lineage.tabIndex)
  const theme = createTheme(useTheme())
  const navigate = useNavigate()
  const [, setSearchParams] = useSearchParams()

  const handleChange = (_: ChangeEvent, newValue: number) => {
    dispatch(setTabIndex(newValue))
  }

  const { t } = useTranslation()

  // unmounting
  useEffect(() => {
    return () => {
      dispatch(setTabIndex(0))
    }
  }, [dispatch])

  if (isJobLoading || !job) {
    return (
      <Box display={'flex'} justifyContent={'center'} mt={2}>
        <CircularProgress color='primary' />
      </Box>
    )
  }

  const lastFinished = (() => {
    const last = job.latestRuns?.find((run: Run) => run.state !== 'RUNNING')
    return last ? formatUpdatedAt(last.endedAt) : 'N/A'
  })()

  const lastRuntime = (() => {
    const last = job.latestRuns?.find((run: Run) => run.state !== 'RUNNING')
    return last ? stopWatchDuration(last.durationMs) : 'N/A'
  })()

  return (
    <Box px={2} display='flex' flexDirection='column' justifyContent='space-between'>
      <Box
        position={'sticky'}
        top={0}
        bgcolor={theme.palette.background.default}
        py={2}
        zIndex={theme.zIndex.appBar}
        sx={{ borderBottom: 1, borderColor: 'divider', width: '100%' }}
        mb={2}
      >
        <Box display={'flex'} alignItems={'center'} justifyContent={'space-between'}>
          <Box>
            <Box display={'flex'} alignItems={'center'}>
              <Box
                mr={2}
                borderRadius={theme.spacing(1)}
                p={1}
                width={32}
                height={32}
                display={'flex'}
                bgcolor={theme.palette.primary.main}
              >
                <FontAwesomeIcon
                  aria-hidden={'true'}
                  title={'Job'}
                  icon={faCog}
                  width={16}
                  height={16}
                  color={theme.palette.common.white}
                />
              </Box>
              <MqText font={'mono'} heading>
                {truncateText(job.name, 40)}
              </MqText>
            </Box>
            {job.description && (
              <Box mt={1}>
                <MqText subdued>{job.description}</MqText>
              </Box>
            )}
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
                {t('jobs.dialog_delete')}
              </Button>
              <Dialog
                dialogIsOpen={dialogIsOpen}
                dialogToggle={(field) => dispatch(dialogToggle(field))}
                title={t('jobs.dialog_confirmation_title')}
                ignoreWarning={() => {
                  deleteJobMutation.mutate({ jobName: job.name, namespace: job.namespace }, {
                    onSuccess: () => {
                      navigate('/')
                      dispatch(dialogToggle(''))
                    }
                  })
                }}
              />
            </Box>
            <Box mr={1}>
              <Button
                size={'small'}
                variant='outlined'
                color='primary'
                target={'_blank'}
                href={job.location}
                disabled={!job.location}
              >
                {t('jobs.location')}
              </Button>
            </Box>
            <IconButton onClick={() => setSearchParams({})} size='small'>
              <CloseIcon fontSize={'small'} />
            </IconButton>
          </Box>
        </Box>
      </Box>
      <Grid container spacing={2}>
        <Grid item xs={3}>
          <MqInfo
            icon={<CalendarIcon color={'disabled'} />}
            label={'Created at'.toUpperCase()}
            value={formatUpdatedAt(job.createdAt)}
          />
        </Grid>
        <Grid item xs={3}>
          <MqInfo
            icon={<CalendarIcon color={'disabled'} />}
            label={'Updated at'.toUpperCase()}
            value={formatUpdatedAt(job.updatedAt)}
          />
        </Grid>
        <Grid item xs={3}>
          <MqInfo
            icon={<Speed color={'disabled'} />}
            label={'Last Runtime'.toUpperCase()}
            value={lastRuntime}
          />
        </Grid>
        <Grid item xs={3}>
          <MqInfo
            icon={<Title color={'disabled'} />}
            label={'Type'.toUpperCase()}
            value={job.type ? job.type : 'N/A'}
          />
        </Grid>
        <Grid item xs={3}>
          <MqInfo
            icon={<Start color={'disabled'} />}
            label={'Last Started'.toUpperCase()}
            value={job.latestRun ? formatUpdatedAt(job.latestRun.startedAt) : 'N/A'}
          />
        </Grid>
        <Grid item xs={3}>
          <MqInfo
            icon={<SportsScore color={'disabled'} />}
            label={'Last Finished'.toUpperCase()}
            value={lastFinished}
          />
        </Grid>
        <Grid item xs={3}>
          <MqInfo
            icon={<DirectionsRun color={'disabled'} />}
            label={'Running Status'.toUpperCase()}
            value={
              <MqStatus
                label={job.latestRun?.state || 'N/A'}
                color={
                  job.latestRun?.state
                    ? runStateColor(job.latestRun.state)
                    : theme.palette.secondary.main
                }
              />
            }
          />
        </Grid>
        <Grid item xs={3}>
          <MqInfo
            icon={<EscalatorWarning color={'disabled'} />}
            label={'Parent Job'.toUpperCase()}
            value={
              job.parentJobName ? (
                <MQTooltip title={job.parentJobName}>
                  <>{truncateText(job.parentJobName, 16)}</>
                </MQTooltip>
              ) : (
                'N/A'
              )
            }
          />
        </Grid>
      </Grid>
      <Divider sx={{ my: 1 }} />
      <JobTags jobTags={job.tags} jobName={job.name} namespace={job.namespace} />
      <Box
        mb={2}
        display={'flex'}
        justifyContent={'space-between'}
        alignItems={'center'}
        sx={{ borderBottom: 1, borderColor: 'divider', width: '100%' }}
      >
        <Tabs value={tabIndex} onChange={handleChange} textColor='primary' indicatorColor='primary'>
          <Tab label={t('jobs.latest_tab')} disableRipple={true} />
          <Tab label={t('jobs.history_tab')} disableRipple={true} />
        </Tabs>
      </Box>
      {tabIndex === 0 ? (
        job.latestRun ? (
          <RunInfo run={job.latestRun} />
        ) : (
          !job.latestRun && <MqEmpty title={t('jobs.empty_title')} body={t('jobs.empty_body')} />
        )
      ) : null}
      {tabIndex === 1 && <Runs jobName={job.name} jobNamespace={job.namespace} />}
    </Box>
  )
}

export default JobDetailPage
