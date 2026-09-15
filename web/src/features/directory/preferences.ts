// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

// Per-user namespace preferences, kept in localStorage until a real identity
// service exists. Favorites are pinned namespaces; recents are the last visited.

const FAVORITES_KEY = 'mq_favorite_namespaces'
const RECENTS_KEY = 'mq_recent_namespaces'
const MAX_RECENTS = 8

const read = (key: string): string[] => {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(key)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : []
  } catch {
    return []
  }
}

const write = (key: string, values: string[]) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(values))
}

export const getFavoriteNamespaces = (): string[] => read(FAVORITES_KEY)

export const toggleFavoriteNamespace = (namespace: string): string[] => {
  const favorites = getFavoriteNamespaces()
  const next = favorites.includes(namespace)
    ? favorites.filter((item) => item !== namespace)
    : [...favorites, namespace]
  write(FAVORITES_KEY, next)
  return next
}

export const getRecentNamespaces = (): string[] => read(RECENTS_KEY)

export const recordRecentNamespace = (namespace: string): string[] => {
  const next = [namespace, ...getRecentNamespaces().filter((item) => item !== namespace)].slice(
    0,
    MAX_RECENTS
  )
  write(RECENTS_KEY, next)
  return next
}
