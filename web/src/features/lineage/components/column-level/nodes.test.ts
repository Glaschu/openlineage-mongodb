// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { ColumnLineageDatasetNode } from '@/features/lineage/components/column-level/ColumnLineageDatasetNode'
import ColumnLineageColumnNode from '@/features/lineage/components/column-level/ColumnLineageColumnNode'
import { columnLevelNodeRenderer } from '@/features/lineage/components/column-level/nodes'
import { describe, expect, it } from 'vitest'

describe('column-level/nodes registry', () => {
  it('maps dataset and column node kinds to their renderers', () => {
    expect(columnLevelNodeRenderer.get('dataset')).toBe(ColumnLineageDatasetNode)
    expect(columnLevelNodeRenderer.get('column')).toBe(ColumnLineageColumnNode)
  })
})
