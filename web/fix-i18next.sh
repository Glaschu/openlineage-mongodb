#!/bin/bash

# Fix all i18next require statements in component files
for file in \
  src/components/datasets/DatasetColumnLineage.tsx \
  src/components/datasets/DatasetDetailPage.tsx \
  src/components/datasets/DatasetInfo.tsx \
  src/components/datasets/DatasetVersions.tsx \
  src/components/jobs/JobDetailPage.tsx \
  src/components/jobs/Runs.tsx \
  src/components/namespace-select/NamespaceSelect.tsx \
  src/components/paging/MqPaging.tsx \
  src/components/search/base-search/BaseSearch.tsx \
  src/components/sidenav/Sidenav.tsx \
  src/routes/column-level/ColumnLevelDrawer.tsx \
  src/routes/datasets/Datasets.tsx \
  src/routes/events/Events.tsx; do
  
  echo "Processing $file..."
  
  # Add useTranslation import if react-i18next is not already imported
  if ! grep -q "from 'react-i18next'" "$file"; then
    # Find the last import line and add after it
    sed -i '' '/^import.*from/a\
import { useTranslation } from '\''react-i18next'\''
' "$file" 2>/dev/null || true
  fi
  
  # Replace require statement with hook usage
  sed -i '' 's/const i18next = require('\''i18next'\'')/const { t } = useTranslation()/g' "$file"
  sed -i '' 's/return require('\''i18next'\'')/const { t } = useTranslation(); return t/g' "$file"
  sed -i '' 's/  const i18next = require('\''i18next'\'')/  const { t } = useTranslation()/g' "$file"
  
  # Replace i18next.t with just t
  sed -i '' 's/i18next\.t(/t(/g' "$file"
done

echo "All files processed!"
