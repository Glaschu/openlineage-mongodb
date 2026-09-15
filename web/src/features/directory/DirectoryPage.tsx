// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

// Namespace directory: the navigation model for hundreds of namespaces. Groups
// namespaces by owning team, with free-text filtering, pinned favorites, and recents —
// replacing the flat global dropdown as the way to find a team's data estate.

import { Box, Button, Chip, Container, Grid, IconButton, TextField } from '@mui/material'
import { MqScreenLoad } from '@/shared/components/MqScreenLoad/MqScreenLoad'
import { Namespace } from '@/shared/types/api'
import {
  getFavoriteNamespaces,
  getRecentNamespaces,
  recordRecentNamespace,
  toggleFavoriteNamespace,
} from './preferences'
import { selectNamespace } from '@/features/namespaces/slice'
import { theme } from '@/shared/theme/theme'
import { useDispatch } from 'react-redux'
import { useMemo, useState } from 'react'
import { useNamespaces } from '@/features/namespaces/api'
import { useNavigate } from 'react-router-dom'
import MqEmpty from '@/shared/components/MqEmpty/MqEmpty'
import MqText from '@/shared/components/MqText/MqText'
import React from 'react'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import StarIcon from '@mui/icons-material/Star'

const schemeOf = (name: string) => {
  if (name.includes('://')) return name.split('://')[0].toUpperCase()
  if (name.includes(':')) return name.split(':')[0].toUpperCase()
  return null
}

interface NamespaceCardProps {
  namespace: Namespace
  isFavorite: boolean
  onToggleFavorite: (name: string) => void
  onOpen: (name: string, destination: '/datasets' | '/jobs') => void
}

const NamespaceCard = ({ namespace, isFavorite, onToggleFavorite, onOpen }: NamespaceCardProps) => {
  const scheme = schemeOf(namespace.name)
  return (
    <Box
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 1,
        p: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        '&:hover': { borderColor: theme.palette.primary.main },
      }}
    >
      <Box display={'flex'} justifyContent={'space-between'} alignItems={'flex-start'}>
        <Box minWidth={0}>
          <MqText font={'mono'} bold>
            {namespace.name}
          </MqText>
          <MqText subdued small>
            {namespace.description || 'No description'}
          </MqText>
        </Box>
        <IconButton
          size={'small'}
          aria-label={isFavorite ? `unpin ${namespace.name}` : `pin ${namespace.name}`}
          onClick={() => onToggleFavorite(namespace.name)}
        >
          {isFavorite ? (
            <StarIcon fontSize={'small'} color={'primary'} />
          ) : (
            <StarBorderIcon fontSize={'small'} />
          )}
        </IconButton>
      </Box>
      <Box mt={2} display={'flex'} justifyContent={'space-between'} alignItems={'center'}>
        <Box display={'flex'} gap={1}>
          <Chip
            size={'small'}
            variant={'outlined'}
            color={namespace.ownerName === 'Unclaimed' ? 'warning' : 'default'}
            label={namespace.ownerName || 'Unclaimed'}
          />
          {scheme && <Chip size={'small'} variant={'outlined'} label={scheme} />}
        </Box>
        <Box display={'flex'} gap={1}>
          <Button size={'small'} onClick={() => onOpen(namespace.name, '/datasets')}>
            Datasets
          </Button>
          <Button size={'small'} onClick={() => onOpen(namespace.name, '/jobs')}>
            Jobs
          </Button>
        </Box>
      </Box>
    </Box>
  )
}

const DirectoryPage = () => {
  const { data: namespacesData, isLoading } = useNamespaces()
  const namespaces: Namespace[] = namespacesData?.namespaces || []
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const [filter, setFilter] = useState('')
  const [favorites, setFavorites] = useState<string[]>(getFavoriteNamespaces())
  const recents = useMemo(() => getRecentNamespaces(), [])

  const handleToggleFavorite = (name: string) => setFavorites(toggleFavoriteNamespace(name))

  const handleOpen = (name: string, destination: '/datasets' | '/jobs') => {
    dispatch(selectNamespace(name))
    recordRecentNamespace(name)
    navigate(destination)
  }

  const visible = useMemo(() => {
    const query = filter.trim().toLowerCase()
    if (!query) return namespaces
    return namespaces.filter(
      (namespace) =>
        namespace.name.toLowerCase().includes(query) ||
        (namespace.ownerName || '').toLowerCase().includes(query) ||
        (namespace.description || '').toLowerCase().includes(query)
    )
  }, [namespaces, filter])

  const byTeam = useMemo(() => {
    const groups = new Map<string, Namespace[]>()
    for (const namespace of visible) {
      const team = namespace.ownerName || 'Unclaimed'
      const group = groups.get(team) ?? []
      group.push(namespace)
      groups.set(team, group)
    }
    return [...groups.entries()].sort(([a], [b]) => {
      // Unclaimed namespaces sort last — they're the hygiene backlog, not the front page.
      if (a === 'Unclaimed') return 1
      if (b === 'Unclaimed') return -1
      return a.localeCompare(b)
    })
  }, [visible])

  const visibleNames = useMemo(() => new Set(visible.map((n) => n.name)), [visible])
  const favoriteNamespaces = visible.filter((n) => favorites.includes(n.name))
  const recentNamespaces = recents
    .filter((name) => visibleNames.has(name))
    .map((name) => visible.find((n) => n.name === name)!)

  const renderCards = (items: Namespace[]) => (
    <Grid container spacing={2}>
      {items.map((namespace) => (
        <Grid item xs={12} sm={6} md={4} key={namespace.name}>
          <NamespaceCard
            namespace={namespace}
            isFavorite={favorites.includes(namespace.name)}
            onToggleFavorite={handleToggleFavorite}
            onOpen={handleOpen}
          />
        </Grid>
      ))}
    </Grid>
  )

  return (
    <MqScreenLoad loading={isLoading}>
      <Container maxWidth={'lg'} disableGutters sx={{ pt: 3, pb: 6 }}>
        <Box display={'flex'} justifyContent={'space-between'} alignItems={'center'} mb={1}>
          <Box>
            <MqText heading>Namespace Directory</MqText>
            <MqText subdued>
              {`${namespaces.length} namespaces across ${
                new Set(namespaces.map((n) => n.ownerName || 'Unclaimed')).size
              } teams`}
            </MqText>
          </Box>
          <TextField
            size={'small'}
            placeholder={'Filter by name, team, or description'}
            value={filter}
            sx={{ width: 320 }}
            onChange={(event) => setFilter(event.target.value)}
          />
        </Box>

        {favoriteNamespaces.length > 0 && (
          <Box mt={3}>
            <Box mb={1}>
              <MqText subheading>PINNED</MqText>
            </Box>
            {renderCards(favoriteNamespaces)}
          </Box>
        )}

        {recentNamespaces.length > 0 && (
          <Box mt={3}>
            <Box mb={1}>
              <MqText subheading>RECENT</MqText>
            </Box>
            {renderCards(recentNamespaces)}
          </Box>
        )}

        {byTeam.map(([team, items]) => (
          <Box mt={3} key={team}>
            <Box mb={1} display={'flex'} alignItems={'center'} gap={1}>
              <MqText subheading>{team.toUpperCase()}</MqText>
              <Chip size={'small'} label={items.length} />
            </Box>
            {renderCards(items)}
          </Box>
        ))}

        {visible.length === 0 && (
          <Box mt={6}>
            <MqEmpty title={'No namespaces match your filter'}>
              <MqText subdued>Try a different name, team, or description.</MqText>
            </MqEmpty>
          </Box>
        )}
      </Container>
    </MqScreenLoad>
  )
}

export default DirectoryPage
