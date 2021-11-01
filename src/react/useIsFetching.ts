
import {createSignal, createMemo, createEffect, onCleanup} from 'solid-js'

import { notifyManager } from '../core/notifyManager'
import { QueryKey } from '../core/types'
import { parseFilterArgs, QueryFilters } from '../core/utils'
import { useQueryClient } from './QueryClientProvider'

export function useIsFetching(filters?: QueryFilters): number
export function useIsFetching(
  queryKey?: QueryKey,
  filters?: QueryFilters
): number
export function useIsFetching(
  arg1?: QueryKey | QueryFilters,
  arg2?: QueryFilters
): number {
  const mountedRef = false

  const queryClient = useQueryClient()

  const [filters] = parseFilterArgs(arg1, arg2)
  const [isFetching, setIsFetching] = createSignal(
    queryClient.isFetching(filters)
  )

  const filtersRef = filters
  filtersRef.current = filters
  const isFetchingRef = isFetching
  isFetchingRef.current = isFetching

  createEffect(() => {
    mountedRef.current = true

    const unsubscribe = queryClient.getQueryCache().subscribe(
      notifyManager.batchCalls(() => {
        if (mountedRef.current) {
          const newIsFetching = queryClient.isFetching(filtersRef.current)
          if (isFetchingRef.current !== newIsFetching) {
            setIsFetching(newIsFetching)
          }
        }
      })
    )

    onCleanup(()=>{
      mountedRef.current = false
      unsubscribe()
    })

  })

  return isFetching
}
