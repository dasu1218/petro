import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import express from 'express';
import User from '../models/User.js';
import routes from '../routes/inventoryRoutes.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { signToken } from '../utils/token.js';
import { publicRestock, restockProduct, validateRestock } from '../services/restocking.js';
const slug='new-product';
const body=()=>({variantLabel:'250ml',quantity:3,reason:' Supplier delivery ',requestId:'restock-request-123'});
function database() {
  const state={stock:new Map(),entries:[],fail:false,ended:0};
  const deps={
    Restock:{findOne:({user,requestId})=>({select:async()=>state.entries.find((entry)=>entry.user===user&&entry.requestId===requestId)}),create:async([data])=>{if(state.fail)throw new Error('History unavailable');const entry={...data,_id:'entry-1',createdAt:new Date()};state.entries.push(entry);return[entry];}},
    Inventory:{updateOne:async({key},update)=>{if(!state.stock.has(key))state.stock.set(key,update.$setOnInsert.stock);},findOneAndUpdate:async({key,stock},update)=>{if(state.stock.get(key)>stock.$lte)return null;state.stock.set(key,state.stock.get(key)+update.$inc.stock);return{stock:state.stock.get(key)};}},
    getBaseCatalog:async()=>[{slug,variants:[{label:'250ml',stock:5}]}],
    startSession:async()=>({withTransaction:async(callback)=>{const stock=new Map(state.stock),entries=[...state.entries];try{return await callback();}catch(error){state.stock=stock;state.entries=entries;throw error;}},endSession:async()=>{state.ended++;}}),
  };return{state,deps};
}
test('stock addition validates positive integer quantities, note and request ID',()=>{
 for(const patch of [{quantity:0},{quantity:-1},{quantity:1.5},{quantity:1000001},{reason:' '},{requestId:'bad'},{variantLabel:''}])assert.throws(()=>validateRestock(slug,{...body(),...patch}),{status:400});
 assert.equal(validateRestock(slug,body()).reason,'Supplier delivery');
});
test('first addition initializes product stock and records a private audit entry',async()=>{
 const{state,deps}=database();const result=await restockProduct('admin',slug,{...body(),user:'forged',stockAfter:999},deps);
 assert.equal(state.stock.get(`${slug}:250ml`),8);assert.equal(result.restock.user,'admin');assert.equal(result.restock.stockAfter,8);assert.equal(result.replayed,false);assert.equal(state.ended,1);
 const publicData=publicRestock(result.restock);assert.equal(publicData.user,undefined);assert.equal(publicData.requestHash,undefined);assert.equal(publicData.requestId,undefined);
});
test('restocking increments remaining stock after orders rather than replacing it with initial stock',async()=>{
 const{state,deps}=database();state.stock.set(`${slug}:250ml`,2);await restockProduct('admin',slug,body(),deps);assert.equal(state.stock.get(`${slug}:250ml`),5);
});
test('retries do not double-add stock and request IDs cannot change their details',async()=>{
 const{state,deps}=database();await restockProduct('admin',slug,body(),deps);assert.equal((await restockProduct('admin',slug,body(),deps)).replayed,true);assert.equal(state.stock.get(`${slug}:250ml`),8);
 await assert.rejects(restockProduct('admin',slug,{...body(),quantity:4},deps),{status:409});assert.equal(state.entries.length,1);
});
test('failed history writes roll back stock changes and unknown variants do not create inventory',async()=>{
 const{state,deps}=database();state.fail=true;await assert.rejects(restockProduct('admin',slug,body(),deps),/History unavailable/);assert.equal(state.stock.size,0);assert.equal(state.entries.length,0);assert.equal(state.ended,1);
 state.fail=false;await assert.rejects(restockProduct('admin',slug,{...body(),variantLabel:'missing'},deps),{status:404});assert.equal(state.stock.size,0);
});
test('unreasonably large stock totals are rejected without changing the current quantity',async()=>{
 const{state,deps}=database();state.stock.set(`${slug}:250ml`,1000000000);await assert.rejects(restockProduct('admin',slug,body(),deps),{status:409});assert.equal(state.stock.get(`${slug}:250ml`),1000000000);
});
let server,base;const originalUser=User.findById;
before(async()=>{
 process.env.JWT_SECRET='stock-tests-only';User.findById=async(id)=>({_id:id,role:id==='admin'?'admin':'customer'});
 const app=express();app.use(express.json());app.use('/inventory',routes);app.use(errorHandler);
 server=await new Promise((resolve,reject)=>{const s=app.listen(0,'127.0.0.1',(error)=>error?reject(error):resolve(s));s.on('error',reject);});base=`http://127.0.0.1:${server.address().port}/inventory/${slug}`;
});
after(async()=>{User.findById=originalUser;if(server)await new Promise((resolve)=>server.close(resolve));});
test('inventory reads and mutations are admin-only; malformed admin requests fail before persistence',async()=>{
 for(const method of ['GET','POST'])for(const user of [null,'customer']){const response=await fetch(base,{method,headers:user?{Authorization:`Bearer ${signToken(user)}`}:{}});assert.equal(response.status,user?403:401);}
 const response=await fetch(base,{method:'POST',headers:{Authorization:`Bearer ${signToken('admin')}`,'Content-Type':'application/json'},body:JSON.stringify({...body(),quantity:0})});assert.equal(response.status,400);
});
