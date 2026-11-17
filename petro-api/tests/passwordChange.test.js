import assert from 'node:assert/strict';
import { before, beforeEach, after, test } from 'node:test';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import authRoutes from '../routes/authRoutes.js';
import profileRoutes from '../routes/profileRoutes.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { signToken, verifyToken } from '../utils/token.js';
let user, server, base, writes;
const id='507f1f77bcf86cd799439011';
const original={find:User.findById,one:User.findOne,update:User.collection.updateOne};
beforeEach(()=>{
 user=new User({_id:id,name:'Customer',email:'customer@example.com',password:bcrypt.hashSync('old-password',4),tokenVersion:0,__v:0});
 user.isNew=false;writes=[];
});
before(async()=>{
 process.env.JWT_SECRET='password-change-tests';
 User.findById=(key)=>({then:(resolve,reject)=>Promise.resolve(String(key)===id?user:null).then(resolve,reject),select:async()=>String(key)===id?user:null});
 User.findOne=({email})=>({select:async()=>email===user.email?user:null});
 // Real Mongoose validation and pre-save password hashing run; only the DB write is mocked.
 User.collection.updateOne=async(filter,update)=>{writes.push({filter,update});return{acknowledged:true,matchedCount:1,modifiedCount:1};};
 const app=express();app.use(express.json());app.use('/auth',authRoutes);app.use('/profile',profileRoutes);app.use(errorHandler);
 server=await new Promise((resolve,reject)=>{const s=app.listen(0,'127.0.0.1',(error)=>error?reject(error):resolve(s));s.on('error',reject);});base=`http://127.0.0.1:${server.address().port}`;
});
after(async()=>{User.findById=original.find;User.findOne=original.one;User.collection.updateOne=original.update;if(server)await new Promise((resolve)=>server.close(resolve));});
const request=(path,method='GET',body,token)=>fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});
const change=(body,token=signToken(id))=>request('/profile/password','PUT',body,token);
test('password change requires login and a correct current password',async()=>{
 assert.equal((await request('/profile/password','PUT',{currentPassword:'old-password',newPassword:'new-password'})).status,401);
 assert.equal((await change({currentPassword:'wrong',newPassword:'new-password'})).status,403);
 assert.equal(writes.length,0);assert.equal(user.tokenVersion,0);
});
test('invalid, reused, and overly long multibyte passwords never write account changes',async()=>{
 for(const body of [{currentPassword:'old-password',newPassword:'short'},{currentPassword:{},newPassword:'new-password'},{currentPassword:'old-password',newPassword:'🙂'.repeat(20)},{currentPassword:'old-password',newPassword:'old-password'}])assert.equal((await change(body)).status,400);
 assert.equal(writes.length,0);
});
test('password changes hash the new password, preserve the role, and invalidate every old token',async()=>{
 const first=signToken(id),second=signToken(id);const response=await change({currentPassword:'old-password',newPassword:'new-password',role:'admin',tokenVersion:0},first);
 assert.equal(response.status,200);const result=await response.json();assert.equal(result.user,undefined);assert.equal(result.password,undefined);assert.equal(user.role,'customer');assert.equal(user.tokenVersion,1);assert.notEqual(user.password,'new-password');assert.equal(await user.matchPassword('new-password'),true);assert.equal(writes.length,1);assert.equal(writes[0].update.$set.tokenVersion,1);assert.notEqual(writes[0].update.$set.password,'new-password');
 for(const token of [first,second])assert.equal((await request('/auth/me','GET',undefined,token)).status,401);
 assert.equal((await request('/auth/login','POST',{email:user.email,password:'old-password'})).status,401);
 const login=await(await request('/auth/login','POST',{email:user.email,password:'new-password'})).json();assert.equal(verifyToken(login.token).version,1);assert.equal((await request('/auth/me','GET',undefined,login.token)).status,200);assert.equal(login.user.password,undefined);assert.equal(login.user.tokenVersion,undefined);
});
test('legacy tokens without a version work before a password change and fail afterward',async()=>{
 const token=jwt.sign({id},process.env.JWT_SECRET);
 assert.equal((await request('/auth/me','GET',undefined,token)).status,200);
 assert.equal((await change({currentPassword:'old-password',newPassword:'new-password'},token)).status,200);
 assert.equal((await request('/auth/me','GET',undefined,token)).status,401);
});
