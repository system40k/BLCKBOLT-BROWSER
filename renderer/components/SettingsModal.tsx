import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from './ThemeProvider'

interface SettingsTab {
  id: string
  label: string
  icon: string
}

const tabs: SettingsTab[] = [
  { id: 'general', label: 'General', icon: '⚙️' },
  { id: 'privacy', label: 'Privacy', icon: '🔐' },
  { id: 'dns', label: 'DNS', icon: '🌐' },
  { id: 'appearance', label: 'Appearance', icon: '🎨' },
  { id: 'shortcuts', label: 'Keyboard', icon: '⌨️' },
  { id: 'about', label: 'About', icon: 'ℹ️' },
]

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

interface DnsResolver {
  id: string
  name: string
  doh: string
  dot: string
  privacy: string
}

type SettingsShape = Record<string, any>

const ACCENT_COLORS = ['#7c3aed', '#8b5cf6', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444']

function Toggle({
  label,
  hint,
  value,
  onChange,
}: {
  label: string
  hint?: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate-800/50 p-3">
      <div>
        <label className="text-sm font-medium text-slate-300">{label}</label>
        {hint && <p className="text-xs text-slate-500 mt-0.5">{hint}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          value ? 'bg-accent' : 'bg-slate-700'
        }`}
        role="switch"
        aria-checked={value}
        aria-label={label}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            value ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  )
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState('general')
  const { theme, setTheme } = useTheme()
  const [loaded, setLoaded] = useState<SettingsShape | null>(null)
  const [settings, setSettings] = useState<SettingsShape>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [resolvers, setResolvers] = useState<DnsResolver[]>([])
  const [currentResolver, setCurrentResolver] = useState<any>(null)
  const [testingResolver, setTestingResolver] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, any>>({})

  const api = (window as any).blckboltAPI

  const loadSettings = useCallback(async () => {
    if (!api || !api.invoke) {
      setLoaded({})
      setSettings({})
      return
    }
    try {
      const s = await api.invoke('settings-get')
      setLoaded(s || {})
      setSettings(s || {})
    } catch (e) {
      console.error('Failed to load settings:', e)
      setLoaded({})
      setSettings({})
    }
  }, [api])

  useEffect(() => {
    if (isOpen) {
      setSaved(false)
      setActiveTab('general')
      loadSettings()
      // Load DoH/DoT resolvers on open.
      if (api && api.invoke) {
        Promise.all([api.invoke('doh-get-resolvers'), api.invoke('doh-get-current')])
          .then(([list, current]) => {
            setResolvers(list || [])
            setCurrentResolver(current)
          })
          .catch((e) => console.error('Failed to load DNS resolvers:', e))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const update = (patch: SettingsShape) => setSettings((s) => ({ ...s, ...patch }))

  const handleThemeChange = (t: 'dark' | 'light' | 'system') => {
    setTheme(t)
    update({ theme: t })
  }

  const handleSetResolver = async (resolverId: string) => {
    if (!api || !api.invoke) return
    try {
      const result = await api.invoke('doh-set-resolver', {
        resolverId,
        dohEnabled: true,
        dotEnabled: false,
      })
      setCurrentResolver(result)
    } catch (e) {
      console.error('Failed to set resolver:', e)
    }
  }

  const handleTestResolver = async (resolverId: string) => {
    if (!api || !api.invoke) return
    setTestingResolver(resolverId)
    try {
      const result = await api.invoke('doh-test-resolver', resolverId)
      setTestResults((prev) => ({ ...prev, [resolverId]: result }))
    } catch (e: any) {
      setTestResults((prev) => ({ ...prev, [resolverId]: { success: false, error: e.message } }))
    } finally {
      setTestingResolver(null)
    }
  }

  const handleSave = async () => {
    if (!api || !api.invoke) {
      onClose()
      return
    }
    setSaving(true)
    try {
      // Only send the diff so unrelated settings stay untouched.
      const diff: SettingsShape = {}
      for (const key of Object.keys(settings)) {
        if (loaded && loaded[key] !== settings[key]) diff[key] = settings[key]
      }
      if (Object.keys(diff).length > 0) {
        await api.invoke('settings-set', diff)
      }
      setSaved(true)
      setTimeout(onClose, 350)
    } catch (e) {
      console.error('Failed to save settings:', e)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const inputCls =
    'w-full rounded-2xl bg-slate-800 border border-white/10 px-4 py-2.5 text-sm text-slate-100 focus:ring-2 focus:ring-accent focus:outline-none placeholder:text-slate-600'

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
        role="presentation"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3 }}
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-3xl md:rounded-3xl md:border md:border-white/10 md:shadow-soft bg-slate-900 flex flex-col md:max-h-[90vh] overflow-hidden"
        >
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div>
              <h2 className="text-2xl font-bold text-slate-100">Settings</h2>
              <p className="text-xs text-slate-500 mt-0.5">Advanced privacy configuration</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 hover:bg-slate-800 transition focus:ring-2 focus:ring-accent focus:outline-none"
              aria-label="Close settings"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            <div className="hidden md:flex flex-col w-48 border-r border-white/10 bg-slate-950/50 overflow-y-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-3 px-4 py-3 text-left text-sm transition focus:ring-2 focus:ring-inset focus:ring-accent focus:outline-none ${
                    activeTab === tab.id
                      ? 'bg-slate-800 text-slate-100 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                  aria-selected={activeTab === tab.id}
                  role="tab"
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <AnimatePresence mode="wait">
                {activeTab === 'general' && (
                  <motion.div
                    key="general"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <h3 className="text-xl font-semibold text-slate-100">General</h3>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Default Search Engine</label>
                      <select
                        value={settings.defaultSearchEngine || 'duckduckgo'}
                        onChange={(e) => update({ defaultSearchEngine: e.target.value })}
                        className={inputCls}
                      >
                        <option value="duckduckgo">DuckDuckGo (privacy default)</option>
                        <option value="brave">Brave Search</option>
                        <option value="startpage">StartPage</option>
                        <option value="google">Google</option>
                        <option value="bing">Bing</option>
                        <option value="custom">Custom…</option>
                      </select>
                    </div>
                    {settings.defaultSearchEngine === 'custom' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Custom Search URL <span className="text-slate-500">(use {'{q}'} as query placeholder)</span>
                        </label>
                        <input
                          type="text"
                          value={settings.customSearchUrl || ''}
                          onChange={(e) => update({ customSearchUrl: e.target.value })}
                          placeholder="https://example.com/search?q={q}"
                          className={inputCls}
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Home Page</label>
                      <input
                        type="text"
                        value={settings.homePage || ''}
                        onChange={(e) => update({ homePage: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                    <Toggle
                      label="Auto-Update"
                      hint="Automatically download new releases in the background"
                      value={!!settings.autoUpdate}
                      onChange={(v) => update({ autoUpdate: v })}
                    />
                  </motion.div>
                )}

                {activeTab === 'privacy' && (
                  <motion.div
                    key="privacy"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <h3 className="text-xl font-semibold text-slate-100">Privacy & Protection</h3>
                    <Toggle
                      label="Ad & Tracker Blocker"
                      hint="Blocks ads, trackers and analytics scripts"
                      value={!!settings.adblockEnabled}
                      onChange={(v) => update({ adblockEnabled: v })}
                    />
                    <Toggle
                      label="Canvas Fingerprinting Shield"
                      hint="Noise-injects canvas reads to defeat fingerprinting"
                      value={!!settings.canvasBlocking}
                      onChange={(v) => update({ canvasBlocking: v })}
                    />
                    <Toggle
                      label="WebRTC Leak Protection"
                      hint="Disables non-proxied UDP so local IPs stay hidden"
                      value={!!settings.blockWebRtc}
                      onChange={(v) => update({ blockWebRtc: v })}
                    />
                    <Toggle
                      label="Block Third-Party Cookies"
                      hint="Strips cookies on cross-site requests"
                      value={!!settings.blockThirdPartyCookies}
                      onChange={(v) => update({ blockThirdPartyCookies: v })}
                    />
                    <Toggle
                      label="Send Do Not Track Signal"
                      hint="Adds a DNT: 1 header to every request"
                      value={!!settings.dntHeader}
                      onChange={(v) => update({ dntHeader: v })}
                    />
                    <Toggle
                      label="Randomize Fingerprint on Start"
                      hint="New canvas/WebGL identity each launch"
                      value={!!settings.fingerprintRandomizeOnStart}
                      onChange={(v) => update({ fingerprintRandomizeOnStart: v })}
                    />
                    <Toggle
                      label="Clear Cache on Exit"
                      value={!!settings.clearCacheOnExit}
                      onChange={(v) => update({ clearCacheOnExit: v })}
                    />
                    <Toggle
                      label="Clear Cookies on Exit"
                      hint="Session-only cookie jar — nothing persists"
                      value={!!settings.clearCookiesOnExit}
                      onChange={(v) => update({ clearCookiesOnExit: v })}
                    />
                  </motion.div>
                )}

                {activeTab === 'dns' && (
                  <motion.div
                    key="dns"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <h3 className="text-xl font-semibold text-slate-100">DNS over HTTPS/TLS</h3>
                    <p className="text-sm text-slate-400 mb-4">
                      Encrypted DNS prevents your ISP from seeing which websites you visit.
                    </p>
                    <div className="space-y-3">
                      {resolvers.length === 0 && (
                        <p className="text-sm text-slate-500">No resolvers available.</p>
                      )}
                      {resolvers.map((resolver) => (
                        <div
                          key={resolver.id}
                          className={`rounded-2xl border-2 p-4 transition cursor-pointer ${
                            currentResolver?.id === resolver.id
                              ? 'border-accent bg-accent/10'
                              : 'border-white/10 hover:border-white/20'
                          }`}
                          onClick={() => handleSetResolver(resolver.id)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium text-slate-100">{resolver.name}</p>
                              <p className="text-xs text-slate-400 mt-1">{resolver.privacy}</p>
                            </div>
                            {currentResolver?.id === resolver.id && <span className="text-lg">✓</span>}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleTestResolver(resolver.id)
                            }}
                            disabled={testingResolver === resolver.id}
                            className="mt-3 text-xs px-3 py-1 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 transition disabled:opacity-50"
                          >
                            {testingResolver === resolver.id ? 'Testing…' : 'Test Connection'}
                          </button>
                          {testResults[resolver.id] && (
                            <p
                              className={`mt-2 text-xs ${
                                testResults[resolver.id].success ? 'text-green-400' : 'text-orange-400'
                              }`}
                            >
                              {testResults[resolver.id].success
                                ? `✓ ${testResults[resolver.id].latency}ms`
                                : `⚠ ${testResults[resolver.id].error}`}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {activeTab === 'appearance' && (
                  <motion.div
                    key="appearance"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <h3 className="text-xl font-semibold text-slate-100">Appearance</h3>
                    <div>
                      <p className="text-sm font-medium text-slate-300 mb-3">Theme</p>
                      <div className="grid grid-cols-3 gap-3">
                        {(['dark', 'light', 'system'] as const).map((t) => (
                          <button
                            key={t}
                            onClick={() => handleThemeChange(t)}
                            className={`rounded-2xl border-2 px-4 py-3 text-sm font-medium transition ${
                              (settings.theme || theme) === t
                                ? 'border-accent bg-accent/10 text-slate-100'
                                : 'border-white/10 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-3">Accent Color</label>
                      <div className="grid grid-cols-6 gap-2">
                        {ACCENT_COLORS.map((color) => (
                          <button
                            key={color}
                            onClick={() => update({ accent: color })}
                            className={`h-10 rounded-xl border-2 transition ${
                              (settings.accent || '#7c3aed') === color
                                ? 'border-white ring-2 ring-white/30 scale-105'
                                : 'border-white/20 hover:border-white/40'
                            }`}
                            style={{ backgroundColor: color }}
                            aria-label={`Select color ${color}`}
                          />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'shortcuts' && (
                  <motion.div
                    key="shortcuts"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <h3 className="text-xl font-semibold text-slate-100">Keyboard Shortcuts</h3>
                    <div className="space-y-2">
                      {[
                        ['Ctrl/Cmd + T', 'New tab'],
                        ['Ctrl/Cmd + W', 'Close current tab'],
                        ['Ctrl/Cmd + Tab', 'Next tab'],
                        ['Ctrl/Cmd + Shift + Tab', 'Previous tab'],
                        ['Ctrl/Cmd + L', 'Focus address bar'],
                        ['Ctrl/Cmd + R / F5', 'Reload current tab'],
                        ['Alt + ← / →', 'Back / Forward'],
                      ].map(([key, desc]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between rounded-2xl bg-slate-800/50 px-4 py-3"
                        >
                          <span className="text-sm text-slate-300">{desc}</span>
                          <kbd className="rounded-lg bg-slate-950 border border-white/10 px-3 py-1 text-xs font-mono text-accentSoft">
                            {key}
                          </kbd>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {activeTab === 'about' && (
                  <motion.div
                    key="about"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <h3 className="text-xl font-semibold text-slate-100">About BLCKBOLT</h3>
                    <div className="space-y-3 text-sm text-slate-400">
                      <p>
                        Version: <span className="text-slate-200 font-mono">1.0.0</span>
                      </p>
                      <p>Built with Next.js, Electron, and Framer Motion</p>
                      <p className="pt-4">
                        BLCKBOLT is a privacy-first browser for developers and power users. Your data is yours.
                      </p>
                      <p className="text-xs text-slate-500">
                        Tor · OpenVPN · Adblock · Canvas/WebRTC shield · DNS over HTTPS/TLS · DPI detection
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="border-t border-white/10 px-6 py-4 flex justify-end gap-3 items-center">
            {saved && <span className="mr-auto text-sm text-success">✓ Saved</span>}
            <button
              onClick={onClose}
              className="rounded-2xl px-6 py-2 text-slate-200 hover:bg-slate-800 transition focus:ring-2 focus:ring-accent focus:outline-none"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-2xl bg-accent px-6 py-2 font-semibold text-slate-950 hover:bg-accentSoft transition focus:ring-2 focus:ring-accent/50 focus:outline-none disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}


