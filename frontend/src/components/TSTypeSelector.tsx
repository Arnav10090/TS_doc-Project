import React, { useEffect, useMemo, useState } from 'react'
import { getTSTypes } from '../api/tsTypes'
import type { TSTypeOption } from '../types'

interface Props {
  value?: string | null
  onChange: (value: string) => void
  required?: boolean
  className?: string
}

const TSTypeSelector: React.FC<Props> = ({ value, onChange, className = '' }) => {
  const [options, setOptions] = useState<TSTypeOption[]>([])
  const [loading, setLoading] = useState(false)
  const [path, setPath] = useState<string[]>([])

  useEffect(() => {
    let mounted = true
    setLoading(true)
    getTSTypes()
      .then((resp) => {
        if (!mounted) return
        setOptions(resp.ts_types || [])
      })
      .catch((err) => console.error('Failed to fetch TS types', err))
      .finally(() => mounted && setLoading(false))

    return () => {
      mounted = false
    }
  }, [])

  const topLevel = useMemo(() => {
    const set = new Set<string>()
    options.forEach((o) => set.add(o.value.split('/')[0]))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [options])

  const getChildren = (prefix: string | null) => {
    if (!prefix) return [] as string[]
    const set = new Set<string>()
    const prefixParts = prefix.split('/')
    options.forEach((o) => {
      const parts = o.value.split('/')
      if (parts.length <= prefixParts.length) return
      if (parts.slice(0, prefixParts.length).join('/') === prefix) {
        set.add(parts[prefixParts.length])
      }
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }

  const selectedTop = path[0] ?? null
  const selectedMid = path[1] ?? null
  const selectedThird = path[2] ?? null

  const col0 = topLevel
  const col1 = selectedTop ? getChildren(selectedTop) : []
  const col2 = selectedTop && selectedMid ? getChildren(`${selectedTop}/${selectedMid}`) : []

  const findOptionLabel = (full: string) => options.find((o) => o.value === full)?.label || full.replace(/\//g, ' — ')

  

  return (
    <div className={`grid grid-cols-3 gap-4 ${className}`}>
      {/* Column 0 - Top level categories */}
      <div className="bg-surface border border-border rounded p-2 shadow-sm">
        <div className="text-sm font-semibold text-text mb-2">TS Categories</div>
        {loading ? (
          <div className="text-sm text-text">Loading…</div>
        ) : (
          <ul className="divide-y divide-border max-h-72 overflow-auto">
            {col0.map((cat) => (
              <li key={cat}>
                <button
                  type="button"
                  onClick={() => {
                    const midChildren = getChildren(cat)
                    if (midChildren.length === 1) {
                      const onlyMid = midChildren[0]
                      const grandChildren = getChildren(`${cat}/${onlyMid}`)
                      if (grandChildren.length === 0) {
                        // auto-select the sole mid child
                        setPath([cat, onlyMid])
                        onChange(`${cat}/${onlyMid}`)
                        return
                      }
                    }
                    setPath([cat])
                  }}
                  className={`w-full text-left px-4 py-3 flex items-center justify-between focus:outline-none ${selectedTop === cat ? 'bg-red-600 text-white border-l-4 border-primary hover:bg-red-600 hover:text-white' : 'hover:bg-surface/60'}`}
                >
                  <span className="truncate">{cat}</span>
                  <span className="text-text-muted">▸</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Column 1 - Subcategories of selected top */}
      <div className="bg-white border border-border rounded p-3 shadow-sm">
        <div className="flex items-center justify-end mb-3">
          {(path.length > 0 || !!value) ? (
            <button
              type="button"
              onClick={() => { setPath([]); onChange('') }}
              className="text-xs text-primary hover:underline"
              title="Clear TS selection"
            >
              Clear
            </button>
          ) : null}
        </div>

        {loading ? (
          <div className="text-sm text-text">Loading TS types…</div>
        ) : selectedTop ? (
          <div className="space-y-2">
            {/* exact match for top-level (e.g., "Level 2") */}
            {options.find((o) => o.value === selectedTop) ? (
              <div>
                <button
                  type="button"
                  onClick={() => onChange(selectedTop)}
                  className={`w-full text-left px-4 py-3 rounded ${value === selectedTop ? 'bg-red-600 text-white border border-primary/20 hover:bg-red-600 hover:text-white' : 'bg-white hover:bg-surface/50'}`}
                >
                  {findOptionLabel(selectedTop)}
                </button>
              </div>
            ) : null}

            {col1.length > 0 ? (
              <ul className="space-y-1 max-h-64 overflow-auto">
                {col1.map((child) => {
                  const childFull = `${selectedTop}/${child}`
                  const hasFurther = options.some((o) => o.value.startsWith(childFull + '/'))
                  return (
                    <li key={child} className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setPath([selectedTop, child])
                          if (!hasFurther) onChange(childFull)
                        }}
                        className={`flex-1 text-left px-4 py-3 rounded ${selectedMid === child ? 'bg-red-600 text-white hover:bg-red-600 hover:text-white' : 'hover:bg-surface/50'}`}
                      >
                        {child}
                      </button>
                      {hasFurther ? (
                        <span className="text-text-muted ml-2">▸</span>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            ) : null}
          </div>
        ) : (
          <div className="text-sm text-text-muted">Select a category from the left to view subcategories.</div>
        )}
      </div>

      {/* Column 2 - Third level (children of selected mid) */}
      <div className="bg-white border border-border rounded p-3 shadow-sm">
        {loading ? (
          <div className="text-sm text-text">Loading…</div>
        ) : selectedTop && selectedMid ? (
          <div>
            {col2.length > 0 ? (
              <ul className="space-y-1 max-h-72 overflow-auto">
                {col2.map((child) => {
                  const childFull = `${selectedTop}/${selectedMid}/${child}`
                  const hasFurther = options.some((o) => o.value.startsWith(childFull + '/'))
                  return (
                    <li key={child} className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setPath([selectedTop, selectedMid, child])
                          if (!hasFurther) onChange(childFull)
                        }}
                        className={`flex-1 text-left px-4 py-3 rounded ${selectedThird === child || value === childFull ? 'bg-red-600 text-white hover:bg-red-600 hover:text-white' : 'hover:bg-surface/50'}`}
                      >
                        {child}
                      </button>
                      {hasFurther ? (
                        <span className="text-text-muted ml-2">▸</span>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default TSTypeSelector
