import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

const fetcher = (path) => fetch(path).then(r => r.json())

export const useIAW  = () => useQuery({ queryKey: ['iaw'],  queryFn: () => fetcher('/api/iaw'),  staleTime: 60_000 })
export const useBill = () => useQuery({ queryKey: ['bill'], queryFn: () => fetcher('/api/bill'), staleTime: 60_000 })

// Poll /api/last-updated every 60s; invalidate data queries when timestamp changes
export function useAutoRefresh() {
  const qc = useQueryClient()
  const lastTs = useRef(null)

  useQuery({
    queryKey: ['last-updated'],
    queryFn: () => fetcher('/api/last-updated'),
    refetchInterval: 60_000,
    onSuccess: (data) => {
      if (data?.timestamp && data.timestamp !== lastTs.current) {
        if (lastTs.current !== null) {
          qc.invalidateQueries({ queryKey: ['iaw'] })
          qc.invalidateQueries({ queryKey: ['bill'] })
        }
        lastTs.current = data.timestamp
      }
    },
  })
}
