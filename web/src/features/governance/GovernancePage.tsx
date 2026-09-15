// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

// Governance view: column-lineage coverage per namespace. This is the CDO/BCBS-facing
// surface — which datasets carry column lineage, how complete the field mapping is,
// and which datasets are the gaps to chase.

import {
  Autocomplete,
  Box,
  Chip,
  Container,
  Grid,
  LinearProgress,
  Link as MuiLink,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
} from '@mui/material'
import { Namespace } from '@/shared/types/api'
import { RootState } from '@/store/store'
import { Link as RouterLink } from 'react-router-dom'
import { formatUpdatedAt } from '@/shared/utils'
import { theme } from '@/shared/theme/theme'
import { useNamespaceCoverage } from './api/coverage'
import { useNamespaces } from '@/features/namespaces/api'
import { useSelector } from 'react-redux'
import { useState } from 'react'
import MqEmpty from '@/shared/components/MqEmpty/MqEmpty'
import MqText from '@/shared/components/MqText/MqText'
import React from 'react'

const percent = (numerator: number, denominator: number) =>
  denominator === 0 ? 0 : Math.round((numerator / denominator) * 100)

interface MetricCardProps {
  title: string
  value: string
  hint: string
  progress?: number
}

const MetricCard = ({ title, value, hint, progress }: MetricCardProps) => (
  <Box
    sx={{
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: 1,
      p: 2,
      height: '100%',
    }}
  >
    <MqText subdued>{title}</MqText>
    <MqText heading>{value}</MqText>
    {progress !== undefined && (
      <LinearProgress
        variant={'determinate'}
        value={progress}
        sx={{ my: 1, height: 8, borderRadius: 4 }}
      />
    )}
    <MqText subdued small>
      {hint}
    </MqText>
  </Box>
)

const GovernancePage = () => {
  const { data: namespacesData } = useNamespaces()
  const namespaces: Namespace[] = namespacesData?.namespaces || []
  const selectedNamespace = useSelector((state: RootState) => state.namespaces.selectedNamespace)
  const [namespace, setNamespace] = useState<string | null>(selectedNamespace)

  const { data: coverage, isLoading, isError } = useNamespaceCoverage(namespace)

  const missing = coverage?.datasets.filter((dataset) => !dataset.hasColumnLineage) ?? []

  return (
    <Container maxWidth={'lg'} disableGutters sx={{ pt: 3, pb: 6 }}>
      <Box display={'flex'} justifyContent={'space-between'} alignItems={'center'} mb={3}>
        <Box>
          <MqText heading>Lineage Coverage</MqText>
          <MqText subdued>
            Column-lineage completeness per namespace — the evidence gap list for data governance.
          </MqText>
        </Box>
        <Autocomplete
          size={'small'}
          sx={{ width: 320 }}
          options={namespaces.map((item) => item.name)}
          value={namespace}
          onChange={(_event, value) => setNamespace(value)}
          renderInput={(params) => <TextField {...params} label={'Namespace'} />}
        />
      </Box>

      {isLoading && <LinearProgress />}
      {isError && (
        <MqEmpty title={'Could not compute coverage'}>
          <MqText subdued>The namespace may be unavailable. Try another one.</MqText>
        </MqEmpty>
      )}

      {coverage && (
        <>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <MetricCard
                title={'DATASETS WITH COLUMN LINEAGE'}
                value={`${coverage.datasetsWithColumnLineage} / ${coverage.totalDatasets}`}
                progress={percent(coverage.datasetsWithColumnLineage, coverage.totalDatasets)}
                hint={`${percent(
                  coverage.datasetsWithColumnLineage,
                  coverage.totalDatasets
                )}% of datasets in this namespace carry a columnLineage facet`}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <MetricCard
                title={'FIELD-LEVEL COVERAGE (SAMPLED)'}
                value={`${coverage.sampledMappedFields} / ${coverage.sampledFields}`}
                progress={percent(coverage.sampledMappedFields, coverage.sampledFields)}
                hint={`${percent(
                  coverage.sampledMappedFields,
                  coverage.sampledFields
                )}% of fields mapped across ${coverage.sampledDatasets} sampled datasets`}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <MetricCard
                title={'LINEAGE GAPS'}
                value={`${missing.length}`}
                hint={'Datasets with no column lineage recorded — the backlog below'}
              />
            </Grid>
          </Grid>

          <Box mt={4} mb={1}>
            <MqText subheading>DATASETS</MqText>
          </Box>
          <Table size={'small'}>
            <TableHead>
              <TableRow>
                <TableCell>
                  <MqText subheading inline>
                    Name
                  </MqText>
                </TableCell>
                <TableCell>
                  <MqText subheading inline>
                    Fields
                  </MqText>
                </TableCell>
                <TableCell>
                  <MqText subheading inline>
                    Column lineage
                  </MqText>
                </TableCell>
                <TableCell>
                  <MqText subheading inline>
                    Mapped fields
                  </MqText>
                </TableCell>
                <TableCell>
                  <MqText subheading inline>
                    Updated
                  </MqText>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {coverage.datasets.map((dataset) => (
                <TableRow key={dataset.name}>
                  <TableCell>
                    <MuiLink
                      component={RouterLink}
                      to={`/datasets/column-level/${encodeURIComponent(
                        dataset.namespace
                      )}/${encodeURIComponent(dataset.name)}`}
                    >
                      <MqText font={'mono'} inline>
                        {dataset.name}
                      </MqText>
                    </MuiLink>
                  </TableCell>
                  <TableCell>{dataset.fieldCount}</TableCell>
                  <TableCell>
                    <Chip
                      size={'small'}
                      variant={'outlined'}
                      color={dataset.hasColumnLineage ? 'primary' : 'warning'}
                      label={dataset.hasColumnLineage ? 'Tracked' : 'Missing'}
                    />
                  </TableCell>
                  <TableCell>
                    {dataset.mappedFieldCount !== null
                      ? `${Math.min(dataset.mappedFieldCount, dataset.fieldCount)} / ${
                          dataset.fieldCount
                        }`
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <MqText subdued inline>
                      {formatUpdatedAt(dataset.updatedAt)}
                    </MqText>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {coverage.datasets.length === 0 && (
            <Box mt={4}>
              <MqEmpty title={'No datasets in this namespace'} />
            </Box>
          )}
        </>
      )}

      {!namespace && (
        <MqEmpty title={'Pick a namespace'}>
          <MqText subdued>Coverage is computed per namespace in this POC.</MqText>
        </MqEmpty>
      )}
    </Container>
  )
}

export default GovernancePage
