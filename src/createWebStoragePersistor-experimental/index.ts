import { noop } from '../core/utils'
import { PersistedClient, Persistor } from '../persistQueryClient-experimental'

interface CreateWebStoragePersistorOptions {
  /** The storage client used for setting an retrieving items from cache */
  storage: Storage
  /** The key to use when storing the cache */
  key?: string
  /** To avoid spamming,
   * pass a time in ms to throttle saving the cache to disk */
  throttleTime?: number
  /**
   * How to serialize the data to storage.
   * @default `JSON.stringify`
   */
  serialize?: (client: PersistedClient) => string
  /**
   * How to deserialize the data from storage.
   * @default `JSON.parse`
   */
  deserialize?: (cachedString: string) => PersistedClient
}

export function createWebStoragePersistor({
  storage,
  key = `REACT_QUERY_OFFLINE_CACHE`,
  throttleTime = 1000,
  serialize = JSON.stringify,
  deserialize = JSON.parse,
}: CreateWebStoragePersistorOptions): Persistor {
  if (typeof storage !== 'undefined') {
    return {
      persistClient: throttle(persistedClient => {
        storage.setItem(key, serialize(persistedClient))
      }, throttleTime),
      restoreClient: () => {
        const cacheString = storage.getItem(key)

        if (!cacheString) {
          return
        }

        return deserialize(cacheString) as PersistedClient
      },
      removeClient: () => {
        storage.removeItem(key)
      },
    }
  }

  return {
    persistClient: noop,
    restoreClient: noop,
    removeClient: noop,
  }
}

function throttle<TArgs extends any[]>(
  func: (...args: TArgs) => any,
  wait = 100
) {
  let timer: number | null = null
  let params: TArgs
  return function (...args: TArgs) {
    params = args
    if (timer === null) {
      timer = setTimeout(() => {
        func(...params)
        timer = null
      }, wait)
    }
  }
}
