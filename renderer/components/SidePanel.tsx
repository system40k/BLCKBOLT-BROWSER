import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import VpnToggle from './VpnToggle'
import TorToggle from './TorToggle'
import AdblockToggle from './AdblockToggle'
import FingerprintIndicator from './FingerprintIndicator'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: 'easeOut' as const },
  },
}

export default function SidePanel() {
  const [activeTool, setActiveTool] = useState<string | null>(null)
  const [headerData, setHeaderData] = useState<any>(null)
  const [sslData, setSslData] = useState<any>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).blckboltAPI) {
      const api = (window as any).blckboltAPI
      api.on('header-data', (data: any) => {
        setHeaderData((prev: any) => ({ ...prev, ...data }))
      })
      api.on('ssl-data', (data: any) => {
        setSslData(data)
      })
    }
  }, [])

  const renderToolContent = () => {
    if (activeTool === 'Headers') {
      return (
        <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-accent uppercase tracking-wider">General</p>
            <div className="text-[11px] text-slate-300 bg-slate-900/50 p-2 rounded-lg border border-white/5 break-all">
              <p><span className="text-slate-500">URL:</span> {headerData?.url}</p>
              <p><span className="text-slate-500">Method:</span> {headerData?.method}</p>
              <p><span className="text-slate-500">Status:</span> {headerData?.statusCode}</p>
              <p><span className="text-slate-500">Remote IP:</span> {headerData?.ip}</p>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-accent uppercase tracking-wider">Response Headers</p>
            <div className="text-[11px] text-slate-300 bg-slate-900/50 p-2 rounded-lg border border-white/5 space-y-1">
              {headerData?.responseHeaders && Object.entries(headerData.responseHeaders).map(([key, value]: [string, any]) => (
                <p key={key}><span className="text-slate-500">{key}:</span> {Array.isArray(value) ? value.join(', ') : value}</p>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-accent uppercase tracking-wider">Request Headers</p>
            <div className="text-[11px] text-slate-300 bg-slate-900/50 p-2 rounded-lg border border-white/5 space-y-1">
              {headerData?.requestHeaders && Object.entries(headerData.requestHeaders).map(([key, value]: [string, any]) => (
                <p key={key}><span className="text-slate-500">{key}:</span> {value}</p>
              ))}
            </div>
          </div>
        </div>
      )
    }

    if (activeTool === 'SSL') {
      return (
        <div className="space-y-4 text-[11px] text-slate-300">
          <div className="bg-slate-900/50 p-3 rounded-xl border border-white/5 space-y-2">
            <p><span className="text-slate-500 uppercase text-[9px] block mb-0.5">Subject</span> {sslData?.subjectName}</p>
            <p><span className="text-slate-500 uppercase text-[9px] block mb-0.5">Issuer</span> {sslData?.issuerName}</p>
            <p><span className="text-slate-500 uppercase text-[9px] block mb-0.5">Expires</span> {sslData?.validExpiry}</p>
            <p><span className="text-slate-500 uppercase text-[9px] block mb-0.5">Protocol</span> {sslData?.protocol}</p>
            <div className="pt-2">
              <span className="text-slate-500 uppercase text-[9px] block mb-1">Fingerprint (SHA256)</span>
              <p className="font-mono text-[9px] break-all bg-black/30 p-2 rounded border border-white/5">{sslData?.fingerprint}</p>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="py-8 text-center">
        <p className="text-xs text-slate-500 italic">No data captured yet for {activeTool}</p>
      </div>
    )
  }

  return (
    <aside className="hidden md:block w-full max-w-xs shrink-0" role="complementary" aria-label="Privacy controls">
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
        <motion.div variants={itemVariants} className="glass-panel rounded-[2rem] border border-white/10 p-5 shadow-soft custom-scrollbar overflow-y-auto max-h-[calc(100vh-140px-1rem)]">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-slate-500">Security Core</p>
              <div className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_8px_rgba(34,197,148,0.5)]" />
            </div>
            <div className="rounded-2xl bg-slate-950/80 p-4 border border-white/5 space-y-4">
              <div className="flex items-center justify-between gap-3 text-sm text-slate-300 mb-3">
                <span>Network protection</span>
                <motion.span className="text-accent font-medium" animate={{ opacity: [1, 0.7, 1] }} transition={{ duration: 2, repeat: Infinity }}>Active</motion.span>
              </div>
              <div className="space-y-2 text-sm text-slate-400">
                <motion.div className="rounded-2xl bg-slate-900/80 p-3 hover:bg-slate-800 transition" whileHover={{ scale: 1.02 }}>Tor: <span className="font-medium text-slate-100">Ready</span></motion.div>
                <motion.div className="rounded-2xl bg-slate-900/80 p-3 hover:bg-slate-800 transition" whileHover={{ scale: 1.02 }}>Adblock: <span className="font-medium text-slate-100">Enabled</span></motion.div>
                <motion.div className="rounded-2xl bg-slate-900/80 p-3 hover:bg-slate-800 transition" whileHover={{ scale: 1.02 }}>Fingerprint: <span className="font-medium text-slate-100">Randomized</span></motion.div>
              </div>
            </div>
          </div>
          <div className="space-y-3"><VpnToggle /><AdblockToggle /><TorToggle profileId="default" /><FingerprintIndicator /></div>
        </motion.div>

        <motion.div variants={itemVariants} className="glass-panel rounded-[2rem] border border-white/10 p-5 shadow-soft">
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-slate-500 mb-5 px-1">Analysis Kit</p>
          <div className="grid grid-cols-2 gap-2 mb-6">
            {[{ label: 'DOM', icon: '⚡' }, { label: 'SSL', icon: '🔐' }, { label: 'Headers', icon: '📑' }, { label: 'Inject', icon: '💉' }].map((tool) => (
              <button key={tool.label} onClick={() => setActiveTool(activeTool === tool.label ? null : tool.label)} className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all gap-1.5 group ${activeTool === tool.label ? 'bg-accent/20 border-accent shadow-[0_0_15px_rgba(124,58,237,0.2)]' : 'bg-slate-950/60 border-white/5 hover:border-accent/40 hover:bg-slate-900'}`}>
                <span className="text-lg group-hover:scale-110 transition-transform">{tool.icon}</span>
                <span className={`text-[9px] font-bold uppercase tracking-widest transition-colors ${activeTool === tool.label ? 'text-accentSoft' : 'text-slate-500 group-hover:text-slate-300'}`}>{tool.label}</span>
              </button>
            ))}
          </div>
          <AnimatePresence mode="wait">
            {activeTool && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-6 overflow-hidden">
                <div className="rounded-2xl bg-slate-950/40 border border-white/10 p-4 shadow-inner">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5"><span className="text-[10px] font-bold uppercase tracking-widest text-slate-200">{activeTool} Data</span><button onClick={() => setActiveTool(null)} className="text-slate-500 hover:text-white text-[10px]">✕</button></div>
                  {renderToolContent()}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-slate-500 mb-5 px-1">Quick Access</p>
          <div className="grid gap-3">
            {[{ label: 'Privacy Lab', icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg> }, { label: 'Packet Inspect', icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 10h10"/><path d="M7 14h10"/><path d="M7 6h10"/></svg> }, { label: 'Session Root', icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20v-6a2 2 0 1 0-4 0v6"/><rect width="20" height="12" x="2" y="4" rx="2"/><path d="M2 10h20"/></svg> }].map((action, idx) => (
              <motion.button key={action.label} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 + 0.4 }} whileHover={{ x: 4, backgroundColor: 'rgba(255, 255, 255, 0.03)' }} whileTap={{ scale: 0.98 }} className="group w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all border border-transparent hover:border-white/5" aria-label={action.label}>
                <span className="text-slate-500 group-hover:text-accent transition-colors">{action.icon}</span><span className="text-xs font-semibold text-slate-400 group-hover:text-slate-100 transition-colors uppercase tracking-wider">{action.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </aside>
  )
}
