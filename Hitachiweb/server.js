const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const app = require('./src/app');

const HTTP_PORT = process.env.HTTP_PORT ?? 3000;
const HTTPS_PORT = process.env.HTTPS_PORT ?? 3443;

// Start HTTP server (listens on all interfaces: 0.0.0.0)
const httpServer = http.createServer(app);
httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
  console.log(`HTTP  listening on http://0.0.0.0:${HTTP_PORT}`);
});
httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${HTTP_PORT} je obsazený. Ukonči předchozí proces nebo nastav HTTP_PORT=XXXX`);
    process.exit(1);
  } else throw err;
});

// Start HTTPS server if certificates are present
const certDir = path.join(__dirname, 'certs');
const keyPath = path.join(certDir, 'key.pem');
const certPath = path.join(certDir, 'cert.pem');

if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  const tlsOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };

  https.createServer(tlsOptions, app).listen(HTTPS_PORT, '0.0.0.0', () => {
    console.log(`HTTPS listening on https://0.0.0.0:${HTTPS_PORT}`);
  });
} else {
  console.warn('HTTPS disabled — certificates not found in ./certs/');
  console.warn('Run: npm run gen-certs');
}
