// CYBER SWARM — Electron desktop wrapper
// Serves the static game build from an internal localhost server (robust asset loading),
// then opens it in a fullscreen desktop window. Runs 100% offline.
const { app, BrowserWindow, Menu } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');

const GAME_DIR = path.join(__dirname, 'game');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

function createServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      try {
        let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
        if (urlPath === '/') urlPath = '/index.html';
        // Prevent path traversal
        const safePath = path.normalize(path.join(GAME_DIR, urlPath));
        if (!safePath.startsWith(GAME_DIR)) {
          res.writeHead(403); res.end('Forbidden'); return;
        }
        fs.readFile(safePath, (err, data) => {
          if (err) {
            // SPA-ish fallback: serve index.html for unknown routes
            fs.readFile(path.join(GAME_DIR, 'index.html'), (e2, idx) => {
              if (e2) { res.writeHead(404); res.end('Not found'); return; }
              res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(idx);
            });
            return;
          }
          const ext = path.extname(safePath).toLowerCase();
          res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
          res.end(data);
        });
      } catch (e) {
        res.writeHead(500); res.end('Server error');
      }
    });
    // Listen on an ephemeral port, localhost only
    server.listen(0, '127.0.0.1', () => {
      resolve(server.address().port);
    });
  });
}

let mainWindow = null;

async function createWindow() {
  const port = await createServer();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#0A0A12',
    autoHideMenuBar: true,
    title: 'CYBER SWARM',
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });

  Menu.setApplicationMenu(null);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.loadURL(`http://127.0.0.1:${port}/`);

  // F11 toggles fullscreen, F12 opens devtools (handy while testing)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
    }
    if (input.type === 'keyDown' && input.key === 'F12') {
      mainWindow.webContents.toggleDevTools();
    }
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
