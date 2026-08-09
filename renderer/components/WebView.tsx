import React from 'react'
import type { TabState } from '../lib/browser'

interface WebViewProps {
  tabs: TabState[]
  activeTabId: string
  webviewRefs: React.MutableRefObject<Record<string, any>>
  onTabUpdate: (id: string, patch: Partial<TabState>) => void
  onNewTab: (url?: string) => void
}

function attachListeners(
  el: any,
  tabId: string,
  handlers: { onTabUpdate: (id: string, patch: Partial<TabState>) => void; onNewTab: (url?: string) => void },
) {
  const { onTabUpdate, onNewTab } = handlers

  const handleNavigate = (e: any) => {
    if (!e || typeof e.url !== 'string') return
    onTabUpdate(tabId, {
      url: e.url,
      secure: e.url.startsWith('https://') || e.url.startsWith('about:'),
      canGoBack: !!el.canGoBack?.(),
      canGoForward: !!el.canGoForward?.(),
    })
  }

  const handleTitle = (e: any) => {
    if (typeof e?.title === 'string') onTabUpdate(tabId, { title: e.title })
  }

  const handleLoading = () => onTabUpdate(tabId, { loading: true })
  const handleLoaded = () => {
    onTabUpdate(tabId, {
      loading: false,
      canGoBack: !!el.canGoBack?.(),
      canGoForward: !!el.canGoForward?.(),
    })
  }

  const handleFail = (e: any) => {
    if (e?.isMainFrame && e?.errorCode && e.errorCode !== -3) {
      onTabUpdate(tabId, {
        loading: false,
        title: e.errorDescription || 'Failed to load',
        canGoBack: !!el.canGoBack?.(),
        canGoForward: !!el.canGoForward?.(),
      })
    } else {
      onTabUpdate(tabId, { loading: false })
    }
  }

  const handleNewWindow = (e: any) => {
    e?.preventDefault?.()
    if (e?.url) onNewTab(e.url)
  }

  const handleFavicon = (e: any) => {
    const favs: string[] = e?.favicons || []
    const fav = favs.find((f) => f.startsWith('https://')) || favs[0]
    if (fav) onTabUpdate(tabId, { favicon: fav })
  }

  el.addEventListener('did-navigate', handleNavigate)
  el.addEventListener('did-navigate-in-page', handleNavigate)
  el.addEventListener('page-title-updated', handleTitle)
  el.addEventListener('did-start-loading', handleLoading)
  el.addEventListener('did-stop-loading', handleLoaded)
  el.addEventListener('did-fail-load', handleFail)
  el.addEventListener('new-window', handleNewWindow)
  el.addEventListener('page-favicon-updated', handleFavicon)

  return () => {
    el.removeEventListener('did-navigate', handleNavigate)
    el.removeEventListener('did-navigate-in-page', handleNavigate)
    el.removeEventListener('page-title-updated', handleTitle)
    el.removeEventListener('did-start-loading', handleLoading)
    el.removeEventListener('did-stop-loading', handleLoaded)
    el.removeEventListener('did-fail-load', handleFail)
    el.removeEventListener('new-window', handleNewWindow)
    el.removeEventListener('page-favicon-updated', handleFavicon)
  }
}

export default function WebView({ tabs, activeTabId, webviewRefs, onTabUpdate, onNewTab }: WebViewProps) {
  return (
    <div className="relative h-full bg-slate-950 flex flex-col">
      <div className="flex-1 relative">
        {tabs.map((tab) => {
          const active = tab.id === activeTabId
          return (
            <div
              key={tab.id}
              className="absolute inset-0 bg-slate-950"
              style={{ display: active ? 'block' : 'none', visibility: active ? 'visible' : 'hidden' }}
            >
              {/* @ts-ignore - <webview> is an Electron custom element */}
              <webview
                ref={(el: any) => {
                  if (!el) {
                    delete webviewRefs.current[tab.id]
                    return
                  }
                  if (webviewRefs.current[tab.id] !== el) {
                    webviewRefs.current[tab.id] = el
                    attachListeners(el, tab.id, { onTabUpdate, onNewTab })
                  }
                }}
                src={tab.url}
                className="h-full w-full bg-slate-950"
              />
            </div>
          )
        })}

        {tabs.find((t) => t.id === activeTabId)?.loading && (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 overflow-hidden">
            <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-accent to-transparent animate-loading-bar" />
          </div>
        )}
      </div>

      <div className="h-6 bg-slate-900/80 border-t border-white/5 flex items-center px-4 justify-between text-[10px] font-medium text-slate-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-success" />
            READY
          </span>
          <span className="opacity-40">|</span>
          <span>WEBRTC: POLICY ENFORCED</span>
          <span className="opacity-40">|</span>
          <span>{tabs.length} TAB{tabs.length === 1 ? '' : 'S'}</span>
        </div>
        <div className="uppercase tracking-widest opacity-60">Security Policy Active</div>
      </div>
    </div>
  )
}
