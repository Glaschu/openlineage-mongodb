import React, { useState } from 'react'
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Paper,
    Snackbar,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material'
import {
    useAcceptMapping,
    useAlationMappings,
    useRejectMapping,
    useSuggestMappings,
} from '../../queries/alation'
import { useNamespaces } from '../../queries/namespaces'
import { Namespace } from '../../types/api'

import { formatDatePicker } from '../../helpers/time'
import { useTranslation } from 'react-i18next'

type StatusFilter = '' | 'SUGGESTED' | 'ACCEPTED' | 'REJECTED'

const AlationMappings = () => {
    const { t } = useTranslation()

    // Filter state
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('')

    // Suggest dialog state
    const [suggestOpen, setSuggestOpen] = useState(false)
    const [suggestNamespace, setSuggestNamespace] = useState('')
    const [suggestSchemaId, setSuggestSchemaId] = useState('')

    // Toast state
    const [snackbar, setSnackbar] = useState<{
        open: boolean
        message: string
        severity: 'success' | 'error'
    }>({ open: false, message: '', severity: 'success' })

    // Queries
    const {
        data: mappings,
        isLoading,
        error,
    } = useAlationMappings(undefined, statusFilter || undefined)
    const { data: namespacesData } = useNamespaces()
    const namespaces: Namespace[] = namespacesData?.namespaces || []

    // Mutations
    const acceptMutation = useAcceptMapping()
    const rejectMutation = useRejectMapping()
    const suggestMutation = useSuggestMappings()

    const showSnackbar = (message: string, severity: 'success' | 'error') => {
        setSnackbar({ open: true, message, severity })
    }

    const handleAccept = (id: string) => {
        acceptMutation.mutate(id, {
            onSuccess: () => showSnackbar(t('alation_mappings.accept_success'), 'success'),
            onError: () => showSnackbar(t('alation_mappings.action_error'), 'error'),
        })
    }

    const handleReject = (id: string) => {
        rejectMutation.mutate(id, {
            onSuccess: () => showSnackbar(t('alation_mappings.reject_success'), 'success'),
            onError: () => showSnackbar(t('alation_mappings.action_error'), 'error'),
        })
    }

    const handleSuggestSubmit = () => {
        const schemaId = parseInt(suggestSchemaId, 10)
        if (!suggestNamespace || isNaN(schemaId)) {
            return
        }

        suggestMutation.mutate(
            { namespace: suggestNamespace, schemaId },
            {
                onSuccess: () => {
                    showSnackbar(t('alation_mappings.suggest_success'), 'success')
                    setSuggestOpen(false)
                    setSuggestNamespace('')
                    setSuggestSchemaId('')
                },
                onError: () => {
                    showSnackbar(t('alation_mappings.suggest_error'), 'error')
                },
            }
        )
    }

    const handleSuggestClose = () => {
        setSuggestOpen(false)
        setSuggestNamespace('')
        setSuggestSchemaId('')
    }

    const isMutating = acceptMutation.isPending || rejectMutation.isPending

    const statusFilters: { label: string; value: StatusFilter }[] = [
        { label: t('alation_mappings.filter_all'), value: '' },
        { label: t('alation_mappings.filter_suggested'), value: 'SUGGESTED' },
        { label: t('alation_mappings.filter_accepted'), value: 'ACCEPTED' },
        { label: t('alation_mappings.filter_rejected'), value: 'REJECTED' },
    ]

    if (isLoading) {
        return (
            <Box display='flex' justifyContent='center' mt={5}>
                <CircularProgress />
            </Box>
        )
    }

    if (error) {
        return (
            <Box display='flex' justifyContent='center' mt={5}>
                <Typography color='error'>Error loading mappings</Typography>
            </Box>
        )
    }

    return (
        <Box p={3}>
            {/* Header */}
            <Box display='flex' justifyContent='space-between' alignItems='center' mb={3}>
                <Typography variant='h5'>{t('alation_mappings.heading')}</Typography>
                <Button
                    id='suggestMappingsButton'
                    variant='contained'
                    color='primary'
                    onClick={() => setSuggestOpen(true)}
                >
                    {t('alation_mappings.suggest_button')}
                </Button>
            </Box>

            {/* Status Filters */}
            <Box display='flex' gap={1} mb={3}>
                {statusFilters.map((f) => (
                    <Chip
                        key={f.value}
                        label={f.label}
                        color={statusFilter === f.value ? 'primary' : 'default'}
                        variant={statusFilter === f.value ? 'filled' : 'outlined'}
                        onClick={() => setStatusFilter(f.value)}
                        clickable
                    />
                ))}
            </Box>

            {/* Mappings Table */}
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>{t('alation_mappings.col_ol_dataset')}</TableCell>
                            <TableCell>{t('alation_mappings.col_alation_dataset')}</TableCell>
                            <TableCell>{t('alation_mappings.col_confidence')}</TableCell>
                            <TableCell>{t('alation_mappings.col_status')}</TableCell>
                            <TableCell>{t('alation_mappings.col_updated')}</TableCell>
                            <TableCell align='right'>{t('alation_mappings.col_actions')}</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {mappings?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} align='center'>
                                    <Box py={4}>
                                        <Typography variant='h6' gutterBottom>
                                            {t('alation_mappings.empty_title')}
                                        </Typography>
                                        <Typography color='text.secondary'>
                                            {t('alation_mappings.empty_body')}
                                        </Typography>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        )}
                        {mappings?.map((row) => (
                            <TableRow key={row.id}>
                                <TableCell>
                                    <Typography variant='body2' fontWeight={500}>
                                        {row.openLineageDatasetName}
                                    </Typography>
                                    <Typography variant='caption' color='text.secondary'>
                                        {row.openLineageNamespace}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Typography variant='body2' fontWeight={500}>
                                        {row.alationDatasetName}
                                    </Typography>
                                    <Typography variant='caption' color='text.secondary'>
                                        ID: {row.alationDatasetId}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        size='small'
                                        label={`${(row.confidenceScore * 100).toFixed(0)}%`}
                                        color={
                                            row.confidenceScore >= 0.8
                                                ? 'success'
                                                : row.confidenceScore >= 0.5
                                                    ? 'warning'
                                                    : 'default'
                                        }
                                        variant='outlined'
                                    />
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        size='small'
                                        label={row.status}
                                        color={
                                            row.status === 'ACCEPTED'
                                                ? 'success'
                                                : row.status === 'REJECTED'
                                                    ? 'error'
                                                    : 'default'
                                        }
                                    />
                                </TableCell>
                                <TableCell>{formatDatePicker(row.updatedAt)}</TableCell>
                                <TableCell align='right'>
                                    {row.status === 'SUGGESTED' && (
                                        <Box display='flex' gap={1} justifyContent='flex-end'>
                                            <Button
                                                id={`acceptMapping-${row.id}`}
                                                size='small'
                                                variant='contained'
                                                color='success'
                                                disabled={isMutating}
                                                onClick={() => handleAccept(row.id)}
                                            >
                                                {t('alation_mappings.accept')}
                                            </Button>
                                            <Button
                                                id={`rejectMapping-${row.id}`}
                                                size='small'
                                                variant='outlined'
                                                color='error'
                                                disabled={isMutating}
                                                onClick={() => handleReject(row.id)}
                                            >
                                                {t('alation_mappings.reject')}
                                            </Button>
                                        </Box>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Suggest Dialog */}
            <Dialog
                open={suggestOpen}
                onClose={handleSuggestClose}
                maxWidth='sm'
                fullWidth
            >
                <DialogTitle>{t('alation_mappings.suggest_dialog_title')}</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        {t('alation_mappings.suggest_dialog_body')}
                    </DialogContentText>
                    <Autocomplete
                        id='suggest-namespace-select'
                        options={namespaces}
                        getOptionLabel={(option) => option.name}
                        value={namespaces.find((n) => n.name === suggestNamespace) || null}
                        onChange={(_event, newValue) => {
                            setSuggestNamespace(newValue?.name || '')
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label={t('alation_mappings.namespace_label')}
                                fullWidth
                                margin='normal'
                            />
                        )}
                    />
                    <TextField
                        id='suggest-schema-id'
                        label={t('alation_mappings.schema_id_label')}
                        type='number'
                        fullWidth
                        margin='normal'
                        value={suggestSchemaId}
                        onChange={(e) => setSuggestSchemaId(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleSuggestClose}>
                        {t('alation_mappings.cancel')}
                    </Button>
                    <Button
                        id='submitSuggestMappings'
                        onClick={handleSuggestSubmit}
                        variant='contained'
                        disabled={
                            !suggestNamespace ||
                            !suggestSchemaId ||
                            isNaN(parseInt(suggestSchemaId, 10)) ||
                            suggestMutation.isPending
                        }
                    >
                        {suggestMutation.isPending ? (
                            <CircularProgress size={20} />
                        ) : (
                            t('alation_mappings.submit')
                        )}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
                    severity={snackbar.severity}
                    variant='filled'
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    )
}

export default AlationMappings
