import {createMutable, createEffect, createContext} from 'solid-js'

import { QueryClient } from '../core'

declare global {
  interface Window {
    ReactQueryClientContext?: React.Context<QueryClient | undefined>
  }
}

const defaultContext = createContext<QueryClient|undefined>(undefined)
const QueryClientSharingContext = createContext<boolean>(false)

// if contextSharing is on, we share the first and at least one
// instance of the context across the window
// to ensure that if React Query is used across
// different bundles or microfrontends they will
// all use the same **instance** of context, regardless
// of module scoping.
function getQueryClientContext(contextSharing: boolean) {
  if (contextSharing && typeof window !== 'undefined') {
    if (!window.ReactQueryClientContext) {
      window.ReactQueryClientContext = defaultContext
    }

    return window.ReactQueryClientContext
  }

  return defaultContext
}

export const useQueryClient = () => {
  const queryClient = useContext(
    getQueryClientContext(QueryClientSharingContext)
  )

  if (!queryClient) {
    throw new Error('No QueryClient set')
  }

  return queryClient
}

export interface QueryClientProviderProps {
  client: QueryClient
  contextSharing?: boolean
}

export const QueryClientProvider = ({props}:QueryClientProviderProps) => {
  createEffect(() => {
    props.client.mount()
  })
  
  onCleanup(() => {
    props.clien.unmount()
  })

  const Context = getQueryClientContext(props.contextSharing())

  return (
    <QueryClientSharingContext.Provider value={contextSharing()}>
      <Context.Provider value={props.client()}>{props.children()}</Context.Provider>    
    </QueryClientSharingContext.Provider>
  )
}
