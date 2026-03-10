import React, { useEffect, useState } from 'react'
import {
    Box,
    Button,
    CircularProgress,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material'
import {
    acceptAlationMapping,
    getAlationMappings,
    rejectAlationMapping,
    suggestAlationMappings,
} from '../../store/requests/alation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { formatDatePicker } from '../../helpers/time'
import { useTranslation } from 'react-i18next'

interface AlationMapping {
    id: string
    openLineageNamespace: string
    openLineageDatasetName: string
    alationDatasetId: number
    alationDatasetName: string
    confidenceScore: number
    status: 'SUGGESTED' | 'ACCEPTED' | 'REJECTED'
    updatedAt: string
}

const AlationMappings = () => {
    const { t } = useTranslation()
    const queryClient = useQueryClient()

    // Fetch all mappings (in a real app we might want to paginate or filter by namespace)
    const { data: mappings, isLoading, error } = useQuery<AlationMapping[]>({
        queryKey: ['alationMappings'],
        queryFn: () => getAlationMappings(),
    })

    // Mutations
    const acceptMutation = useMutation({
        mutationFn: acceptAlationMapping,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['alationMappings'] })
        },
    })

    const rejectMutation = useMutation({
        mutationFn: rejectAlationMapping,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['alationMappings'] })
        },
    })

    // To trigger suggestion logic, you need an OL namespace and an Alation Schema ID.
    // We'll hardcode some inputs here for demonstration, but normally these would come from form inputs.
    const handleSuggest = async () => {
        // Example only - would normally prompt the user or integrate this automatically
        const defaultNamespace = 'my-namespace'
        const defaultSchemaId = 1
        await suggestAlationMappings(defaultNamespace, defaultSchemaId)
        queryClient.invalidateQueries({ queryKey: ['alationMappings'] })
    }

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
            <Box display='flex' justifyContent='space-between' alignItems='center' mb={3}>
                <Typography variant='h5'>Alation Mappings</Typography>
                <Button variant='contained' color='primary' onClick={handleSuggest}>
                    Suggest Mappings (Demo)
                </Button>
            </Box>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>OpenLineage Dataset</TableCell>
                            <TableCell>Alation Dataset</TableCell>
                            <TableCell>Confidence Score</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Last Updated</TableCell>
                            <TableCell align='right'>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {mappings?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} align='center'>
                                    No mappings found.
                                </TableCell>
                            </TableRow>
                        )}
                        {mappings?.map((row) => (
                            <TableRow key={row.id}>
                                <TableCell>
                                    {row.openLineageNamespace} / {row.openLineageDatasetName}
                                </TableCell>
                                <TableCell>
                                    {row.alationDatasetName} (ID: {row.alationDatasetId})
                                </TableCell>
                                <TableCell>{(row.confidenceScore * 100).toFixed(1)}%</TableCell>
                                <TableCell>
                                    <Typography
                                        color={
                                            row.status === 'ACCEPTED'
                                                ? 'success.main'
                                                : row.status === 'REJECTED'
                                                    ? 'error.main'
                                                    : 'text.secondary'
                                        }
                                    >
                                        {row.status}
                                    </Typography>
                                </TableCell>
                                <TableCell>{formatDatePicker(row.updatedAt)}</TableCell>
                                <TableCell align='right'>
                                    {row.status === 'SUGGESTED' && (
                                        <Box display='flex' gap={1} justifyContent='flex-end'>
                                            <Button
                                                size='small'
                                                variant='contained'
                                                color='success'
                                                disabled={acceptMutation.isPending || rejectMutation.isPending}
                                                onClick={() => acceptMutation.mutate(row.id)}
                                            >
                                                Accept
                                            </Button>
                                            <Button
                                                size='small'
                                                variant='outlined'
                                                color='error'
                                                disabled={acceptMutation.isPending || rejectMutation.isPending}
                                                onClick={() => rejectMutation.mutate(row.id)}
                                            >
                                                Reject
                                            </Button>
                                        </Box>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    )
}

export default AlationMappings
