// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'
import {
  datasetFacetsQualityAssertions,
  datasetFacetsStatus,
  encodeNode,
  eventTypeColor,
  generateNodeId,
  isDataset,
  isJob,
  isLineageDataset,
  isLineageJob,
  jobRunsStatus,
  parseSearchGroup,
  runStateColor,
} from '../../helpers/nodes'
import { theme } from '../../helpers/theme'
import type { DataQualityFacets, Run, RunState } from '../../types/api'
import type { LineageDataset, LineageJob, MqNode } from '../../types/lineage'

const createRun = (state: RunState): Run => ({
  id: state,
  createdAt: '',
  updatedAt: '',
  nominalStartTime: '',
  nominalEndTime: '',
  state,
  jobVersion: {
    name: 'job',
    namespace: 'ns',
    version: 'v1',
  },
  startedAt: '',
  endedAt: '',
  durationMs: 0,
  args: {},
  facets: {},
})

describe('helpers/nodes type guards', () => {
  it('identifies job nodes and excludes datasets', () => {
    const jobNode = { data: { type: 'BATCH', name: 'job' } } as unknown as MqNode
    const datasetNode = { data: { type: 'DB_TABLE', name: 'dataset' } } as unknown as MqNode

    expect(isJob(jobNode)?.name).toBe('job')
    expect(isJob(datasetNode)).toBeUndefined()

    expect(isDataset(datasetNode)?.name).toBe('dataset')
    expect(isDataset(jobNode)).toBeUndefined()
  })

  it('identifies lineage job and dataset payloads', () => {
  const lineageJob = { type: 'BATCH', name: 'job' } as unknown as LineageJob
  const lineageDataset = { type: 'DB_TABLE', name: 'dataset' } as unknown as LineageDataset

    expect(isLineageJob(lineageJob)?.name).toBe('job')
    expect(isLineageJob(lineageDataset)).toBeUndefined()

    expect(isLineageDataset(lineageDataset)?.name).toBe('dataset')
    expect(isLineageDataset(lineageJob)).toBeUndefined()
  })
})

describe('helpers/nodes encoding utilities', () => {
  it('encodes nodes for routing', () => {
    expect(encodeNode('JOB', 'analytics/ns', 'job name')).toBe(
      'job/analytics%2Fns/job%20name'
    )
  })

  it('generates stable node identifiers', () => {
    expect(generateNodeId('DATASET', 'analytics', 'orders')).toBe('dataset:analytics:orders')
  })

  it('parses namespace and group segments from encoded ids', () => {
    const id = 'dataset%2Fns:prod%20team:rest'
    expect(parseSearchGroup(id, 'namespace')).toBe('dataset/ns')
    expect(parseSearchGroup(id, 'group')).toBe('prod team')
  })
})

describe('helpers/nodes color helpers', () => {
  it('returns palette colors for event types', () => {
    expect(eventTypeColor('START')).toBe(theme.palette.info.main)
    expect(eventTypeColor('RUNNING')).toBe(theme.palette.info.main)
    expect(eventTypeColor('COMPLETE')).toBe(theme.palette.primary.main)
    expect(eventTypeColor('FAIL')).toBe(theme.palette.error.main)
    expect(eventTypeColor('ABORT')).toBe(theme.palette.warning.main)
    expect(eventTypeColor('START' as any)).toBe(theme.palette.info.main)
    expect(eventTypeColor('UNKNOWN' as any)).toBe(theme.palette.secondary.main)
  })

  it('returns palette colors for run states', () => {
    expect(runStateColor('NEW')).toBe(theme.palette.secondary.main)
    expect(runStateColor('RUNNING')).toBe(theme.palette.info.main)
    expect(runStateColor('COMPLETED')).toBe(theme.palette.primary.main)
    expect(runStateColor('FAILED')).toBe(theme.palette.error.main)
    expect(runStateColor('ABORTED')).toBe(theme.palette.warning.main)
    expect(runStateColor('UNKNOWN' as any)).toBe(theme.palette.secondary.main)
  })
})

describe('helpers/nodes run summaries', () => {
  it('returns error color when every run fails', () => {
    const runs = Array.from({ length: 5 }, () => createRun('FAILED'))
    expect(jobRunsStatus(runs)).toBe(theme.palette.error.main)
  })

  it('returns info color when some runs fail', () => {
    const runs = [createRun('COMPLETED'), createRun('FAILED'), createRun('COMPLETED')]
    expect(jobRunsStatus(runs)).toBe(theme.palette.info.main)
  })

  it('returns primary color when runs succeed, slicing to the latest entries', () => {
    const runs = Array.from({ length: 20 }, (_, index) =>
      createRun(index < 14 ? 'COMPLETED' : 'RUNNING')
    )
    expect(jobRunsStatus(runs)).toBe(theme.palette.primary.main)
  })
})

describe('helpers/nodes dataset facets', () => {
  it('returns assertions or empty array when missing', () => {
    const assertions = [{ assertion: 'a', column: 'c', success: true }]
    const facets: DataQualityFacets = {
      dataQualityAssertions: {
        assertions,
      },
    }

    expect(datasetFacetsQualityAssertions(facets)).toEqual(assertions)
    expect(datasetFacetsQualityAssertions({} as DataQualityFacets)).toEqual([])
  })

  it('returns null status when assertions are absent', () => {
    expect(datasetFacetsStatus({} as DataQualityFacets)).toBeNull()
    expect(datasetFacetsStatus({ dataQualityAssertions: { assertions: [] } })).toBeNull()
  })

  it('derives status colors from assertion success', () => {
    const failing: DataQualityFacets = {
      dataQualityAssertions: {
        assertions: [
          { assertion: 'a', column: 'c', success: false },
          { assertion: 'b', column: 'd', success: false },
        ],
      },
    }

    const mixed: DataQualityFacets = {
      dataQualityAssertions: {
        assertions: [
          { assertion: 'a', column: 'c', success: true },
          { assertion: 'b', column: 'd', success: false },
        ],
      },
    }

    const passing: DataQualityFacets = {
      dataQualityAssertions: {
        assertions: [
          { assertion: 'a', column: 'c', success: true },
          { assertion: 'b', column: 'd', success: true },
        ],
      },
    }

    expect(datasetFacetsStatus(failing)).toBe(theme.palette.error.main)
    expect(datasetFacetsStatus(mixed)).toBe(theme.palette.error.main)
    expect(datasetFacetsStatus(passing)).toBe(theme.palette.primary.main)
  })
})
