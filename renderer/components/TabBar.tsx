import React, { useState, useMemo, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { TabState } from '../lib/browser'

interface TabBarProps {
  tabs: TabState[]
  activeTabId: string
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onNew: () => void
  onReorder: (orderedIds: string[]) => void
}

export default function TabBar({ tabs, activeTabId, onSelect, onClose, onNew, onReorder }: TabBarProps) {
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showOverflow, setShowOverflow] = useState(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const filtered = useMemo(() => {
    if (!searchQuery) return tabs
    const q = searchQuery.toLowerCase()
    return tabs.filter((t) => t.title.toLowerCase().includes(q) || t.url.toLowerCase().includes(q))
  }, [tabs, searchQuery])

  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.dataTransfer.effectAllowed = 'move'
    setDragging(id)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>, dropId: string) => {
      e.preventDefault()
      if (dragging && dragging !== dropId) {
        const from = tabs.findIndex((t) => t.id === dragging)
        const to = tabs.findIndex((t) => t.id === dropId)
        if (from !== -1 && to !== -1) {
          const next = [...tabs]
          const [moved] = next.splice(from, 1)
          next.splice(to, 0, moved)
          onReorder(next.map((t) => t.id))
        }
      }
      setDragging(null)
      setDragOverId(null)
    },
    [dragging, tabs, onReorder],
  )

  const visibleTabs = tabs.slice(0, 8)
  const overflowTabs = tabs.slice(8)

  const renderTab = (tab: TabState, compact = false) => (
    <motion.div
      key={tab.id}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      draggable
      onDragStart={(e: any) => handleDragStart(e, tab.id)}
      onDragOver={(e: any) => {
        e.preventDefault()
        setDragOverId(tab.id)
      }}
      onDrop={(e: any) => handleDrop(e, tab.id)}
      onDragEnd={() => {
        setDragging(null)
        setDragOverId(null)
      }}
      onDragLeave={() => setDragOverId(null)}
      className={`group relative min-w-[140px] max-w-[210px] ${compact ? 'flex-1' : 'flex-1'} select-none ${
        dragging === tab.id ? 'opacity-40' : ''
      }`}
    >
      <div
        onClick={() => onSelect(tab.id)}
        className={`relative flex items-center h-10 px-3 transition-all duration-300 rounded-xl overflow-hidden border cursor-pointer ${
          tab.id === activeTabId
            ? 'bg-accent/10 border-accent/40 shadow-[0_0_15px_rgba(124,58,237,0.15)]'
            : 'bg-slate-900/40 border-white/5 hover:bg-slate-800/60 hover:border-white/10'
        } ${dragOverId === tab.id && dragging && dragging !== tab.id ? 'ring-2 ring-accent' : ''}`}
        role="tab"
        aria-selected={tab.id === activeTabId}
        title={tab.title}
      >
        {tab.id === activeTabId && (
          <motion.div
            layoutId="activeTabGlow"
            className="absolute inset-0 bg-gradient-to-r from-accent/20 to-transparent pointer-events-none"
          />
        )}

        <div className="flex items-center gap-2 overflow-hidden z-10 min-w-0">
          <span className="shrink-0 text-[10px] opacity-30 group-hover:opacity-60 transition-opacity cursor-move">⋮⋮</span>
          {tab.favicon ? (
            <img
              src={tab.favicon}
              alt=""
              className="h-4 w-4 rounded-sm shrink-0 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          ) : (
            <span
              className={`h-2 w-2 rounded-full shrink-0 ${tab.loading ? 'bg-accent animate-pulse' : 'bg-success/70'}`}
            />
          )}
          <span
            className={`text-sm font-medium truncate ${
              tab.id === activeTabId ? 'text-accentSoft' : 'text-slate-400 group-hover:text-slate-200'
            }`}
          >
            {tab.title || 'New Tab'}
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation()
            onClose(tab.id)
          }}
          aria-label={`Close ${tab.title || 'tab'}`}
          className={`shrink-0 ml-1.5 h-5 w-5 flex items-center justify-center rounded-md transition-all z-10 ${
            tab.id === activeTabId
              ? 'text-accentSoft hover:bg-accent/20'
              : 'text-slate-600 opacity-0 group-hover:opacity-100 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <span className="text-[10px] leading-none">✕</span>
        </button>
      </div>
    </motion.div>
  )

  return (
    <div className="glass-panel rounded-[2rem] border border-white/10 p-3 shadow-soft">
      <div className="mb-3 flex items-center gap-3 px-1">
        <div className="relative flex-1 group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-accent transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search open tabs...  (Ctrl+T new tab · Ctrl+W close)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl bg-slate-950/50 border border-white/5 pl-10 pr-4 py-2.5 text-xs text-slate-100 outline-none placeholder:text-slate-600 focus:border-accent/40 focus:ring-4 focus:ring-accent/5 transition-all"
          />
        </div>
        <button
          onClick={onNew}
          className="h-10 px-5 rounded-2xl bg-accent text-slate-950 text-xs font-bold uppercase tracking-wider hover:bg-accentSoft active:scale-95 transition-all shadow-lg shadow-accent/20"
        >
          + New Tab
        </button>
        {overflowTabs.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowOverflow((v) => !v)}
              className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
            >
              +{overflowTabs.length}
            </button>
            <AnimatePresence>
              {showOverflow && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-slate-900 border border-white/10 shadow-lg overflow-hidden z-50"
                >
                  <div className="max-h-72 overflow-y-auto">
                    {overflowTabs.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          onSelect(t.id)
                          setShowOverflow(false)
                        }}
                        className="flex w-full items-center justify-between gap-2 text-left px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 transition"
                      >
                        <span className="truncate">{t.title || 'New Tab'}</span>
                        <span
                          role="button"
                          aria-label={`Close ${t.title}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            onClose(t.id)
                          }}
                          className="shrink-0 h-5 w-5 flex items-center justify-center rounded-md text-slate-600 hover:text-slate-200 hover:bg-white/10"
                        >
                          ✕
                        </span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar"
        role="tablist"
        aria-label="Open tabs"
      >
        <AnimatePresence mode="popLayout">
          {(searchQuery ? filtered : visibleTabs).map((tab) => renderTab(tab))}
        </AnimatePresence>
      </div>
    </div>
  )
}


