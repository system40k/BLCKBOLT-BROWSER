import React, { useEffect, useMemo, useRef, useState } from 'react'
import { isSecureUrl, normalizeUrl, hostOf, SEARCH_ENGINES } from '../lib/browser'
import type { TabState } from '../lib/browser'

interface BrowserHeaderProps {
  tabs: TabState[]
  activeTabId: string
  webviewRefs: React.MutableRefObject<Record<string, any>>
  searchEngine: string
  customSearchUrl?: string
  adblockEnabled: boolean
  onNavigate: (url: string) => void
  onOpenSettings: () => void
}

export default function BrowserHeader({
  tabs,
  activeTabId,
  webviewRefs,
  searchEngine,
  customSearchUrl,
  adblockEnabled,
  onNavigate,
  onOpenSettings,
}: BrowserHeaderProps) {
  const activeTab = useMemo(() => tabs.find((t) => t.id === activeTabId) || null, [tabs, activeTabId])
  const [input, setInput] = useState(activeTab?.url || '')
  const [editing, setEditing] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Sync the address bar whenever the active tab changes (not while typing).
  useEffect(() => {
    if (!editing && activeTab) {
      setInput(activeTab.url)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId, activeTab?.url])

  // Ctrl/Cmd+L focuses the address bar.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes('mac')
      if ((e.ctrlKey && !isMac && e.key.toLowerCase() === 'l') || (isMac && e.metaKey && e.key.toLowerCase() === 'l')) {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const engine = SEARCH_ENGINES[searchEngine === 'custom' ? 'duckduckgo' : searchEngine]

  const buildSuggestions = (q: string): string[] => {
    const query = q.trim()
    if (!query) return []
    const out: string[] = []
    for (const t of tabs) {
      if (out.length >= 4) break
      const u = t.url
      if (u && u !== query && u.toLowerCase().includes(query.toLowerCase())) out.push(u)
    }
    if (query.startsWith('http') || query.includes('.')) {
      const direct = normalizeUrl(query, searchEngine, customSearchUrl)
      if (!out.includes(direct)) out.push(direct)
    }
    if (engine) out.push(`🔎 ${engine.name}: ${query}`)
    return out.slice(0, 6)
  }

  const handleChange = (v: string) => {
    setInput(v)
    setEditing(true)
    setSuggestions(buildSuggestions(v))
    setActiveIndex(null)
  }

  const commit = (raw: string) => {
    const resolved = normalizeUrl(raw, searchEngine, customSearchUrl)
    setInput(resolved)
    setEditing(false)
    setSuggestions([])
    setActiveIndex(null)
    if (resolved !== activeTab?.url) onNavigate(resolved)
  }

  const handleSubmit = (event?: React.FormEvent) => {
    if (event) event.preventDefault()
    if (activeIndex !== null && suggestions[activeIndex]) {
      const sel = suggestions[activeIndex]
      if (sel.startsWith('🔎')) {
        const raw = sel.split(': ').slice(1).join(': ')
        commit(raw)
      } else {
        commit(sel)
      }
      return
    }
    commit(input)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i === null ? 0 : Math.min(i + 1, suggestions.length - 1)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i === null ? suggestions.length - 1 : Math.max(i - 1, 0)))
    } else if (e.key === 'Enter') {
      handleSubmit()
    } else if (e.key === 'Escape') {
      setSuggestions([])
      setActiveIndex(null)
      setInput(activeTab?.url || '')
      setEditing(false)
      inputRef.current?.blur()
    }
  }

  const control = (fn: (el: any) => void) => {
    const el = webviewRefs.current[activeTabId]
    if (el && typeof fn === 'function') fn(el)
  }

  const secure = isSecureUrl(activeTab?.url || '')
  const displayHost = activeTab ? hostOf(activeTab.url) : 'Ready'

  const btnBase =
    'h-10 w-10 flex items-center justify-center rounded-xl bg-slate-900/50 border border-white/5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed'

  return (
    <section className="glass-panel rounded-[2.5rem] p-3 border border-white/10 shadow-soft">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex items-center gap-4 px-2">
          <div className="relative">
            <span className="flex h-12 w-12 items-center justify-center rounded-[1.25rem] bg-gradient-to-br from-accent to-accentSoft text-slate-950 font-bold text-xl shadow-lg shadow-accent/20">
              B
            </span>
            <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-success border-2 border-[#05070d] shadow-sm" />
          </div>
          <div className="hidden xl:block">
            <p className="text-[10px] uppercase tracking-[0.4em] font-bold text-slate-500 leading-tight">BLCKBOLT</p>
            <p className="text-sm font-semibold text-slate-200 tracking-tight truncate max-w-[160px]">{displayHost}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-2">
          <button
            className={btnBase}
            disabled={!activeTab?.canGoBack}
            onClick={() => control((el) => el.goBack())}
            aria-label="Back"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button
            className={btnBase}
            disabled={!activeTab?.canGoForward}
            onClick={() => control((el) => el.goForward())}
            aria-label="Forward"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
          <button
            className={btnBase}
            onClick={() => control((el) => el.reload())}
            aria-label="Reload"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-9-9c4.56 0 8.33 3.03 9.46 7.15" />
              <path d="M21 3v9h-9" />
            </svg>
          </button>
        </div>

        <form onSubmit={(e) => handleSubmit(e)} className="flex-1 min-w-0">
          <label className="sr-only" htmlFor="address">
            Address bar
          </label>
          <div className="relative group">
            <div
              className={`relative flex items-center h-12 rounded-2xl bg-slate-950/80 border transition-all duration-300 ${
                secure
                  ? 'border-success/20 focus-within:border-success/40 shadow-[0_0_20px_rgba(34,197,94,0.05)]'
                  : 'border-white/5 focus-within:border-warning/40 shadow-inner'
              }`}
            >
              <div className="flex items-center gap-2 pl-4 pr-3 shrink-0 border-r border-white/5 mr-3">
                <div className={`h-2 w-2 rounded-full ${secure ? 'bg-success animate-pulse' : 'bg-warning'}`} />
                <span
                  className={`text-[10px] font-bold uppercase tracking-widest ${secure ? 'text-success' : 'text-warning'}`}
                >
                  {secure ? 'Encrypted' : 'Insecure'}
                </span>
              </div>

              <input
                id="address"
                ref={inputRef}
                value={input}
                onChange={(e) => handleChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  setEditing(true)
                  if (input) {
                    setSuggestions(buildSuggestions(input))
                    inputRef.current?.select()
                  }
                }}
                onBlur={() =>
                  setTimeout(() => {
                    setSuggestions([])
                    setActiveIndex(null)
                    setEditing(false)
                  }, 150)
                }
                className="flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-600 font-medium"
                placeholder="Search or enter secure URL..."
                aria-autocomplete="list"
                aria-controls="omnibox-list"
                aria-expanded={suggestions.length > 0}
              />

              <div className="flex items-center gap-2 pr-2 shrink-0">
                {activeTab?.loading && (
                  <span className="text-[10px] font-bold uppercase tracking-widest text-accent animate-pulse">Loading</span>
                )}
                <button
                  type="submit"
                  className="h-8 px-4 rounded-xl bg-slate-800 text-slate-300 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-700 transition-colors"
                >
                  Go
                </button>
              </div>
            </div>

            {suggestions.length > 0 && (
              <ul
                id="omnibox-list"
                role="listbox"
                aria-label="Suggestions"
                className="mt-2 w-full max-w-full rounded-xl overflow-hidden bg-slate-900 border border-white/10 shadow-lg"
              >
                {suggestions.map((s, idx) => (
                  <li
                    key={s}
                    role="option"
                    aria-selected={activeIndex === idx}
                    onMouseDown={(ev) => {
                      ev.preventDefault()
                      if (s.startsWith('🔎')) commit(s.split(': ').slice(1).join(': '))
                      else commit(s)
                    }}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`cursor-pointer px-4 py-3 text-sm truncate ${
                      activeIndex === idx ? 'bg-slate-800 text-slate-100' : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </form>

        <div className="flex items-center gap-3 px-2">
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/40 border border-white/5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Shield</span>
            <span className={`text-xs font-mono ${adblockEnabled ? 'text-success' : 'text-warning'}`}>
              {adblockEnabled ? 'ACTIVE' : 'OFF'}
            </span>
          </div>
          <button
            onClick={onOpenSettings}
            aria-label="Open settings"
            className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-900/50 border border-white/5 text-slate-400 hover:text-accent hover:border-accent/20 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  )
}

