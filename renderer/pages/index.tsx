import BrowserHeader from '../components/BrowserHeader'
import TabBar from '../components/TabBar'
import SidePanel from '../components/SidePanel'
import WebView from '../components/WebView'
import SettingsModal from '../components/SettingsModal'
import SplashScreen from '../components/SplashScreen'
import { useEffect, useRef, useState, useCallback } from 'react'
import { loadTabs, saveTabs, createTabId, DEFAULT_HOME, isSecureUrl, hostOf } from '../lib/browser'
import type { TabState } from '../lib/browser'

type SettingsShape = Record<string, any>

export default function Home() {
  const [showSplash, setShowSplash] = useState(true)
  const [tabs, setTabs] = useState<TabState[]>([])
  const [activeTabId, setActiveTabId] = useState<string>('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settings, setSettings] = useState<SettingsShape>({})
  const webviewRefs = useRef<Record<string, any>>({})
  const tabsRef = useRef<TabState[]>([])
  const activeRef = useRef<string>('')

  tabsRef.current = tabs
  activeRef.current = activeTabId

  const api = typeof window !== 'undefined' ? (window as any).blckboltAPI : undefined

  // --- Tab actions ---------------------------------------------------------
  const updateTab = useCallback((id: string, patch: Partial<TabState>) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }, [])

  const newTab = useCallback(
    (url?: string) => {
      const target = url || settings.homePage || DEFAULT_HOME
      const tab: TabState = {
        id: createTabId(),
        title: hostOf(target),
        url: target,
        loading: false,
        canGoBack: false,
        canGoForward: false,
        secure: isSecureUrl(target),
      }
      setTabs((prev) => [...prev, tab])
      setActiveTabId(tab.id)
    },
    [settings.homePage],
  )

  const closeTab = useCallback((id: string) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === id)
      const next = prev.filter((t) => t.id !== id)
      if (next.length === 0) {
        const fresh: TabState = {
          id: createTabId(),
          title: 'New Tab',
          url: DEFAULT_HOME,
          loading: false,
          canGoBack: false,
          canGoForward: false,
          secure: true,
        }
        setActiveTabId(fresh.id)
        return [fresh]
      }
      setActiveTabId((cur) => {
        if (cur !== id) return cur
        const fallback = next[Math.max(0, idx - 1)]
        return fallback.id
      })
      return next
    })
  }, [])

  const selectTab = useCallback((id: string) => setActiveTabId(id), [])

  const reorderTabs = useCallback((orderedIds: string[]) => {
    setTabs((prev) => {
      const byId = new Map(prev.map((t) => [t.id, t]))
      const ordered = orderedIds.map((id) => byId.get(id)).filter(Boolean) as TabState[]
      const rest = prev.filter((t) => !orderedIds.includes(t.id))
      return [...ordered, ...rest]
    })
  }, [])

  const navigateTab = useCallback((id: string, raw: string) => {
    const el = webviewRefs.current[id]
    const target = raw.startsWith('http') || raw.startsWith('about:') || raw.startsWith('blckbolt://') ? raw : `https://${raw}`
    updateTab(id, { url: target, loading: true, title: hostOf(target) })
    if (el && typeof el.loadURL === 'function') {
      // loadURL always navigates, even when src is unchanged (e.g. same URL).
      el.loadURL(target).catch(() => {})
    } else if (el) {
      el.src = target
    }
  }, [updateTab])

  const activeWebview = useCallback(
    () => webviewRefs.current[activeRef.current],
    [],
  )

  // --- Init ----------------------------------------------------------------
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000)
    return () => clearTimeout(timer)
  }, [])

  // Restore session + load settings + wire IPC.
  useEffect(() => {
    const persisted = loadTabs()
    if (persisted.length > 0) {
      const restored: TabState[] = persisted.map((p) => ({
        id: p.id,
        title: p.title || hostOf(p.url),
        url: p.url,
        loading: false,
        canGoBack: false,
        canGoForward: false,
        secure: isSecureUrl(p.url),
        group: p.group,
      }))
      setTabs(restored)
      setActiveTabId(restored[0].id)
    } else {
      setTabs([
        {
          id: createTabId(),
          title: 'New Tab',
          url: DEFAULT_HOME,
          loading: false,
          canGoBack: false,
          canGoForward: false,
          secure: true,
        },
      ])
      setActiveTabId('')
    }

    if (api && api.invoke) {
      api
        .invoke('settings-get')
        .then((s: SettingsShape) => setSettings(s || {}))
        .catch(() => {})
    }

    if (api && api.on) {
      api.on('navigate', (url: string) => {
        if (typeof url === 'string' && url) {
          const id = activeRef.current
          if (id) {
            updateTab(id, { url, title: hostOf(url), loading: true, secure: isSecureUrl(url) })
            const el = webviewRefs.current[id]
            if (el && typeof el.loadURL === 'function') el.loadURL(url).catch(() => {})
          }
        }
      })
      api.on('protocol-url', (url: string) => {
        if (typeof url === 'string' && url) {
          const target = url.replace(/^blckbolt:\/\//, 'https://')
          const id = activeRef.current
          if (id) {
            updateTab(id, { url: target, title: hostOf(target), loading: true, secure: isSecureUrl(target) })
            const el = webviewRefs.current[id]
            if (el) el.src = target
          }
        }
      })
      api.on('settings-updated', (s: SettingsShape) => {
        if (s) setSettings(s)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Activate the first tab after restore.
  useEffect(() => {
    if (tabs.length > 0 && !activeTabId) setActiveTabId(tabs[0].id)
  }, [tabs, activeTabId])

  // Persist tab session (debounced).
  useEffect(() => {
    if (tabs.length === 0) return
    const h = setTimeout(() => saveTabs(tabs), 400)
    return () => clearTimeout(h)
  }, [tabs])

  // Apply accent from settings.
  useEffect(() => {
    if (settings.accent && typeof document !== 'undefined') {
      const root = document.documentElement
      root.style.setProperty('--accent', settings.accent)
      root.style.setProperty('--accent-soft', settings.accent)
    }
  }, [settings.accent])

  // --- Keyboard shortcuts ---------------------------------------------------
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes('mac')
      const mod = isMac ? e.metaKey : e.ctrlKey

      if (mod && e.key.toLowerCase() === 't' && !e.shiftKey) {
        e.preventDefault()
        newTab()
      } else if (mod && e.key.toLowerCase() === 'w') {
        e.preventDefault()
        if (activeRef.current) closeTab(activeRef.current)
      } else if (mod && e.key === 'Tab') {
        e.preventDefault()
        const list = tabsRef.current
        if (list.length < 2) return
        const idx = list.findIndex((t) => t.id === activeRef.current)
        const dir = e.shiftKey ? -1 : 1
        const next = list[(idx + dir + list.length) % list.length]
        setActiveTabId(next.id)
      } else if (e.key === 'F5' || (mod && e.key.toLowerCase() === 'r')) {
        e.preventDefault()
        const el = activeWebview()
        if (el && typeof el.reload === 'function') el.reload()
      } else if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault()
        const el = activeWebview()
        if (el && typeof el.goBack === 'function') el.goBack()
      } else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault()
        const el = activeWebview()
        if (el && typeof el.goForward === 'function') el.goForward()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [newTab, closeTab, activeWebview])

  if (showSplash) return <SplashScreen />

  return (
    <div className="page-shell min-h-screen text-slate-100 overflow-x-hidden">
      <div className="max-w-[2200px] mx-auto p-4 md:p-6 space-y-6">
        <div className="space-y-4">
          <TabBar
            tabs={tabs}
            activeTabId={activeTabId}
            onSelect={selectTab}
            onClose={closeTab}
            onNew={() => newTab()}
            onReorder={reorderTabs}
          />
          <BrowserHeader
            tabs={tabs}
            activeTabId={activeTabId}
            webviewRefs={webviewRefs}
            searchEngine={settings.defaultSearchEngine || 'duckduckgo'}
            customSearchUrl={settings.customSearchUrl}
            adblockEnabled={settings.adblockEnabled !== false}
            onNavigate={(url) => {
              if (activeTabId) navigateTab(activeTabId, url)
            }}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <SidePanel />
          <main className="flex-1 min-w-0 rounded-[2.5rem] glass-panel overflow-hidden browser-card border border-white/10 shadow-2xl relative">
            <WebView
              tabs={tabs}
              activeTabId={activeTabId}
              webviewRefs={webviewRefs}
              onTabUpdate={updateTab}
              onNewTab={newTab}
            />
            {/* Subtle glow for the main container */}
            <div className="absolute inset-0 pointer-events-none ring-1 ring-white/5 rounded-[2.5rem]" />
          </main>
        </div>
      </div>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}





