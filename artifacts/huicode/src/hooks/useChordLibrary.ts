import { useEffect, useState } from 'react'
import {
  fetchChordLibrary,
  type ChordLibraryLoadInfo,
} from '../api/chordsApi'
import type { ChordLibrary } from '../types/chord'

/** 코드찾기·악보만들기 등 — API(DB) 우선, 실패 시 번들 fallback */
export function useChordLibrary() {
  const [library, setLibrary] = useState<ChordLibrary | null>(null)
  const [loadInfo, setLoadInfo] = useState<ChordLibraryLoadInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchChordLibrary()
      .then(({ library: lib, loadInfo: info }) => {
        if (!cancelled) {
          setLibrary(lib)
          setLoadInfo(info)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { library, loadInfo, loading }
}
