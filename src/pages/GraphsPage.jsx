import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowDownRight,
  ArrowUpRight,
  CalendarRange,
  LineChart as LineChartIcon,
  Loader2,
  Search,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Navbar from '../components/Navbar';
import api from '../api/axios';

/* ── helpers ── */
const parseDailyPrices = (raw) => {
  if (!raw) return [];
  const normalize = (dateValue, payload) => {
    const time = new Date(dateValue);
    const close = Number(payload?.close ?? payload?.['4. close']);
    const open = Number(payload?.open ?? payload?.['1. open']);
    const high = Number(payload?.high ?? payload?.['2. high']);
    const low = Number(payload?.low ?? payload?.['3. low']);
    const volume = Number(payload?.volume ?? payload?.['5. volume']);
    if (!Number.isFinite(close) || Number.isNaN(time.getTime())) return null;
    return {
      date: dateValue,
      label: time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      close,
      open: Number.isFinite(open) ? open : null,
      high: Number.isFinite(high) ? high : null,
      low: Number.isFinite(low) ? low : null,
      volume: Number.isFinite(volume) ? volume : null,
      ts: time.getTime(),
    };
  };
  if (Array.isArray(raw))
    return raw.map((r) => normalize(r.date, r)).filter(Boolean).sort((a, b) => a.ts - b.ts);
  if (typeof raw === 'object')
    return Object.entries(raw).map(([d, v]) => normalize(d, v)).filter(Boolean).sort((a, b) => a.ts - b.ts);
  return [];
};

const fmt = (v) =>
  Number(v || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

/* ── Tooltip ── */
const PriceTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-gray-200/80 bg-white/95 backdrop-blur px-4 py-3 shadow-lg text-sm min-w-[160px]">
      <p className="text-xs font-medium text-gray-500">{p.label || label}</p>
      <p className="text-xl font-bold text-gray-900 mt-0.5">{fmt(p.close)}</p>
      <div className="flex gap-3 mt-1.5 text-[11px] text-gray-500">
        <span>O {p.open != null ? fmt(p.open) : '—'}</span>
        <span>H {p.high != null ? fmt(p.high) : '—'}</span>
        <span>L {p.low != null ? fmt(p.low) : '—'}</span>
      </div>
      {p.volume ? <p className="text-[11px] text-gray-400 mt-1">Vol {p.volume.toLocaleString()}</p> : null}
    </div>
  );
};

/* ── Gradient definition for area chart ── */
const ChartGradient = ({ id, isUp }) => (
  <defs>
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={isUp ? '#10b981' : '#ef4444'} stopOpacity={0.25} />
      <stop offset="100%" stopColor={isUp ? '#10b981' : '#ef4444'} stopOpacity={0.02} />
    </linearGradient>
  </defs>
);

const GraphsPage = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [selectedTicker, setSelectedTicker] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortMode, setSortMode] = useState('none');
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalDays, setTotalDays] = useState(null);
  const [viewRange, setViewRange] = useState({ start: 0, end: 0 });
  const chartContainerRef = useRef(null);
  const viewRangeRef = useRef(viewRange);
  const seriesLenRef = useRef(0);

  /* ── derived ── */
  const filteredTickers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const base = q
      ? companies.filter(
          (c) => c.symbol?.toLowerCase().includes(q) || c.name?.toLowerCase().includes(q),
        )
      : companies;
    const sorted = [...base];
    if (sortMode === 'az') sorted.sort((a, b) => (a.symbol || '').localeCompare(b.symbol || ''));
    if (sortMode === 'za') sorted.sort((a, b) => (b.symbol || '').localeCompare(a.symbol || ''));
    return sorted;
  }, [searchTerm, sortMode, companies]);

  // keep refs in sync for the wheel handler (avoids stale closures)
  useEffect(() => { viewRangeRef.current = viewRange; }, [viewRange]);
  useEffect(() => { seriesLenRef.current = series.length; }, [series.length]);

  const visibleSeries = useMemo(() => {
    if (!series.length) return [];
    return series.slice(viewRange.start, viewRange.end + 1);
  }, [series, viewRange]);

  const yDomain = useMemo(() => {
    if (!visibleSeries.length) return ['auto', 'auto'];
    let min = Infinity, max = -Infinity;
    for (const p of visibleSeries) {
      if (p.low != null && p.low < min) min = p.low;
      if (p.close < min) min = p.close;
      if (p.high != null && p.high > max) max = p.high;
      if (p.close > max) max = p.close;
    }
    const pad = Math.max(0.5, (max - min) * 0.08);
    return [Math.max(0, min - pad), max + pad];
  }, [visibleSeries]);

  const latest = series[series.length - 1];
  const visibleFirst = visibleSeries[0];
  const visibleLast = visibleSeries[visibleSeries.length - 1];
  const isUp = visibleLast && visibleFirst ? visibleLast.close >= visibleFirst.close : true;
  const priceChange = visibleLast && visibleFirst ? visibleLast.close - visibleFirst.close : 0;
  const priceChangePct = visibleFirst?.close ? (priceChange / visibleFirst.close) * 100 : 0;
  const strokeColor = isUp ? '#10b981' : '#ef4444';

  const isZoomed = series.length > 0 && (viewRange.start > 0 || viewRange.end < series.length - 1);
  const zoomPct = series.length > 1 ? ((viewRange.end - viewRange.start + 1) / series.length * 100) : 100;

  /* ── callbacks ── */
  const handleResetZoom = useCallback(() => {
    setViewRange({ start: 0, end: Math.max(0, seriesLenRef.current - 1) });
  }, []);

  /* ── data fetching ── */
  useEffect(() => {
    if (!selectedTicker) return;
    const fetchPrices = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/stockdailyprices', { params: { symbol: selectedTicker.symbol } });
        const raw = res?.data?.data ?? res?.data?.prices ?? res?.data;
        const parsed = parseDailyPrices(raw);
        setTotalDays(parsed.length);
        if (!parsed.length) throw new Error('No price data');
        setSeries(parsed);
        setViewRange({ start: 0, end: parsed.length - 1 });
      } catch (err) {
        setError(err?.response?.data?.message || 'Could not load price history.');
        setSeries([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPrices();
  }, [selectedTicker]);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await api.get('/companies');
        const raw = Array.isArray(res?.data?.data) ? res.data.data : [];
        setCompanies(raw);
        if (raw.length) setSelectedTicker(raw[0]);
      } catch (err) {
        console.error('Failed to fetch companies', err);
      }
    };
    fetchCompanies();
  }, []);

  /* ── scroll-to-zoom on chart container ── */
  useEffect(() => {
    const el = chartContainerRef.current;
    if (!el) return;
    const onWheel = (e) => {
      const len = seriesLenRef.current;
      if (len < 2) return;
      e.preventDefault();
      const { start, end } = viewRangeRef.current;
      const span = end - start;
      const MIN_SPAN = Math.max(5, Math.floor(len * 0.02)); // never fewer than ~2% of data or 5 points

      // deltaY > 0 → scroll down → zoom out, deltaY < 0 → scroll up → zoom in
      const zoomFactor = 0.08;
      const delta = Math.round(Math.max(1, span * zoomFactor));

      // figure out where the mouse is relative to the chart for anchored zoom
      const rect = el.getBoundingClientRect();
      const mouseRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

      let newStart, newEnd;
      if (e.deltaY < 0) {
        // zoom in
        if (span <= MIN_SPAN) return;
        const shrinkLeft = Math.round(delta * mouseRatio);
        const shrinkRight = delta - shrinkLeft;
        newStart = Math.min(start + shrinkLeft, end - MIN_SPAN);
        newEnd = Math.max(end - shrinkRight, newStart + MIN_SPAN);
      } else {
        // zoom out
        const growLeft = Math.round(delta * mouseRatio);
        const growRight = delta - growLeft;
        newStart = Math.max(0, start - growLeft);
        newEnd = Math.min(len - 1, end + growRight);
      }
      setViewRange({ start: newStart, end: newEnd });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []); // refs handle stale closure

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-5">
        {/* ── Top bar ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/home')}
              className="flex items-center gap-1.5 text-gray-500 hover:text-blue-600 transition text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="font-medium">Home</span>
            </button>
            <span className="text-gray-300">|</span>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-semibold">
              <LineChartIcon className="w-3.5 h-3.5" />
              Price Charts
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-sm">
            {totalDays && (
              <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-1.5 shadow-sm text-gray-600">
                <CalendarRange className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-xs font-medium">{totalDays} days</span>
              </div>
            )}
            {latest && (
              <div className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 shadow-sm text-xs font-semibold border ${
                isUp ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {isUp ? '+' : ''}{priceChangePct.toFixed(2)}%
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5 items-start">
          {/* ── Ticker sidebar ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3 lg:h-[calc(100vh-160px)] lg:sticky lg:top-4">
            <div>
              <h2 className="text-sm font-bold text-gray-900 mb-2">Tickers</h2>
              <label className="flex items-center gap-2 bg-gray-50/80 border border-gray-200 rounded-xl px-3 py-2">
                <Search className="w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search..."
                  className="w-full bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400"
                />
              </label>
            </div>

            <div className="flex items-center justify-between text-[11px] text-gray-500">
              <span>{filteredTickers.length} of {companies.length}</span>
              <button
                type="button"
                onClick={() => setSortMode((p) => (p === 'none' ? 'az' : p === 'az' ? 'za' : 'none'))}
                className="px-2 py-0.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 font-medium"
              >
                {sortMode === 'none' ? '—' : sortMode === 'az' ? 'A→Z' : 'Z→A'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-1.5">
              {filteredTickers.map((item) => {
                const active = selectedTicker?.symbol === item.symbol;
                return (
                  <button
                    key={item.symbol}
                    onClick={() => setSelectedTicker(item)}
                    className={`w-full text-left rounded-xl px-3 py-2.5 transition-all ${
                      active
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                        : 'bg-gray-50/60 hover:bg-gray-100 text-gray-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className={`text-xs font-bold ${active ? 'text-blue-200' : 'text-blue-600'}`}>
                          {item.symbol}
                        </p>
                        <p className={`text-sm font-semibold truncate ${active ? 'text-white' : 'text-gray-900'}`}>
                          {item.name}
                        </p>
                      </div>
                      {active && (
                        <span className="flex-shrink-0 w-2 h-2 rounded-full bg-white animate-pulse" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Chart panel ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4">
            {/* Header row */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  {selectedTicker && (
                    <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow">
                      {selectedTicker.symbol.slice(0, 2)}
                    </span>
                  )}
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 leading-tight">
                      {selectedTicker?.name || 'Select a ticker'}
                    </h2>
                    {selectedTicker && (
                      <p className="text-xs text-gray-400">{selectedTicker.symbol} · Daily close</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Price display card */}
              {latest && (
                <div className="rounded-xl px-4 py-2.5 min-w-[180px] border shadow-sm bg-gray-50/80 border-gray-200">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] text-gray-500 font-medium">
                        Latest · {latest.label || latest.date}
                      </p>
                      <p className="text-2xl font-extrabold text-gray-900 tracking-tight">{fmt(latest.close)}</p>
                    </div>
                    <div className={`flex items-center gap-0.5 text-xs font-bold px-2 py-1 rounded-lg ${
                      isUp ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                      {fmt(Math.abs(priceChange))}
                    </div>
                  </div>
                  {visibleSeries.length > 0 && (
                    <div className="flex gap-3 text-[11px] text-gray-400 mt-1">
                      <span>Range: {visibleSeries.length} days</span>
                      <span>Lo {fmt(Math.min(...visibleSeries.map(p => p.close)))}</span>
                      <span>Hi {fmt(Math.max(...visibleSeries.map(p => p.close)))}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Chart */}
            <div
              ref={chartContainerRef}
              className="w-full h-[480px] rounded-xl bg-gray-50/50 border border-gray-100 overflow-hidden relative"
            >
              {loading ? (
                <div className="h-full flex items-center justify-center gap-2 text-gray-500">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <span className="text-sm">Loading chart data...</span>
                </div>
              ) : error ? (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-red-600 text-center px-4">
                  <AlertTriangle className="w-6 h-6" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              ) : !series.length ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                  <LineChartIcon className="w-10 h-10 text-gray-200" />
                  <p className="text-sm">Pick a ticker to view its price chart</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={visibleSeries}
                    margin={{ top: 20, right: 24, left: 8, bottom: 8 }}
                  >
                    <ChartGradient id="priceGradient" isUp={isUp} />
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) =>
                        new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      }
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                      minTickGap={20}
                    />
                    <YAxis
                      domain={yDomain}
                      tickFormatter={(v) => `$${v.toFixed(0)}`}
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      tickLine={false}
                      axisLine={false}
                      width={65}
                    />
                    <Tooltip
                      content={<PriceTooltip />}
                      cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="close"
                      stroke={strokeColor}
                      strokeWidth={2}
                      fill="url(#priceGradient)"
                      dot={false}
                      activeDot={{
                        r: 5,
                        fill: strokeColor,
                        stroke: '#fff',
                        strokeWidth: 2,
                        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))',
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}

              {/* Zoom indicator */}
              {series.length > 0 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/90 backdrop-blur border border-gray-200 rounded-full px-3 py-1 shadow-sm text-[11px] text-gray-500">
                  <span className="select-none">Scroll to zoom</span>
                  {isZoomed && (
                    <>
                      <span className="text-gray-300">|</span>
                      <span className="font-medium text-blue-600">{Math.round(zoomPct)}%</span>
                      <button
                        onClick={handleResetZoom}
                        className="ml-0.5 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium transition"
                      >
                        Reset
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GraphsPage;
