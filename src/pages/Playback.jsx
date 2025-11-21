import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createChart, CrosshairMode } from 'lightweight-charts'
import { ChevronDown, Play, Pause, RefreshCw } from 'lucide-react'
import { create } from 'zustand'

// Simple store to track selected symbol and playback state
const usePlaybackStore = create((set) => ({
  selected: 'AAPL',
  playing: false,
  setSelected: (s) => set({ selected: s }),
  setPlaying: (p) => set({ playing: p }),
}))

// Fake WebSocket stream generator (frontend-only demo)
function useFakeSocket({ symbols, playing }) {
  const [tick, setTick] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!playing) {
      clearInterval(timerRef.current)
      return
    }

    const makeTick = () => {
      const sym = symbols[Math.floor(Math.random() * symbols.length)]
      const t = Date.now() / 1000
      const price = 100 + Math.sin(t / 5 + sym.length) * 10 + (Math.random() - 0.5) * 2
      setTick({ symbol: sym, time: Math.floor(t), value: price })
    }

    timerRef.current = setInterval(makeTick, 500)
    return () => clearInterval(timerRef.current)
  }, [symbols, playing])

  return tick
}

function SymbolCombo({ symbols }) {
  const selected = usePlaybackStore((s) => s.selected)
  const setSelected = usePlaybackStore((s) => s.setSelected)
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-100 rounded-md border border-slate-600/50"
      >
        <span className="font-mono text-sm">{selected}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-48 max-h-64 overflow-auto rounded-md border border-slate-700 bg-slate-900/95 shadow-xl">
          {symbols.map((s) => (
            <button
              key={s}
              onClick={() => { setSelected(s); setOpen(false) }}
              className={`block w-full text-left px-3 py-2 text-sm hover:bg-slate-800 ${selected === s ? 'text-blue-400' : 'text-slate-200'}`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Chart({ data, theme = 'dark' }) {
  const containerRef = useRef(null)
  const seriesRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: 'solid', color: theme === 'dark' ? '#0b1220' : '#fff' },
        textColor: theme === 'dark' ? '#c7d2fe' : '#0f172a',
      },
      grid: {
        vertLines: { color: theme === 'dark' ? '#1f2a44' : '#e2e8f0' },
        horzLines: { color: theme === 'dark' ? '#1f2a44' : '#e2e8f0' },
      },
      crosshair: { mode: CrosshairMode.Magnet },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false },
      localization: { priceFormatter: (p) => `$${p.toFixed(2)}` },
    })

    const areaSeries = chart.addAreaSeries({
      topColor: 'rgba(59,130,246,0.3)',
      bottomColor: 'rgba(59,130,246,0.04)',
      lineColor: 'rgba(59,130,246,1)',
      lineWidth: 2,
    })

    seriesRef.current = areaSeries
    chartRef.current = chart

    const handleResize = () => {
      chart.applyOptions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight })
      chart.timeScale().fitContent()
    }
    handleResize()
    const ro = new ResizeObserver(handleResize)
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      chart.remove()
    }
  }, [theme])

  useEffect(() => {
    if (!seriesRef.current) return
    // expects array of { time, value }
    seriesRef.current.setData(data)
  }, [data])

  return <div ref={containerRef} className="w-full h-[360px] md:h-[520px]" />
}

export default function PlaybackPage() {
  // Prepare 100 symbols
  const symbols = useMemo(() => {
    const base = ['AAPL','MSFT','GOOG','AMZN','META','NVDA','TSLA','AMD','NFLX','INTC','AVGO','ORCL','CRM','ADBE','CSCO']
    const out = []
    for (let i = 0; i < 100; i++) {
      out.push((base[i % base.length] + (i+1)).slice(0,6))
    }
    return out
  }, [])

  const selected = usePlaybackStore((s) => s.selected)
  const playing = usePlaybackStore((s) => s.playing)
  const setPlaying = usePlaybackStore((s) => s.setPlaying)

  // keep in-memory data per symbol for the demo
  const storeRef = useRef(new Map())
  const [, force] = useState(0)

  // Fake socket tick
  const tick = useFakeSocket({ symbols, playing })

  // Update per-symbol series on every tick
  useEffect(() => {
    if (!tick) return
    const list = storeRef.current.get(tick.symbol) ?? []
    const prev = list[list.length - 1]
    let next
    if (!prev || tick.time > prev.time) {
      next = [...list, { time: tick.time, value: tick.value }]
    } else {
      next = [...list]
      next[next.length - 1] = { time: tick.time, value: tick.value }
    }
    // Keep last 500 points per symbol
    const trimmed = next.slice(-500)
    storeRef.current.set(tick.symbol, trimmed)

    // Force rerender so chart refreshes when selected symbol updates
    if (tick.symbol === selected) force((n) => n + 1)
  }, [tick, selected])

  const selectedData = storeRef.current.get(selected) ?? []

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-slate-100">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Historical Playback Dashboard</h1>
            <p className="text-slate-400 text-sm md:text-base">Client-only demo: combobox switches symbol; background playback continues for all.</p>
          </div>

          <div className="flex items-center gap-2">
            <SymbolCombo symbols={symbols} />
            <button
              onClick={() => setPlaying((p) => !p)}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-md border transition-colors ${playing ? 'bg-green-600/20 border-green-500/40 text-green-200 hover:bg-green-600/30' : 'bg-blue-600/20 border-blue-500/40 text-blue-200 hover:bg-blue-600/30'}`}
            >
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span className="text-sm font-medium">{playing ? 'Pause' : 'Start'}</span>
            </button>
            <button
              onClick={() => { storeRef.current = new Map(); force((n)=>n+1) }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md border bg-slate-800/40 border-slate-600/40 text-slate-200 hover:bg-slate-700/40"
              title="Clear local data"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="text-sm">Reset</span>
            </button>
          </div>
        </header>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 md:p-4">
          <Chart data={selectedData} />
        </div>

        <section className="grid md:grid-cols-3 gap-4">
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <h3 className="font-medium mb-2">How this demo maps to your spec</h3>
            <ul className="list-disc pl-5 space-y-1 text-slate-300 text-sm">
              <li>Start toggles a master clock (simulated here) and begins ticks for ~100 symbols.</li>
              <li>Combobox switches the visible symbol; background updates continue for all.</li>
              <li>Chart uses lightweight-charts with an area series.</li>
            </ul>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <h3 className="font-medium mb-2">Next steps to production</h3>
            <ul className="list-disc pl-5 space-y-1 text-slate-300 text-sm">
              <li>Wire Start to POST /api/playback/start (backend), disable while active.</li>
              <li>Replace fake socket with WebSocket/Socket.io feed.</li>
              <li>Batch updates and use a Web Worker for chart updates at high throughput.</li>
            </ul>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <h3 className="font-medium mb-2">Tech</h3>
            <ul className="list-disc pl-5 space-y-1 text-slate-300 text-sm">
              <li>React + Tailwind</li>
              <li>lightweight-charts</li>
              <li>zustand store for UI state</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  )
}
