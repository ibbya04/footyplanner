#!/usr/bin/env node
// Minimal local stand-in for Vercel: serves the static site and runs the functions in /api.
// Usage: node scripts/dev-server.js [port]   (Node 18+, no dependencies)
// The Vercel CLI (`vercel dev`) works too; this just avoids needing it.

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.argv[2] || process.env.PORT || 3000);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

// Adds the bits of Vercel's request/response helpers the functions use.
function vercelify(req, res, url) {
    req.query = Object.fromEntries(url.searchParams);
    res.status = code => { res.statusCode = code; return res; };
    res.json = body => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(body));
    };
}

http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const started = Date.now();
    try {
        const api = url.pathname.match(/^\/api\/([a-z0-9-]+)$/);
        if (api) {
            const file = path.join(ROOT, 'api', `${api[1]}.js`);
            if (!fs.existsSync(file) || api[1].startsWith('_')) { res.statusCode = 404; return res.end('Not found'); }
            vercelify(req, res, url);
            await require(file)(req, res);
            return;
        }
        let file = path.join(ROOT, decodeURIComponent(url.pathname));
        if (!file.startsWith(ROOT)) { res.statusCode = 403; return res.end(); }
        if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
        if (!fs.existsSync(file)) { res.statusCode = 404; return res.end('Not found'); }
        res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
        fs.createReadStream(file).pipe(res);
    } catch (err) {
        console.error(err);
        if (!res.headersSent) res.statusCode = 500;
        res.end('Server error');
    } finally {
        res.on('finish', () => console.log(`${res.statusCode} ${req.method} ${url.pathname}${url.search} ${Date.now() - started}ms`));
    }
}).listen(PORT, () => console.log(`FootyPlanner on http://localhost:${PORT}`));
