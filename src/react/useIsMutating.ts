
import {createSignal, createMemo, createEffect, onCleanup} from 'solid-js'

import { notifyManager } from '../core/notifyManager'
import { QueryKey } from '../core/types'
import { MutationFilters, parseMutationFilterArgs } from '../core/utils'
import { useQueryClient } from './QueryClientProvider'

export function useIsMutating(filters?: MutationFilters): number
export function useIsMutating(
  queryKey?: QueryKey,
  filters?: MutationFilters
): number
export function useIsMutating(
  arg1?: QueryKey | MutationFilters,
  arg2?: MutationFilters
): number {
  const mountedRef = false
  const filters = parseMutationFilterArgs(arg1, arg2)

  const queryClient = useQueryClient()

  const [isMutating, setIsMutating] = createSignal(
    queryClient.isMutating(filters)
  )

  const filtersRef = React.useRef(filters)
  filtersRef.current = filters
  const isMutatingRef = React.useRef(isMutating)
  isMutatingRef.current = isMutating

  createEffect(() => {
    mountedRef.current = true

    const unsubscribe = queryClient.getMutationCache().subscribe(
      notifyManager.batchCalls(() => {
        if (mountedRef.current) {
          const newIsMutating = queryClient.isMutating(filtersRef.current)
          if (isMutatingRef.current !== newIsMutating) {
            setIsMutating(newIsMutating)
          }
        }
      })
    )

    onCleanup(()=>{
      mountedRef.current = false
      unsubscribe()
    })
  
  })

  return isMutating
}
