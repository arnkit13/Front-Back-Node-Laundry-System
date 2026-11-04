import https from 'https';

const postData = JSON.stringify({
  username: 'admin',
  password: 'admin123'
});

const targetHost = process.env.TEST_HOST || process.env.RAILWAY_PUBLIC_DOMAIN || 'laundryinventorysystem.up.railway.app';

const options = {
  hostname: targetHost.replace(/^https?:\/\//, '').replace(/\/.*$/, ''),
  port: 443,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log(`BODY: ${data}`);
  });
});

req.on('error', (e) => {
  console.error(`Got error: ${e.message}`);
});

req.write(postData);
req.end();
