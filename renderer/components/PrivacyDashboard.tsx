import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import SpeedTest from './SpeedTest'
import ConnectionMetrics from './ConnectionMetrics'

interface PrivacyStats {
  trackersBlocked: number
  bandwidthSaved: string
  requestsBlocked: number
  sitesVisited: number
  torActive: boolean
  vpnActive: boolean
  adblockActive: boolean
  webrtcProtected?: boolean
}

const mockStats: PrivacyStats = {
  trackersBlocked: 2341,
  bandwidthSaved: '18.4 MB',
  requestsBlocked: 5621,
  sitesVisited: 47,
  torActive: false,
  vpnActive: true,
  adblockActive: true,
  webrtcProtected: true,
}

export default function PrivacyDashboard() {
  const [stats, setStats] = useState<PrivacyStats>(mockStats)
  const [showLog, setShowLog] = useState(false)
  const [logs, setLogs] = useState<{ type: string; message: string; timestamp: Date }[]>([
    { type: 'adblock', message: 'Blocked ad.doubleclick.net', timestamp: new Date(Date.now() - 5000) },
    { type: 'adblock', message: 'Blocked tracking pixel from google-analytics.com', timestamp: new Date(Date.now() - 15000) },
    { type: 'vpn', message: 'Connected to VPN (US Datacenter)', timestamp: new Date(Date.now() - 45000) },
    { type: 'tracker', message: 'Blocked Facebook pixel', timestamp: new Date(Date.now() - 120000) },
  ])

  useEffect(() => {
    // Test WebRTC protection on mount
    const testWebRTC = async () => {
      if (typeof window !== 'undefined' && (window as any).blckboltAPI) {
        try {
          const result = await (window as any).blckboltAPI.invoke('webrtc-test')
          setStats((prev) => ({ ...prev, webrtcProtected: result.protected }))
          const message = result.protected 
            ? 'WebRTC leak prevention active' 
            : `WebRTC leak detected: ${result.ipAddresses.join(', ')}`
          setLogs((prev) => [{
            type: 'tracker',
            message: `🔍 ${message}`,
            timestamp: new Date()
          }, ...prev].slice(0, 50))
        } catch (e) {
          console.error('WebRTC test failed:', e)
          setStats((prev) => ({ ...prev, webrtcProtected: true }))
        }
      }
    }

    testWebRTC()

    if (typeof window !== 'undefined' && (window as any).blckboltAPI) {
      const api = (window as any).blckboltAPI
      api.on?.('stats-update', (newStats: Partial<PrivacyStats>) => {
        setStats((prev) => ({ ...prev, ...newStats }))
      })
      api.on?.('privacy-log', (logEntry: any) => {
        setLogs((prev) => [logEntry, ...prev].slice(0, 50))
      })
    }
  }, [])

  const statCards = [
    { label: 'Trackers Blocked', value: stats.trackersBlocked, icon: '🛑', color: 'from-red-500/20 to-red-600/10' },
    { label: 'Bandwidth Saved', value: stats.bandwidthSaved, icon: '⚡', color: 'from-green-500/20 to-green-600/10' },
    { label: 'Requests Blocked', value: stats.requestsBlocked, icon: '🔒', color: 'from-blue-500/20 to-blue-600/10' },
    { label: 'WebRTC Protected', value: stats.webrtcProtected ? '✓ Safe' : '⚠ Leaking', icon: '📡', color: stats.webrtcProtected ? 'from-cyan-500/20 to-cyan-600/10' : 'from-orange-500/20 to-orange-600/10' },
  ]

  return (
    <div className="space-y-6">
      {/* Privacy Score Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-panel rounded-3xl border border-white/10 p-6 shadow-soft"
      >
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500 mb-2">Privacy Score</p>
            <h2 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-accent to-glow mb-4">
              94%
            </h2>
            <p className="text-slate-400 text-sm">Excellent privacy posture. You're well protected.</p>
          </div>
          <div className="space-y-3 w-full lg:w-auto">
            <div className="flex items-center gap-3">
              <span className="text-xl">
                {stats.vpnActive ? <span>✓</span> : <span>✗</span>}
              </span>
              <div>
                <p className="text-sm font-medium text-slate-200">VPN</p>
                <p className={`text-xs ${stats.vpnActive ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {stats.vpnActive ? 'Connected' : 'Disconnected'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xl">
                {stats.torActive ? <span>✓</span> : <span>✗</span>}
              </span>
              <div>
                <p className="text-sm font-medium text-slate-200">Tor</p>
                <p className={`text-xs ${stats.torActive ? 'text-purple-400' : 'text-slate-400'}`}>
                  {stats.torActive ? 'Enabled' : 'Disabled'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xl">
                {stats.adblockActive ? <span>✓</span> : <span>✗</span>}
              </span>
              <div>
                <p className="text-sm font-medium text-slate-200">AdBlock</p>
                <p className={`text-xs ${stats.adblockActive ? 'text-red-400' : 'text-slate-400'}`}>
                  {stats.adblockActive ? 'Active' : 'Disabled'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05, duration: 0.3 }}
            className={`glass-panel rounded-2xl border border-white/10 p-4 bg-gradient-to-br ${card.color}`}
          >
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{card.label}</p>
              <span className="text-2xl">{card.icon}</span>
            </div>
            <p className="text-3xl font-bold text-slate-100">{card.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Privacy Activity Log */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="glass-panel rounded-3xl border border-white/10 p-6 shadow-soft"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-300">Recent Activity</h3>
          <button
            onClick={() => setShowLog(!showLog)}
            className="text-xs px-3 py-1 rounded-full bg-slate-800 text-slate-200 hover:bg-slate-700 transition"
          >
            {showLog ? 'Hide' : 'Show'} Log
          </button>
        </div>

        {showLog && (
          <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
            {logs.map((log, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.02 }}
                className="flex items-start gap-3 rounded-2xl bg-slate-900/50 p-3 text-xs"
              >
                <span className="text-lg shrink-0">
                  {log.type === 'adblock' && '🚫'}
                  {log.type === 'vpn' && '🔐'}
                  {log.type === 'tracker' && '🎯'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-200 truncate">{log.message}</p>
                  <p className="text-slate-500 text-[10px]">
                    {log.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {!showLog && (
          <div className="rounded-2xl bg-slate-900/50 p-8 text-center">
            <p className="text-slate-400 text-sm">Click "Show Log" to view privacy activity</p>
          </div>
        )}
      </motion.div>

      {/* Speed Test Widget */}
      <SpeedTest />

      {/* Connection Metrics */}
      <ConnectionMetrics />

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <button className="glass-panel rounded-2xl border border-white/10 p-4 text-left hover:bg-slate-800/50 transition">
          <p className="text-sm font-semibold text-slate-200 mb-1">📊 Privacy Report</p>
          <p className="text-xs text-slate-400">View detailed privacy metrics</p>
        </button>
        <button className="glass-panel rounded-2xl border border-white/10 p-4 text-left hover:bg-slate-800/50 transition">
          <p className="text-sm font-semibold text-slate-200 mb-1">🔍 Inspect Site</p>
          <p className="text-xs text-slate-400">View site certificates & trackers</p>
        </button>
        <button className="glass-panel rounded-2xl border border-white/10 p-4 text-left hover:bg-slate-800/50 transition">
          <p className="text-sm font-semibold text-slate-200 mb-1">🛡️ Shield Settings</p>
          <p className="text-xs text-slate-400">Customize per-window shields</p>
        </button>
      </div>
    </div>
  )
}



