import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import express from 'express';
import cors from 'cors';
import { allowedOrigins, corsOrigin, validateRuntime } from '../config/runtime.js';
const production = { NODE_ENV: 'production', CLIENT_URL: 'https://petro.example.com', MONGO_URI: 'mongodb://test', JWT_SECRET: 'a'.repeat(48), CLOUDINARY_CLOUD_NAME: 'cloud', CLOUDINARY_API_KEY: 'key', CLOUDINARY_API_SECRET: 'secret' };
test('runtime accepts exact configured frontend origins and preserves local development', () => {
  assert.deepEqual(allowedOrigins({}), ['http://localhost:5173']);
  assert.deepEqual(validateRuntime(production), ['https://petro.example.com']);
  assert.deepEqual(allowedOrigins({ CLIENT_URL: 'http://localhost:5173, https://preview.example.com/' }), ['http://localhost:5173', 'https://preview.example.com']);
});
test('production rejects incomplete settings, weak secrets, insecure origins and URL paths', () => {
  for (const patch of [{ CLIENT_URL: '' }, { CLIENT_URL: 'http://petro.example.com' }, { CLIENT_URL: '*' }, { CLIENT_URL: 'https://petro.example.com/path' }, { CLIENT_URL: 'https://user:pass@petro.example.com' }, { JWT_SECRET: 'short' }, { JWT_SECRET: 'replace_with_a_random_secret_of_at_least_32_characters' }, { MONGO_URI: '' }, { CLOUDINARY_API_SECRET: '' }]) assert.throws(() => validateRuntime({ ...production, ...patch }));
});
let server, base;
before(async () => {
  const app = express(); app.use(cors({ origin: corsOrigin(allowedOrigins(production)), credentials: true })); app.get('/health', (_request,response)=>response.json({ok:true}));
  server=await new Promise((resolve,reject)=>{const s=app.listen(0,'127.0.0.1',(error)=>error?reject(error):resolve(s));s.on('error',reject);});base=`http://127.0.0.1:${server.address().port}/health`;
});
after(async()=>{if(server)await new Promise((resolve)=>server.close(resolve));});
test('CORS allows only configured browser origins and supports health probes without Origin',async()=>{
 const allowed=await fetch(base,{headers:{Origin:'https://petro.example.com'}});assert.equal(allowed.headers.get('access-control-allow-origin'),'https://petro.example.com');
 const denied=await fetch(base,{headers:{Origin:'https://petro.example.com.evil.test'}});assert.equal(denied.headers.get('access-control-allow-origin'),null);
 assert.equal((await fetch(base)).status,200);
 const preflight=await fetch(base,{method:'OPTIONS',headers:{Origin:'https://petro.example.com','Access-Control-Request-Method':'PUT'}});assert.equal(preflight.status,204);assert.equal(preflight.headers.get('access-control-allow-origin'),'https://petro.example.com');
});
