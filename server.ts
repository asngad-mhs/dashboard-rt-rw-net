import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // ====== Mock Databases & State ======
  let wanReceived = 10000;
  let wanSent = 5000;

  // ====== API Routes ======
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  app.get('/api/wan-stats', (req, res) => {
    // Generate some random fluctuation
    wanReceived = Math.abs(wanReceived + (Math.random() * 5000 - 2000));
    wanSent = Math.abs(wanSent + (Math.random() * 3000 - 1000));
    
    res.json({
      received: wanReceived,
      sent: wanSent
    });
  });

  app.get('/api/history', (req, res) => {
    const routers = [
      {
        id: 1,
        name: 'PPPOE Server Pusat',
        ip: '10.0.0.25',
        port: '8728',
        wan_interface: 'ether1-isp',
        latest_log: {
          status: 'Success',
          client_count: 125,
          cpu_load: '20%',
          download_speed: Math.random() * 50000 + 20000,
          upload_speed: Math.random() * 10000 + 5000,
          created_at: new Date().toISOString()
        },
        logs: Array.from({length: 10}).map((_, i) => ({
          client_count: 120 + Math.floor(Math.random() * 10),
          download_speed: Math.random() * 50000 + 10000,
          upload_speed: Math.random() * 15000 + 2000,
          created_at: new Date(Date.now() - (10 - i) * 60000).toISOString()
        }))
      },
      {
        id: 2,
        name: 'Hotspot Sektor A',
        ip: '192.168.10.1',
        port: '8728',
        wan_interface: 'wlan1',
        latest_log: {
          status: 'Success',
          client_count: 42,
          cpu_load: '45%',
          download_speed: Math.random() * 20000 + 5000,
          upload_speed: Math.random() * 5000 + 1000,
          created_at: new Date().toISOString()
        },
        logs: Array.from({length: 10}).map((_, i) => ({
          client_count: 35 + Math.floor(Math.random() * 10),
          download_speed: Math.random() * 20000 + 5000,
          upload_speed: Math.random() * 5000 + 1000,
          created_at: new Date(Date.now() - (10 - i) * 60000).toISOString()
        }))
      },
      {
        id: 3,
        name: 'Relay OLT Desa',
        ip: '10.10.10.2',
        port: '8728',
        wan_interface: 'sfp1',
        latest_log: {
          status: 'Fail',
          client_count: 0,
          cpu_load: '0%',
          download_speed: 0,
          upload_speed: 0,
          created_at: new Date().toISOString()
        },
        logs: Array.from({length: 10}).map((_, i) => ({
          client_count: i < 5 ? 50 : 0,
          download_speed: i < 5 ? 10000 : 0,
          upload_speed: i < 5 ? 2000 : 0,
          created_at: new Date(Date.now() - (10 - i) * 60000).toISOString()
        }))
      }
    ];

    const current_total = routers.reduce((sum, r) => sum + (r.latest_log.client_count || 0), 0);
    
    const history = Array.from({length: 6}).map((_, i) => ({
      time_bucket: `Jam ${new Date(Date.now() - (5 - i) * 3600000).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}`,
      total_clients: 150 + Math.floor(Math.random() * 30)
    }));

    res.json({
      current_total,
      routers,
      history
    });
  });

  app.get('/api/top-domains', (req, res) => {
    res.json({
      total_connections: 12543,
      wan_a_connections: 8200,
      wan_b_connections: 4343,
      domains: [
        { domain: 'googlevideo.com', count: 4200 },
        { domain: 'facebook.com', count: 3100 },
        { domain: 'tiktokv.com', count: 2850 },
        { domain: 'instagram.com', count: 1540 },
        { domain: 'whatsapp.net', count: 980 },
        { domain: 'netflix.com', count: 650 },
        { domain: 'steampowered.com', count: 450 },
        { domain: 'ruangguru.com', count: 200 },
        { domain: 'shopee.co.id', count: 180 },
        { domain: 'tokopedia.com', count: 175 }
      ]
    });
  });

  app.post('/api/force-scan', (req, res) => {
    res.json({ message: 'Scan initiated' });
  });


  // ====== Vite Middleware (Development) ======
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production serving static files
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
