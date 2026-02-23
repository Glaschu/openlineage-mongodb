// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { ColumnLineageDatasetNode } from '../../../routes/column-level/ColumnLineageDatasetNode'
import ColumnLineageColumnNode from '../../../routes/column-level/ColumnLineageColumnNode'
import { columnLevelNodeRenderer } from '../../../routes/column-level/nodes'
import { describe, expect, it } from 'vitest'

describe('column-level/nodes registry', () => {
  it('maps dataset and column node kinds to their renderers', () => {
    expect(columnLevelNodeRenderer.get('dataset')).toBe(ColumnLineageDatasetNode)
    expect(columnLevelNodeRenderer.get('column')).toBe(ColumnLineageColumnNode)
  })
})
