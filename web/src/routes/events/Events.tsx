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
import { Event } from '../../types/api'
import { HEADER_HEIGHT } from '../../helpers/theme'

import { MqScreenLoad } from '../../components/core/screen-load/MqScreenLoad'
import { eventTypeColor } from '../../helpers/nodes'
import Refresh from '@mui/icons-material/Refresh'

import { fileSize, formatUpdatedAt } from '../../helpers'
import { formatDateAPIQuery, formatDatePicker } from '../../helpers/time'
import { saveAs } from 'file-saver'
import { truncateText } from '../../helpers/text'
import { useEvents } from '../../queries/events'
import { useSearchParams } from 'react-router-dom'
import { useTheme } from '@emotion/react'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress/CircularProgress'
import IconButton from '@mui/material/IconButton'
import MQTooltip from '../../components/core/tooltip/MQTooltip'
import MqCopy from '../../components/core/copy/MqCopy'
import MqDatePicker from '../../components/core/date-picker/MqDatePicker'
import MqEmpty from '../../components/core/empty/MqEmpty'
import MqJsonView from '../../components/core/json-view/MqJsonView'
import MqPaging from '../../components/paging/MqPaging'
import MqStatus from '../../components/core/status/MqStatus'
import MqText from '../../components/core/text/MqText'
import React, { useEffect, useRef } from 'react'
import dayjs from '../../helpers/dayjs'
interface EventsState {
  events: Event[]
  rowExpanded: number | null
  dateFrom: string
  dateTo: string
  page: number
}

const EVENTS_COLUMNS = ['ID', 'STATE', 'NAME', 'NAMESPACE', 'TIME']

const PAGE_SIZE = 50
const EVENTS_HEADER_HEIGHT = 64

const Events = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [state, setState] = React.useState<EventsState>({
    page: 0,
    events: [],
    rowExpanded: null,
    dateFrom: searchParams.get('dateFrom') || formatDateAPIQuery(dayjs().startOf('day').toString()),
    dateTo: searchParams.get('dateTo') || formatDateAPIQuery(dayjs().endOf('day').toString()),
  })

  // Hook calls must be after state init
  const {
    data: eventsData,
    isLoading: isEventsLoading,
    refetch,
  } = useEvents(state.dateFrom, state.dateTo, PAGE_SIZE, state.page * PAGE_SIZE)

  const events: Event[] = eventsData?.events || []
  const totalCount = eventsData?.totalCount || 0
  const isEventsInit = true

  useEffect(() => {
    if (!searchParams.get('dateFrom') && !searchParams.get('dateTo')) {
      setSearchParams({
        dateFrom: formatDateAPIQuery(dayjs().startOf('day').toString()),
        dateTo: formatDateAPIQuery(dayjs().endOf('day').toString()),
      })
    }
  }, [])

  const handleChangeDatepicker = (e: any, direction: 'from' | 'to') => {
    const isDirectionFrom = direction === 'from'
    const keyDate = isDirectionFrom ? 'dateFrom' : 'dateTo'

    const params: { [key: string]: string } = {}
    searchParams.forEach((value, key) => (params[key] = value))
    setSearchParams({ ...params, [keyDate]: formatDateAPIQuery(e.toDate()) })
    setState((prev) => ({
      ...prev,
      [keyDate]: formatDateAPIQuery(e.toDate()),
      page: 0,
      rowExpanded: null,
    }))
  }

  const handleClickPage = (direction: 'prev' | 'next') => {
    const directionPage = direction === 'next' ? state.page + 1 : state.page - 1

    // reset page scroll
    window.scrollTo(0, 0)
    setState((prev) => ({ ...prev, page: directionPage, rowExpanded: null }))
  }

  const handleDownloadPayload = (data: Event) => {
    const title = `${data.job.name}-${data.eventType}-${data.run.runId}`
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
    saveAs(blob, `${title}.json`)
  }

  const refresh = () => {
    refetch()
  }

  const { t } = useTranslation()
  const theme = createTheme(useTheme())

  return (
    <Container maxWidth={'lg'} disableGutters>
      <MqScreenLoad
        loading={!isEventsInit}
        customHeight={`calc(100vh - ${HEADER_HEIGHT}px - ${EVENTS_HEADER_HEIGHT}px)`}
      >
        <>
          <Box p={2} display={'flex'} justifyContent={'space-between'}>
            <Box>
              <Box display={'flex'} alignItems={'center'}>
                <MqText heading>{t('events_route.title')}</MqText>
                {!isEventsLoading && (
                  <Chip
                    size={'small'}
                    variant={'outlined'}
                    color={'primary'}
                    sx={{ marginLeft: 1 }}
                    label={totalCount + ' total'}
                  ></Chip>
                )}
              </Box>
            </Box>
            <MQTooltip title={'Refresh'}>
              <IconButton
                color={'primary'}
                size={'small'}
                onClick={() => {
                  refresh()
                }}
              >
                <Refresh fontSize={'small'} />
              </IconButton>
            </MQTooltip>
          </Box>
          <Box
            p={2}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: theme.spacing(3),
            }}
          >
            <Box display={'flex'}>
              <MqDatePicker
                label={t('events_route.from_date')}
                value={formatDatePicker(state.dateFrom)}
                onChange={(e: any) => handleChangeDatepicker(e, 'from')}
              />
              <Box sx={{ marginLeft: theme.spacing(2) }} />
              <MqDatePicker
                label={t('events_route.to_date')}
                value={formatDatePicker(state.dateTo)}
                onChange={(e: any) => handleChangeDatepicker(e, 'to')}
              />
            </Box>
            {isEventsLoading && <CircularProgress size={16} />}
          </Box>
          {events.length === 0 ? (
            <Box p={2}>
              <MqEmpty title={t('events_route.empty_title')}>
                <>
                  <MqText subdued>{t('events_route.empty_body')}</MqText>
                  <Button
                    color={'primary'}
                    size={'small'}
                    onClick={() => {
                      refresh()
                    }}
                  >
                    Refresh
                  </Button>
                </>
              </MqEmpty>
            </Box>
          ) : (
            <>
              <Table
                sx={{
                  marginBottom: theme.spacing(2),
                }}
                size='small'
              >
                <TableHead>
                  <TableRow>
                    <TableCell align='left'>
                      <MqText subheading>{t('events_columns.id')}</MqText>
                    </TableCell>
                    <TableCell align='left'>
                      <MqText subheading>{t('events_columns.state')}</MqText>
                    </TableCell>
                    <TableCell align='left'>
                      <MqText subheading>{t('events_columns.name')}</MqText>
                    </TableCell>
                    <TableCell align='left'>
                      <MqText subheading>{t('events_columns.namespace')}</MqText>
                    </TableCell>
                    <TableCell align='left'>
                      <MqText subheading>{t('events_columns.time')}</MqText>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {events.map((event, key: number) => {
                    return (
                      <React.Fragment key={key}>
                        <TableRow
                          sx={{
                            cursor: 'pointer',
                            '&:hover': {
                              backgroundColor: theme.palette.action.hover,
                            },
                          }}
                          onClick={() => {
                            setState((prev) => ({
                              ...prev,
                              rowExpanded: key === prev.rowExpanded ? null : key,
                            }))
                          }}
                        >
                          <TableCell align='left'>
                            <Box display={'flex'} alignItems={'center'}>
                              <MqText font={'mono'}>{event.run.runId}</MqText>
                              <MqCopy string={event.run.runId} />
                            </Box>
                          </TableCell>
                          <TableCell align='left'>
                            <MqStatus
                              color={eventTypeColor(event.eventType)}
                              label={event.eventType}
                            />
                          </TableCell>
                          <TableCell align='left'>
                            <MQTooltip title={event.job.name}>
                              <Box display={'inline'}>{truncateText(event.job.name, 40)}</Box>
                            </MQTooltip>
                          </TableCell>
                          <TableCell align='left'>
                            <MQTooltip title={event.job.namespace}>
                              <Box display={'inline'}>{truncateText(event.job.namespace, 40)}</Box>
                            </MQTooltip>
                          </TableCell>
                          <TableCell align='left'>
                            <MqText>{formatUpdatedAt(event.eventTime)}</MqText>
                          </TableCell>
                        </TableRow>
                        {state.rowExpanded === key && (
                          <TableRow>
                            <TableCell colSpan={EVENTS_COLUMNS.length}>
                              {fileSize(JSON.stringify(event)).kiloBytes > 500 ? (
                                <Box p={2}>
                                  <MqEmpty title={'Payload is too big for render'}>
                                    <div>
                                      <MqText subdued>
                                        Please click on button and download payload as file
                                      </MqText>
                                      <br />
                                      <Button
                                        variant='outlined'
                                        color='primary'
                                        onClick={() => handleDownloadPayload(event)}
                                      >
                                        Download payload
                                      </Button>
                                    </div>
                                  </MqEmpty>
                                </Box>
                              ) : (
                                <MqJsonView data={event} />
                              )}
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
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

export default Events
