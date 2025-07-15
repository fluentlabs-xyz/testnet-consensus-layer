const fs = require('fs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const WebSocket = require('ws');

const BLOCK_HASH_ORACLE_URL = process.env.BLOCK_HASH_ORACLE_URL || 'ws://10.114.0.3:8546/';
const ENGINE_API_URL = process.env.ENGINE_API_URL || 'http://127.0.0.1:8551';
const JWT_SECRET_PATH = process.env.JWT_SECRET_PATH || './jwt.hex';

const secretHex = fs.readFileSync(JWT_SECRET_PATH, 'utf-8').trim();
const secret = Buffer.from(secretHex, 'hex');

// -- Auth Header for JWT --
function getAuthHeader() {
  const payload = { iat: Math.floor(Date.now() / 1000) };
  return { Authorization: 'Bearer ' + jwt.sign(payload, secret, { algorithm: 'HS256' }) };
}

// -- Engine API HTTP only --
async function engine(method, params) {
  const headers = {
    ...getAuthHeader(),
    'Content-Type': 'application/json'
  };
  const data = {
    jsonrpc: '2.0',
    id: 1,
    method,
    params
  };
  const resp = await axios.post(ENGINE_API_URL, data, { headers });
  if (resp.data.error) throw new Error(JSON.stringify(resp.data.error));
  return resp.data.result;
}

// -- Block hash polling or subscription --
async function getBlockHashPoller(url, onNewHash) {
  if (url.startsWith('ws://') || url.startsWith('wss://')) {
    // WebSocket subscribe to newHeads
    const ws = new WebSocket(url);
    let subscriptionId = null;
    ws.on('open', () => {
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_subscribe',
        params: ['newHeads']
      }));
    });
    ws.on('message', (data) => {
      let msg = JSON.parse(data);
      // Subscription response
      if (msg.id === 1 && msg.result) {
        subscriptionId = msg.result;
      }
      // Header update
      if (msg.method === 'eth_subscription' && msg.params && msg.params.result && msg.params.result.hash) {
        onNewHash(msg.params.result.hash, msg.params.result.number);
      }
    });
    ws.on('close', () => {
      console.error('WS closed, exiting...');
      process.exit(1);
    });
    ws.on('error', (err) => {
      console.error('WS error:', err);
      process.exit(1);
    });
  } else {
    // Poll via HTTP
    let lastHash = null;
    async function poll() {
      try {
        const resp = await axios.post(
          url,
          {
            jsonrpc: '2.0',
            id: 1,
            method: 'eth_getBlockByNumber',
            params: ['latest', false]
          },
          { headers: { 'Content-Type': 'application/json' } }
        );
        const hash = resp.data.result.hash;
        const number = resp.data.result.number;
        if (hash && hash !== lastHash) {
          lastHash = hash;
          onNewHash(hash, number);
        }
      } catch (err) {
        console.error('Error polling block hash:', err.message);
      }
      setTimeout(poll, 1000);
    }
    poll();
  }
}

async function main() {
  // Subscribe or poll for new block hashes
  await getBlockHashPoller(BLOCK_HASH_ORACLE_URL, async (newHash, newNumber) => {
    console.log(`${new Date()}:\tNew block hash=${newHash}, number=${newNumber}`);
    const forkchoiceParams = [
      {
        headBlockHash: newHash,
        safeBlockHash: newHash,
        finalizedBlockHash: newHash
      },
    ];
    try {
      const result = await engine('engine_forkchoiceUpdatedV3', forkchoiceParams);
      console.log(`${new Date()}:\tForkchoice updated:`, result.payloadStatus.status);
    } catch (e) {
      console.error('Error calling engine_forkchoiceUpdatedV3:', e.message);
    }
  });
}

main().catch(err => {
  console.error('Fake CL error:', err);
  process.exit(1);
});
