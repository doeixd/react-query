import { QueryKey } from '../core'
import { notifyManager } from '../core/notifyManager'
import { QueryObserver } from '../core/queryObserver'
import { useQueryErrorResetBoundary } from './QueryErrorResetBoundary'
import { useQueryClient } from './QueryClientProvider'
import { UseBaseQueryOptions } from './types'
import { shouldThrowError } from './utils'
import {createSignal, createMemo, createEffect, onCleanup} from 'solid-js'

export function useBaseQuery<
  TQueryFnData,
  TError,
  TData,
  TQueryData,
  TQueryKey extends QueryKey
>(
  options: UseBaseQueryOptions<
    TQueryFnData,
    TError,
    TData,
    TQueryData,
    TQueryKey
  >,
  Observer: typeof QueryObserver
) {
  const [mountedRef] = createSignal(false)
  const [, forceUpdate] = createSignal(0)

  const queryClient = useQueryClient()
  const errorResetBoundary = useQueryErrorResetBoundary()
  const [defaultedOptions] = createSignal(queryClient.defaultQueryObserverOptions(options))

  // Make sure results are optimistically set in fetching state before subscribing or updating options
  defaultedOptions.optimisticResults = true

  // Include callbacks in batch renders
  if (defaultedOptions.onError) {
    defaultedOptions.onError = notifyManager.batchCalls(
      defaultedOptions.onError
    )
  }

  if (defaultedOptions.onSuccess) {
    defaultedOptions.onSuccess = notifyManager.batchCalls(
      defaultedOptions.onSuccess
    )
  }

  if (defaultedOptions.onSettled) {
    defaultedOptions.onSettled = notifyManager.batchCalls(
      defaultedOptions.onSettled
    )
  }

  if (defaultedOptions.suspense) {
    // Always set stale time when using suspense to prevent
    // fetching again when directly mounting after suspending
    if (typeof defaultedOptions.staleTime !== 'number') {
      defaultedOptions.staleTime = 1000
    }

    // Set cache time to 1 if the option has been set to 0
    // when using suspense to prevent infinite loop of fetches
    if (defaultedOptions.cacheTime === 0) {
      defaultedOptions.cacheTime = 1
    }
  }

  if (defaultedOptions.suspense || defaultedOptions.useErrorBoundary) {
    // Prevent retrying failed query if the error boundary has not been reset yet
    if (!errorResetBoundary.isReset()) {
      defaultedOptions.retryOnMount = false
    }
  }

  const [observer] = createSignal(
    () =>
      new Observer<TQueryFnData, TError, TData, TQueryData, TQueryKey>(
        queryClient,
        defaultedOptions
      )
  )

  let result = observer.getOptimisticResult(defaultedOptions)

  createEffect(() => {
    mountedRef.current = true

    errorResetBoundary.clearReset()

    const unsubscribe = observer.subscribe(
      notifyManager.batchCalls(() => {
        if (mountedRef.current) {
          forceUpdate(x => x + 1)
        }
      })
    )

    // Update result to make sure we did not miss any query updates
    // between creating the observer and subscribing to it.
    observer.updateResult()
    onCleanup(() => {
      mountedRef.current = false
      unsubscribe()
    })
  })



  createEffect(() => {
    // Do not notify on updates because of changes in the options because
    // these changes should already be reflected in the optimistic result.
    observer.setOptions(defaultedOptions(), { listeners: false })
  })

  // Handle suspense
  if (defaultedOptions.suspense && result.isLoading) {
    throw observer
      .fetchOptimistic(defaultedOptions)
      .then(({ data }) => {
        defaultedOptions.onSuccess?.(data as TData)
        defaultedOptions.onSettled?.(data, null)
      })
      .catch(error => {
        errorResetBoundary.clearReset()
        defaultedOptions.onError?.(error)
        defaultedOptions.onSettled?.(undefined, error)
      })
  }

  // Handle error boundary
  if (
    result.isError &&
    !result.isFetching &&
    shouldThrowError(
      defaultedOptions.suspense,
      defaultedOptions.useErrorBoundary,
      result.error
    )
  ) {
    throw result.error
  }

  // Handle result property usage tracking
  if (defaultedOptions.notifyOnChangeProps === 'tracked') {
    result = observer.trackResult(result)
  }

  return result
}
