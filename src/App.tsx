import React, { useState, useEffect } from 'react';
import { Activity, Wifi, Users, Server, RefreshCw, HardDrive, Settings, ArrowDown, ArrowUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// --- Types ---
interface RouterLog {
  client_count: number;
  cpu_load: string;
  download_speed: number;
  upload_speed: number;
  created_at: string;
  status: string;
}

interface NetworkRouter {
  id: number;
  name: string;
  ip: string;
  port: string;
  wan_interface: string;
  latest_log: RouterLog;
  logs: RouterLog[];
}

interface HistoryData {
  current_total: number;
  routers: NetworkRouter[];
  history: Array<{ time_bucket: string; total_clients: number }>;
}

interface WanStats {
  received: number;
  sent: number;
}

interface DomainData {
  domain: string;
  count: number;
}

interface TopDomainsResponse {
  total_connections: number;
  wan_a_connections: number;
  wan_b_connections: number;
  domains: DomainData[];
}

const PIE_COLORS = [
  '#3b82f6', '#22c55e', '#ef4444', '#eab308', '#06b6d4',
  '#f97316', '#8b5cf6', '#ec4899', '#10b981', '#64748b'
];

export default function App() {
  const [historyData, setHistoryData] = useState<HistoryData | null>(null);
  const [wanStats, setWanStats] = useState<{ time: string; rx: number; tx: number }[]>([]);
  const [topDomains, setTopDomains] = useState<TopDomainsResponse | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // --- Data Fetching ---
  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/history');
      if (res.ok) {
        const data = await res.json();
        setHistoryData(data);
        setLastUpdate(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch history', err);
    }
  };

  const fetchWanStats = async () => {
    try {
      const res = await fetch('/api/wan-stats');
      if (res.ok) {
        const data: WanStats = await res.json();
        const now = new Date();
        const timeLabel = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
        setWanStats(prev => {
          const newData = [...prev, {
            time: timeLabel,
            rx: +(data.received / 1000).toFixed(2),
            tx: +(data.sent / 1000).toFixed(2)
          }];
          return newData.slice(-50); // Keep last 50 points
        });
      }
    } catch (err) {
      console.error('Failed to fetch WAN stats', err);
    }
  };

  const fetchDomains = async () => {
    try {
      const res = await fetch('/api/top-domains');
      if (res.ok) {
        const data = await res.json();
        setTopDomains(data);
      }
    } catch (err) {
      console.error('Failed to fetch top domains', err);
    }
  };

  const forceScan = async () => {
    if (!window.confirm('Jalankan scan sekarang? Ini akan memakan waktu beberapa detik.')) return;
    setIsScanning(true);
    try {
      await fetch('/api/force-scan', { method: 'POST' });
      await new Promise(r => setTimeout(r, 2000)); // Simulate wait
      await fetchHistory();
    } catch (err) {
      console.error(err);
    } finally {
      setIsScanning(false);
    }
  };

  // --- Effects ---
  useEffect(() => {
    fetchHistory();
    fetchDomains();

    const historyInterval = setInterval(fetchHistory, 60000);
    const domainInterval = setInterval(fetchDomains, 300000);
    const wanInterval = setInterval(fetchWanStats, 2000);

    return () => {
      clearInterval(historyInterval);
      clearInterval(domainInterval);
      clearInterval(wanInterval);
    };
  }, []);

  const activeRoutersCount = historyData?.routers.filter(r => r.latest_log?.status === 'Success').length || 0;
  const totalRoutersCount = historyData?.routers.length || 0;

  const avgRx = wanStats.length > 0
    ? (wanStats.reduce((sum, data) => sum + data.rx, 0) / wanStats.length).toFixed(1)
    : '0.0';
  const avgTx = wanStats.length > 0
    ? (wanStats.reduce((sum, data) => sum + data.tx, 0) / wanStats.length).toFixed(1)
    : '0.0';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Wifi size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Dashboard RT/RW Net</h1>
              <p className="text-slate-500 text-sm font-medium mt-1">Sistem Manajemen Multi-Router Terpusat</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={forceScan}
              disabled={isScanning}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw size={18} className={isScanning ? "animate-spin" : ""} />
              {isScanning ? 'Scanning...' : 'Scan Sekarang'}
            </button>
            <button className="flex items-center gap-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg font-medium transition-colors">
              <Settings size={18} />
              Admin
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Users size={24} className="text-blue-600" />}
            label="Total Klien Aktif"
            value={historyData?.current_total?.toString() || '0'}
            sub={`Update Terakhir: ${lastUpdate.toLocaleTimeString('id-ID')}`}
            bg="bg-blue-50"
          />
          <StatCard
            icon={<Server size={24} className="text-emerald-600" />}
            label="Router Online"
            value={`${activeRoutersCount}`}
            sub={`Dari total ${totalRoutersCount} router terdaftar`}
            bg="bg-emerald-50"
          />
          <StatCard
            icon={<ArrowDown size={24} className="text-indigo-600" />}
            label="Rata-rata Download"
            value={`${avgRx}`}
            suffix=" Mbps"
            sub={`Periode ~${wanStats.length * 2} detik terakhir`}
            bg="bg-indigo-50"
          />
          <StatCard
            icon={<Activity size={24} className="text-amber-600" />}
            label="Koneksi Aktif"
            value={topDomains?.total_connections.toLocaleString('id-ID') || 'Loading'}
            sub="Conntrack pada router utama"
            bg="bg-amber-50"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Total Client Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Users size={20} className="text-slate-400" />
              Riwayat Klien Aktif (6 Jam)
            </h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyData?.history || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="time_bucket" tickFormatter={(v) => v.replace('Jam ', '')} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                  <Tooltip wrapperClassName="rounded-xl shadow-lg border-0" />
                  <Line type="monotone" dataKey="total_clients" name="Total Klien" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Router Summary Table */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-1 overflow-hidden flex flex-col">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <HardDrive size={20} className="text-slate-400" />
              Status Router Utama
            </h2>
            <div className="overflow-auto flex-1">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium">
                  <tr>
                    <th className="px-4 py-3 rounded-l-lg">Router</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right rounded-r-lg">Klien</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historyData?.routers.map(router => {
                    const isUp = router.latest_log?.status === 'Success';
                    return (
                      <tr key={router.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-700">
                          <div className="line-clamp-1">{router.name}</div>
                          <div className="text-xs text-slate-400 font-normal">{router.ip}</div>
                        </td>
                        <td className="px-4 py-3">
                          {isUp ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                              <CheckCircle2 size={12} />
                              Online
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                              <AlertCircle size={12} />
                              Offline
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-700">
                          {router.latest_log?.client_count || 0}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Realtime Bandwidth */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Activity size={20} className="text-slate-400" />
              Bandwidth Realtime (WAN Induk)
            </h2>
            <div className="flex items-center gap-4 mt-2 sm:mt-0 text-sm font-medium">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> Download (Avg: {avgRx} Mbps)</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-rose-500"></span> Upload (Avg: {avgTx} Mbps)</div>
            </div>
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={wanStats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="time" tick={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dx={-10} domain={[0, 'auto']} />
                <Tooltip wrapperClassName="rounded-xl shadow-lg border-0" />
                <Line type="monotone" dataKey="rx" name="Download (Mbps)" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="tx" name="Upload (Mbps)" stroke="#f43f5e" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Domains */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Activity size={20} className="text-slate-400" />
              Top 10 Tujuan Klien (Domains)
            </h2>
            <p className="text-sm text-slate-500 font-medium">
              WAN A: {topDomains?.wan_a_connections.toLocaleString('id-ID')} | 
              WAN B: {topDomains?.wan_b_connections.toLocaleString('id-ID')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3 w-12 text-center rounded-tl-lg">#</th>
                    <th className="px-4 py-3">Domain</th>
                    <th className="px-4 py-3 text-right rounded-tr-lg">Koneksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topDomains?.domains.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                      <td className="px-4 py-3 font-semibold text-slate-700">{item.domain}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-500">{item.count.toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                  {(!topDomains?.domains || topDomains.domains.length === 0) && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-slate-500">Data sedang dimuat...</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topDomains?.domains || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="domain"
                  >
                    {topDomains?.domains.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip wrapperClassName="rounded-xl shadow-lg border-0" />
                  <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Detailed Router Grid */}
        <div>
          <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Server size={24} className="text-slate-400" />
            Detail Perangkat Router
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {historyData?.routers.map(router => (
              <RouterCard key={router.id} router={router} />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// --- Specific Components ---

function StatCard({ icon, label, value, sub, suffix = '', bg }: { icon: React.ReactNode, label: string, value: string, sub: string, suffix?: string, bg: string }) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-start gap-4">
      <div className={`p-3 rounded-xl ${bg}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
        <h3 className="text-2xl font-bold text-slate-800 tracking-tight">
          {value}<span className="text-sm font-semibold text-slate-400">{suffix}</span>
        </h3>
        <p className="text-xs text-slate-400 mt-1">{sub}</p>
      </div>
    </div>
  );
}

function RouterCard({ router }: { key?: React.Key; router: NetworkRouter }) {
  const isUp = router.latest_log?.status === 'Success';
  
  // Format log data for chart
  const chartData = router.logs.map((log, i) => ({
    time: i, // Just relative time for minimal chart
    clients: log.client_count,
    rx: log.download_speed / 1000,
    tx: log.upload_speed / 1000
  })).reverse();

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
        <div>
          <h3 className="font-bold text-slate-800 text-lg mb-1">{router.name}</h3>
          <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
            <span>{router.ip}:{router.port}</span>
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            <span>{router.wan_interface}</span>
          </div>
        </div>
        <div className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${isUp ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
          {router.latest_log?.status}
        </div>
      </div>
      <div className="p-5 flex-1">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs text-slate-400 font-medium mb-1">Klien Aktif</p>
            <p className="text-xl font-bold text-slate-700">{router.latest_log?.client_count || 0}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs text-slate-400 font-medium mb-1">CPU Load</p>
            <p className="text-xl font-bold text-slate-700">{router.latest_log?.cpu_load || '0%'}</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-600/70 font-medium mb-1">Download</p>
              <p className="text-lg font-bold text-emerald-700">{router.latest_log ? (router.latest_log.download_speed / 1000).toFixed(1) : 0} <span className="text-xs">Mb</span></p>
            </div>
            <ArrowDown className="text-emerald-500 opacity-50" size={20} />
          </div>
          <div className="bg-rose-50 rounded-xl p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-rose-600/70 font-medium mb-1">Upload</p>
              <p className="text-lg font-bold text-rose-700">{router.latest_log ? (router.latest_log.upload_speed / 1000).toFixed(1) : 0} <span className="text-xs">Mb</span></p>
            </div>
            <ArrowUp className="text-rose-500 opacity-50" size={20} />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Trend Klien</p>
            <div className="h-16">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <Line type="monotone" dataKey="clients" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Trend Trafik</p>
            <div className="h-16">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <Line type="step" dataKey="rx" stroke="#10b981" strokeWidth={1.5} dot={false} />
                  <Line type="step" dataKey="tx" stroke="#f43f5e" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-slate-50 px-5 py-3 text-xs text-slate-400 text-center border-t border-slate-100">
        Terakhir diupdate: {router.latest_log?.created_at ? new Date(router.latest_log.created_at).toLocaleTimeString('id-ID') : '-'}
      </div>
    </div>
  );
}

