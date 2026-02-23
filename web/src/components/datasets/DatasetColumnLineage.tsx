// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { Box, Button } from '@mui/material'
import { Dataset } from '../../types/api'
import { RootState } from '../../store/store'
import { LineageDataset } from '../../types/lineage'
import { fileSize } from '../../helpers'
import { saveAs } from 'file-saver'
import { useDataset } from '../../queries/datasets'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MqEmpty from '../core/empty/MqEmpty'
import MqJsonView from '../../components/core/json-view/MqJsonView'
import MqText from '../core/text/MqText'

interface DatasetColumnLineageProps {
  lineageDataset: LineageDataset
}

const DatasetColumnLineage = (props: DatasetColumnLineageProps) => {
  const { t } = useTranslation()
  const { lineageDataset } = props
  const { name, namespace } = useParams()
  const { data: dataset } = useDataset(namespace || '', name || '')

  const handleDownloadPayload = (data: object) => {
    const title = `${lineageDataset.name}-${lineageDataset.namespace}-columnLineage`
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
    saveAs(blob, `${title}.json`)
  }

  const columnLineage = dataset?.columnLineage
  return (
    <>
      {columnLineage ? (
        <>
          {fileSize(JSON.stringify(columnLineage)).kiloBytes > 500 ? (
            <Box p={2}>
              <MqEmpty title={'Payload is too big for render'}>
                <div>
                  <MqText subdued>Please click on button and download payload as file</MqText>
                  <br />
                  <Button
                    variant='outlined'
                    color='primary'
                    onClick={() => handleDownloadPayload(columnLineage)}
                  >
                    Download payload
                  </Button>
                </div>
              </MqEmpty>
            </Box>
          ) : (
            <MqJsonView data={columnLineage} />
          )}
        </>
      ) : (
        <MqEmpty
          title={t('datasets_column_lineage.empty_title')}
          body={t('datasets_column_lineage.empty_body')}
        />
      )}
    </>
  )
}

export default DatasetColumnLineage
