import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

const fetcher = async (path, options = {}) => {
  const r = await fetch(path, options)
  if (!r.ok) {
    throw new Error(`HTTP ${r.status}: ${r.statusText}`)
  }
  return r.json()
}

export const useIAW = () =>
  useQuery({ queryKey: ['iaw'], queryFn: () => fetcher('/api/iaw'), staleTime: 60_000 })

export const useBill = () =>
  useQuery({ queryKey: ['bill'], queryFn: () => fetcher('/api/bill'), staleTime: 60_000 })

export const usePension = () =>
  useQuery({ queryKey: ['pension'], queryFn: () => fetcher('/api/pension'), staleTime: 60_000 })

export const useGem = () =>
  useQuery({ queryKey: ['gem'], queryFn: () => fetcher('/api/gem'), staleTime: 60_000 })

export const useLastUpdated = () =>
  useQuery({
    queryKey: ['last-updated'],
    queryFn: () => fetcher('/api/last-updated'),
    refetchInterval: 20_000, // Poll every 20 seconds for rapid sync
  })

// Reactive auto-refresh: monitors timestamp changes and automatically invalidates all queries
export function useAutoRefresh() {
  const qc = useQueryClient()
  const lastTs = useRef(null)
  const { data } = useLastUpdated()

  useEffect(() => {
    if (data?.timestamp) {
      if (lastTs.current !== null && lastTs.current !== data.timestamp) {
        // Timestamp changed — invalidate all data caches so UI re-renders with fresh Drive data
        qc.invalidateQueries({ queryKey: ['iaw'] })
        qc.invalidateQueries({ queryKey: ['bill'] })
        qc.invalidateQueries({ queryKey: ['pension'] })
        qc.invalidateQueries({ queryKey: ['gem'] })
      }
      lastTs.current = data.timestamp
    }
  }, [data?.timestamp, qc])
}

// On-demand manual sync with Drive
export function useTriggerRefresh() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: () => fetcher('/api/refresh', { method: 'POST' }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['last-updated'] })
      qc.invalidateQueries({ queryKey: ['iaw'] })
      qc.invalidateQueries({ queryKey: ['bill'] })
      qc.invalidateQueries({ queryKey: ['pension'] })
      qc.invalidateQueries({ queryKey: ['gem'] })
    },
  })
}
