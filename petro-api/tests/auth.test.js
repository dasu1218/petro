import assert from 'node:assert/strict';
import { before, beforeEach, after, test } from 'node:test';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import express from 'express';
import User from '../models/User.js';
import routes from '../routes/authRoutes.js';
import { protect, admin } from '../middleware/auth.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { verifyToken } from '../utils/token.js';
let server, base, accounts, created;
const original = { one: User.findOne, id: User.findById, create: User.create };
const id = '507f1f77bcf86cd799439011';
const password = bcrypt.hashSync('test-password', 4);
beforeEach(() => { accounts = [new User({ _id: id, name: 'Customer', email: 'customer@example.com', password })]; created = null; });
before(async () => {
  process.env.JWT_SECRET = 'auth-tests-only';
  User.findOne = ({ email }) => {
    const found = accounts.find((user) => user.email === email) || null;
    return { then: (resolve, reject) => Promise.resolve(found).then(resolve, reject), select: async () => found };
  };
  User.findById = async (value) => accounts.find((user) => String(user._id) === value) || null;
  // Persistence is mocked; bcrypt password matching and JWT signing are real.
  User.create = async (body) => { created = body; const user = new User({ ...body, _id: id, password: await bcrypt.hash(body.password,4) }); accounts.push(user); return user; };
  const app = express(); app.use(express.json()); app.use('/auth', routes); app.get('/admin', protect, admin, (_request,response)=>response.json({ok:true})); app.use(errorHandler);
  server=await new Promise((resolve,reject)=>{ const listener=app.listen(0,'127.0.0.1',(error)=>error?reject(error):resolve(listener));listener.on('error',reject); });
  base=`http://127.0.0.1:${server.address().port}`;
});
after(async()=>{User.findOne=original.one;User.findById=original.id;User.create=original.create;if(server)await new Promise((resolve)=>server.close(resolve));});
const request=(path,body,token)=>fetch(base+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});
test('register normalizes account data, ignores role and returns no password',async()=>{
 const response=await request('/auth/register',{name:' New Customer ',email:' NEW@Example.com ',password:'test-password',role:'admin'});assert.equal(response.status,201);
 const data=await response.json();assert.equal(created.name,'New Customer');assert.equal(created.email,'new@example.com');assert.equal(created.role,undefined);assert.equal(data.user.role,'customer');assert.equal(data.user.password,undefined);assert.equal(verifyToken(data.token).id,id);
});
test('register rejects malformed input before accessing persistence',async()=>{
 for(const body of [{name:{},email:'a@b.com',password:'test-password'},{name:' ',email:'a@b.com',password:'test-password'},{name:'Name',email:'bad',password:'test-password'},{name:'Name',email:'a@b.com',password:'short'},{name:'Name',email:'a@b.com',password:'🙂'.repeat(20)}])assert.equal((await request('/auth/register',body)).status,400);
 assert.equal(created,null);
});
test('duplicate registration is rejected',async()=>{assert.equal((await request('/auth/register',{name:'Other',email:'CUSTOMER@example.com',password:'test-password'})).status,409);});
test('login verifies bcrypt and normalizes email without leaking password',async()=>{
 const response=await request('/auth/login',{email:' CUSTOMER@example.com ',password:'test-password'});assert.equal(response.status,200);const data=await response.json();assert.equal(data.user.password,undefined);assert.equal((await request('/auth/me',undefined,data.token)).status,200);assert.equal((await request('/admin',undefined,data.token)).status,403);
});
test('bad credentials and non-string login payloads are rejected',async()=>{
 for(const email of ['customer@example.com','missing@example.com'])assert.equal((await request('/auth/login',{email,password:'wrong'})).status,401);
 for(const body of [{email:'customer@example.com',password:{}},{email:{},password:'test-password'},{}])assert.equal((await request('/auth/login',body)).status,400);
});
test('expired, invalid, wrong-secret and deleted-user tokens fail authentication',async()=>{
 for(const token of ['bad-token',jwt.sign({id},process.env.JWT_SECRET,{expiresIn:-1}),jwt.sign({id},'wrong-secret'),jwt.sign({id:'507f191e810c19729de860ea'},process.env.JWT_SECRET)])assert.equal((await request('/auth/me',undefined,token)).status,401);
 assert.equal((await request('/auth/me')).status,401);
});
