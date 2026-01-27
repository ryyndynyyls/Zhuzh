// Minimal test server - no dependencies except built-in http
const http = require('http');

const PORT = process.env.PORT || 8080;

console.log(`Starting minimal server on port ${PORT}...`);

const server = http.createServer((req, res) => {
  console.log(`Request: ${req.method} ${req.url}`);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', path: req.url, timestamp: new Date().toISOString() }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Minimal server listening on http://0.0.0.0:${PORT}`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
});
