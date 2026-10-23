import { useState, useEffect, useCallback } from 'react'

export function useApi(apiFn, deps = [], options = { immediate: true }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(!!options.immediate)
  const [error, setError] = useState(null)

  const execute = useCallback(async (...args) => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiFn(...args)
      setData(result)
      return result
    } catch (err) {
      setError(err.message || 'Kuch galat ho gaya. Dobara koshish karein.')
      throw err
    } finally {
      setLoading(false)
    }
  }, [apiFn])

  useEffect(() => {
    if (options.immediate !== false) {
      execute()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return {
    data,
    loading,
    error,
    refetch: execute,
    setData,
    setError
  }
}
