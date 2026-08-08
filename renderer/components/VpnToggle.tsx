import React, { useState, useEffect } from 'react';

const VpnToggle = () => {
  const [enabled, setEnabled] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [status, setStatus] = useState('disconnected')

  useEffect(() => {
    if (window.blckboltAPI) {
      window.blckboltAPI.on('vpn-status', (s: string) => setStatus(s))
      window.blckboltAPI.on('vpn-log', (log: string) => setLogs((prev) => [...prev, log]))
    }
  }, [])

  const handleToggle = () => {
    if (!window.blckboltAPI) return
    if (enabled) {
      window.blckboltAPI.send('vpn-disconnect')
    } else {
      window.blckboltAPI.send('vpn-connect')
    }
    setEnabled(!enabled)
  }

  return (
    <div className="glass-panel rounded-3xl border border-white/10 p-4 mb-4 shadow-soft">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-100">VPN</p>
          <p className="text-xs text-slate-500">Secure your connection</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${enabled ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
          {enabled ? (status === 'connected' ? 'Connected' : 'Connecting…') : 'Offline'}
        </span>
      </div>
      <button
        className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold transition ${enabled ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
        onClick={handleToggle}
      >
        {enabled ? 'Disconnect VPN' : 'Connect VPN'}
      </button>
      {logs.length > 0 && (
        <div className="mt-4 max-h-28 overflow-y-auto rounded-3xl bg-slate-950/85 p-3 text-xs text-emerald-300 font-mono">
          {logs.slice(-10).map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      )}
    </div>
  )
};

export default VpnToggle;

