// Copyright 2018-2024 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

// App-level feature flags. Hardcoded for now — flip a value here to toggle a
// feature across the whole UI. Keep these dead simple until we wire them to
// real app settings/env.
export const FEATURE_FLAGS = {
  // When false, all destructive "delete" actions (e.g. Delete Job, Delete
  // Dataset) are hidden from the UI.
  enableDelete: false,

  // When false, the "Show Field Tags" toggle on the dataset detail page is
  // hidden (field tags stay collapsed).
  showFieldTagsToggle: false,

  // When false, the "Group by Parent" toggle on the table-level lineage graph
  // is hidden.
  showGroupByParentToggle: false,
}
