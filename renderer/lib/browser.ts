// Shared browser logic: tab model, URL/search resolution, tab persistence.

export interface TabState {
  id: string
  title: string
  url: string
  loading: boolean
  canGoBack: boolean
  canGoForward: boolean
  secure: boolean
  favicon?: string
  group?: string
}

export const DEFAULT_HOME = 'https://example.com'

export const SEARCH_ENGINES: Record<string, { name: string; searchUrl: (q: string) => string; home: string }> = {
  duckduckgo: {
    name: 'DuckDuckGo',
    searchUrl: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
    home: 'https://duckduckgo.com',
  },
  brave: {
    name: 'Brave Search',
    searchUrl: (q) => `https://search.brave.com/search?q=${encodeURIComponent(q)}`,
    home: 'https://search.brave.com',
  },
  startpage: {
    name: 'StartPage',
    searchUrl: (q) => `https://www.startpage.com/sp/search?query=${encodeURIComponent(q)}`,
    home: 'https://www.startpage.com',
  },
  google: {
    name: 'Google',
    searchUrl: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
    home: 'https://www.google.com',
  },
  bing: {
    name: 'Bing',
    searchUrl: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}`,
    home: 'https://www.bing.com',
  },
}

export function isLikelyUrl(input: string): boolean {
  const trimmed = input.trim()
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return true
  if (/^about:/i.test(trimmed)) return true
  if (/^data:/i.test(trimmed)) return true
  if (/^file:/i.test(trimmed)) return true
  if (/^blckbolt:\/\//i.test(trimmed)) return true
  // A bare domain or localhost (must contain a dot or be localhost / an IP).
  if (/^localhost(:\d+)?([/?#]|$)/i.test(trimmed)) return true
  if (/^(\d{1,3}\.){3}\d{1,3}(:\d+)?([/?#]|$)/.test(trimmed)) return true
  if (/^[\w-]+(\.[\w-]+)+([/?#].*)?$/.test(trimmed)) return true
  return false
}

export function normalizeUrl(input: string, searchEngine: string, customSearchUrl?: string): string {
  const trimmed = input.trim()
  if (!trimmed) return DEFAULT_HOME
  if (isLikelyUrl(trimmed)) {
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed
    if (/^(about|data|file|blckbolt):/i.test(trimmed)) return trimmed
    return `https://${trimmed}`
  }
  const engine = SEARCH_ENGINES[searchEngine]
  if (searchEngine === 'custom' && customSearchUrl) {
    const withQuery = customSearchUrl.includes('{q}')
      ? customSearchUrl.replace(/\{q\}/g, encodeURIComponent(trimmed))
      : `${customSearchUrl}${encodeURIComponent(trimmed)}`
    return withQuery
  }
  if (engine) return engine.searchUrl(trimmed)
  return SEARCH_ENGINES.duckduckgo.searchUrl(trimmed)
}

export function isSecureUrl(url: string): boolean {
  if (!url) return true
  if (url.startsWith('https://')) return true
  if (url.startsWith('about:') || url.startsWith('blckbolt://')) return true
  if (url.startsWith('file://')) return true
  return false
}

export function hostOf(url: string): string {
  try {
    return new URL(url).host || url
  } catch {
    return url || 'New Tab'
  }
}

const TABS_KEY = 'bb_tabs'

interface PersistedTab {
  id: string
  title: string
  url: string
  group?: string
}

export function loadTabs(): PersistedTab[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(TABS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((t) => t && typeof t.id === 'string' && typeof t.url === 'string')
      .slice(0, 24)
  } catch {
    return []
  }
}

export function saveTabs(tabs: TabState[]): void {
  if (typeof window === 'undefined') return
  try {
    const slim: PersistedTab[] = tabs.map((t) => ({
      id: t.id,
      title: t.title || hostOf(t.url),
      url: t.url,
      group: t.group,
    }))
    window.localStorage.setItem(TABS_KEY, JSON.stringify(slim))
  } catch {
    /* storage may be unavailable in some embedded contexts */
  }
}

export function createTabId(): string {
  return `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}



