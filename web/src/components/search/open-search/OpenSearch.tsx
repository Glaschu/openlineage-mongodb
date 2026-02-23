// Copyright 2018-2024 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { Chip, Divider } from '@mui/material'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Nullable } from '../../../types/util/Nullable'
import { encodeNode, eventTypeColor } from '../../../helpers/nodes'
import { faCog } from '@fortawesome/free-solid-svg-icons/faCog'
import { faDatabase } from '@fortawesome/free-solid-svg-icons'
import { theme } from '../../../helpers/theme'
import { truncateText } from '../../../helpers/text'
import { useNavigate } from 'react-router-dom'
import { useOpenSearchDatasets, useOpenSearchJobs } from '../../../queries/search'
import Box from '@mui/system/Box'
import MQTooltip from '../../core/tooltip/MQTooltip'
import MqEmpty from '../../core/empty/MqEmpty'
import MqStatus from '../../core/status/MqStatus'
import MqText from '../../core/text/MqText'
import React, { useCallback, useEffect } from 'react'
import airflow_logo from './airlfow-logo.svg'
import dbt_logo from './dbt-logo.svg'
import spark_logo from './spark-logo.svg'

interface Props {
  search: string
  onIsLoading?: (isLoading: boolean) => void
}

type TextSegment = {
  text: string
  isHighlighted: boolean
}

const LOGO_MAP = {
  spark: spark_logo,
  airflow: airflow_logo,
  dbt: dbt_logo,
}

function parseStringToSegments(input: string): TextSegment[] {
  return input.split(/(<em>.*?<\/em>)/).map((segment) => {
    if (segment.startsWith('<em>') && segment.endsWith('</em>')) {
      return {
        text: segment.slice(4, -5),
        isHighlighted: true,
      }
    } else {
      return {
        text: segment,
        isHighlighted: false,
      }
    }
  })
}

const useArrowKeys = (callback: (key: 'up' | 'down' | 'enter') => void) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        callback('down')
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        callback('up')
      } else if (event.key === 'Enter') {
        event.preventDefault()
        callback('enter')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [callback])
}

const FIELDS_TO_PRINT = 5
const DEBOUNCE_TIME_MS = 200

const OpenSearch: React.FC<Props> = ({ search, onIsLoading }) => {
  const [debouncedSearch, setDebouncedSearch] = React.useState(search)
  const [selectedIndex, setSelectedIndex] = React.useState<Nullable<number>>(null)
  const navigate = useNavigate()

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search)
    }, DEBOUNCE_TIME_MS)

    return () => {
      clearTimeout(handler)
    }
  }, [search])

  const { data: jobsData, isLoading: isJobsLoading } = useOpenSearchJobs(debouncedSearch)
  const { data: datasetsData, isLoading: isDatasetsLoading } =
    useOpenSearchDatasets(debouncedSearch)

  useEffect(() => {
    if (onIsLoading) {
      onIsLoading(isJobsLoading || isDatasetsLoading)
    }
  }, [isJobsLoading, isDatasetsLoading, onIsLoading])

  const jobsHits = jobsData?.hits || []
  const datasetsHits = datasetsData?.hits || []

  useArrowKeys((key) => {
    if (key === 'up') {
      setSelectedIndex(selectedIndex === null ? null : Math.max(selectedIndex - 1, 0))
    } else if (key === 'down') {
      setSelectedIndex(
        selectedIndex === null
          ? 0
          : Math.min(selectedIndex + 1, jobsHits.length + datasetsHits.length - 1)
      )
    } else if (selectedIndex !== null) {
      if (selectedIndex < jobsHits.length) {
        const jobHit = jobsHits[selectedIndex]
        navigate(`/lineage/${encodeNode('JOB', jobHit.namespace, jobHit.name)}`)
      } else {
        const datasetHit = datasetsHits[selectedIndex - jobsHits.length]
        navigate(`/lineage/${encodeNode('DATASET', datasetHit.namespace, datasetHit.name)}`)
      }
    }
  })

  useEffect(() => {
    setSelectedIndex(null)
  }, [jobsHits, datasetsHits])

  if (jobsHits.length === 0 && datasetsHits.length === 0 && debouncedSearch === search) {
    return (
      <Box my={4}>
        <MqEmpty title={'No Hits'} body={'Keep typing or try a more precise search.'} />
      </Box>
    )
  }

  return (
    <Box>
      {jobsHits.map((hit: any, index: number) => {
        return (
          <Box
            key={`job-${hit.run_id}`}
            onClick={() => navigate(`/lineage/${encodeNode('JOB', hit.namespace, hit.name)}`)}
            px={2}
            py={1}
            borderBottom={1}
            borderColor={'divider'}
            sx={{
              transition: 'background-color 0.3s',
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              },
              backgroundColor: selectedIndex === index ? theme.palette.action.hover : undefined,
            }}
          >
            <Box display={'flex'}>
              <Box display={'flex'}>
                <Box display={'flex'} alignItems={'center'} height={42}>
                  <FontAwesomeIcon icon={faCog} color={theme.palette.primary.main} />
                </Box>
                <Box ml={2} width={280} minWidth={280}>
                  <MQTooltip title={hit.name}>
                    <Box>
                      <MqText font={'mono'}>{truncateText(hit.name, 30)}</MqText>
                    </Box>
                  </MQTooltip>
                  <MQTooltip title={hit.namespace}>
                    <Box>
                      <MqText subdued label>
                        {truncateText(hit.namespace, 30)}
                      </MqText>
                    </Box>
                  </MQTooltip>
                </Box>
              </Box>
              <Divider flexItem sx={{ mx: 1 }} orientation={'vertical'} />
              <Box>
                <MqText subdued label>
                  Last State
                </MqText>
                <MqStatus color={eventTypeColor(hit.eventType)} label={hit.eventType} />
              </Box>
              {hit.runFacets?.processing_engine && (
                <>
                  <Divider flexItem sx={{ mx: 1 }} orientation={'vertical'} />
                  <Box>
                    <MqText subdued label>
                      {'Integration'}
                    </MqText>
                    {(() => {
                      const engineName = hit.runFacets.processing_engine.name.toLowerCase()
                      return LOGO_MAP[engineName as keyof typeof LOGO_MAP] ? (
                        <img
                          src={LOGO_MAP[engineName as keyof typeof LOGO_MAP]}
                          height={24}
                          alt={engineName.charAt(0).toUpperCase() + engineName.slice(1)}
                        />
                      ) : (
                        <Chip size={'small'} label={hit.runFacets?.processing_engine.name} />
                      )
                    })()}
                  </Box>
                </>
              )}

              <Divider flexItem sx={{ mx: 1 }} orientation={'vertical'} />
              <Box>
                <MqText subdued label>
                  Match
                </MqText>
                <Box>
                  {Object.entries(jobsData.highlights[index]).map(([key, value]) => {
                    return (value as any[]).map((highlightedString: any, idx: number) => {
                      return (
                        <Box
                          key={`${key}-${value}-${idx}`}
                          display={'flex'}
                          alignItems={'center'}
                          mb={0.5}
                        >
                          {/*<Chip label={key} variant={'outlined'} size={'small'} sx={{ mr: 1 }} />*/}
                          <MqText inline bold sx={{ mr: 1 }}>
                            {`${key}: `}
                          </MqText>
                          <Box>
                            {parseStringToSegments(highlightedString || '').map(
                              (segment, index) => (
                                <MqText
                                  subdued
                                  small
                                  key={`${key}-${highlightedString}-${segment.text}-${index}`}
                                  inline
                                  highlight={segment.isHighlighted}
                                >
                                  {segment.text}
                                </MqText>
                              )
                            )}
                          </Box>
                        </Box>
                      )
                    })
                  })}
                </Box>
              </Box>
              {hit.facets?.sourceCode?.language && (
                <>
                  <Divider flexItem sx={{ mx: 1 }} orientation={'vertical'} />
                  <Box>
                    <MqText subdued label>
                      {'Language'}
                    </MqText>
                    <Chip
                      size={'small'}
                      variant={'outlined'}
                      label={hit.facets?.sourceCode.language}
                    />
                  </Box>
                </>
              )}
            </Box>
          </Box>
        )
      })}
      {datasetsHits.map((hit: any, index: number) => {
        return (
          <Box
            key={`dataset-${index}-${hit.run_id}`}
            onClick={() => navigate(`/lineage/${encodeNode('DATASET', hit.namespace, hit.name)}`)}
            px={2}
            py={1}
            borderBottom={1}
            borderColor={'divider'}
            sx={{
              transition: 'background-color 0.3s',
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              },
              backgroundColor:
                selectedIndex === index + jobsHits.length ? theme.palette.action.hover : undefined,
            }}
          >
            <Box display={'flex'}>
              <Box display={'flex'}>
                <Box display={'flex'} alignItems={'center'} height={42}>
                  <FontAwesomeIcon icon={faDatabase} color={theme.palette.info.main} />
                </Box>
                <Box ml={2} width={280} minWidth={280}>
                  <MQTooltip title={hit.name}>
                    <Box>
                      <MqText font={'mono'}>{truncateText(hit.name, 30)}</MqText>
                    </Box>
                  </MQTooltip>
                  <MQTooltip title={hit.namespace}>
                    <Box>
                      <MqText subdued label>
                        {truncateText(hit.namespace, 30)}
                      </MqText>
                    </Box>
                  </MQTooltip>
                </Box>
              </Box>
              <Divider orientation={'vertical'} sx={{ mx: 1 }} flexItem />
              <Box>
                <MqText subdued label>
                  Match
                </MqText>
                <Box>
                  {Object.entries(datasetsData.highlights[index]).map(([key, value]) => {
                    return (value as any[]).map((highlightedString: any, idx: number) => {
                      return (
                        <Box
                          key={`${key}-${value}-${idx}`}
                          display={'flex'}
                          alignItems={'center'}
                          mb={0.5}
                          mr={0.5}
                        >
                          <Chip label={key} variant={'outlined'} size={'small'} sx={{ mr: 1 }} />
                          {parseStringToSegments(highlightedString || '').map((segment, index) => (
                            <MqText
                              subdued
                              small
                              key={`${key}-${highlightedString}-${segment.text}-${index}`}
                              inline
                              highlight={segment.isHighlighted}
                            >
                              {segment.text}
                            </MqText>
                          ))}
                        </Box>
                      )
                    })
                  })}
                </Box>
              </Box>
              {hit.facets?.schema?.fields && (
                <>
                  <Divider orientation={'vertical'} flexItem sx={{ mx: 1 }} />
                  <Box display={'flex'} flexDirection={'column'} justifyContent={'flex-start'}>
                    <MqText subdued label>
                      Fields
                    </MqText>
                    <Box>
                      {hit.facets?.schema?.fields.slice(0, FIELDS_TO_PRINT).map((field) => {
                        return (
                          <Chip
                            key={field.name}
                            label={field.name}
                            variant={'outlined'}
                            color={
                              field.name.toLowerCase().includes(search.toLowerCase())
                                ? 'primary'
                                : 'default'
                            }
                            size={'small'}
                            sx={{ mr: 1 }}
                          />
                        )
                      })}
                      {hit.facets?.schema && hit.facets.schema.fields.length > FIELDS_TO_PRINT && (
                        <MqText inline subdued>{`+ ${
                          hit.facets.schema.fields.length - FIELDS_TO_PRINT
                        }`}</MqText>
                      )}
                    </Box>
                  </Box>
                </>
              )}
            </Box>
          </Box>
        )
      })}
    </Box>
  )
}

export default OpenSearch
