import { useCallback, useEffect, useState } from 'react'
import { fetchChordTypes } from '../api/chordsApi'
import { QUALITY_ORDER } from '../data/chordData'

export type ChordTypeItem = { key: string; label: string }

/** API에서 코드 타입 목록을 가져오는 훅. 실패 시 정적 QUALITY_ORDER로 폴백. */
export function useChordTypes() {
  const [types, setTypes] = useState<ChordTypeItem[]>(QUALITY_ORDER)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const fetched = await fetchChordTypes()
      if (fetched.length > 0) {
        setTypes(fetched.map((t) => ({ key: t.key, label: t.label })))
      }
    } catch {
      // 정적 폴백 유지
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { types, loading, reload }
}
