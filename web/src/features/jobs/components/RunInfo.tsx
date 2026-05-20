import { Box } from '@mui/material'
import { Run } from '@/shared/types/api'
import { useJobFacets } from '@/features/jobs/api'
import MqCode from '@/shared/components/MqCode/MqCode'
import MqJsonView from '@/shared/components/MqJsonView/MqJsonView'
import MqText from '@/shared/components/MqText/MqText'
import React from 'react'

export interface SqlFacet {
  query: string
}

export interface SourceCodeFacet {
  language: string
  sourceCode: string
  _producer: string
  _schemaURL: string
}

type RunInfoProps = {
  run: Run
}

const RunInfo = ({ run }: RunInfoProps) => {
  const { data: jobFacetsData } = useJobFacets(run.id)
  const jobFacets = jobFacetsData as any

  return (
    <Box>
      {<MqCode code={(jobFacets?.sql as SqlFacet)?.query} language={'sql'} />}
      {jobFacets?.sourceCode && (
        <MqCode
          code={(jobFacets.sourceCode as SourceCodeFacet)?.sourceCode}
          language={(jobFacets.sourceCode as SourceCodeFacet)?.language}
        />
      )}
      {jobFacets && (
        <Box mt={2}>
          <Box mb={1}>
            <MqText subheading>JOB FACETS</MqText>
          </Box>
          <MqJsonView data={jobFacets} aria-label={'Job facets'} aria-required='true' />
        </Box>
      )}
      {run.facets && (
        <Box mt={2}>
          <Box mb={1}>
            <MqText subheading>RUN FACETS</MqText>
          </Box>
          <MqJsonView data={run.facets} aria-label={'Run facets'} aria-required='true' />
        </Box>
      )}
    </Box>
  )
}

export default RunInfo
