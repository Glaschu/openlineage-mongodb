// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest'
import { tableLevelNodeRenderer } from '../../../routes/table-level/nodes'
import TableLineageDatasetNode from '../../../routes/table-level/TableLineageDatasetNode'
import TableLineageJobNode from '../../../routes/table-level/TableLineageJobNode'

describe('Table Level Nodes', () => {
  it('should have renderer for DATASET type', () => {
    const datasetRenderer = tableLevelNodeRenderer.get('DATASET')
    expect(datasetRenderer).toBe(TableLineageDatasetNode)
  })

  it('should have renderer for JOB type', () => {
    const jobRenderer = tableLevelNodeRenderer.get('JOB')
    expect(jobRenderer).toBe(TableLineageJobNode)
  })

  it('should have exactly 2 renderers', () => {
    expect(tableLevelNodeRenderer.size).toBe(2)
  })

  it('should return undefined for unknown types', () => {
    const unknownRenderer = tableLevelNodeRenderer.get('UNKNOWN' as any)
    expect(unknownRenderer).toBeUndefined()
  })
})
