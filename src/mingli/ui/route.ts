import { useMemo, useSyncExternalStore } from 'react'

// hash 路由：#/tarot?seed=12345 → path '/tarot'、params seed=12345
const subscribe = (cb: () => void) => {
  addEventListener('hashchange', cb)
  return () => removeEventListener('hashchange', cb)
}

export function useRoute() {
  const hash = useSyncExternalStore(subscribe, () => location.hash)
  return useMemo(() => {
    const raw = hash.replace(/^#/, '') || '/'
    const [path, query = ''] = raw.split('?')
    return { hash, path: path || '/', params: new URLSearchParams(query) }
  }, [hash])
}

export const goTo = (path: string) => {
  location.hash = `#${path}`
}
