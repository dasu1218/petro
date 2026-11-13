import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import express from 'express';
import User from '../models/User.js';
import Order from '../models/Order.js';
import routes from '../routes/orderRoutes.js';
import { orderHistoryQuery } from '../services/orderHistory.js';
import { signToken } from '../utils/token.js';
import { errorHandler } from '../middleware/errorHandler.js';
test('order history validates paging and whitelists filters without accepting ownership',()=>{
 assert.deepEqual(orderHistoryQuery({page:'2',status:'shipped',payment:'paid',user:'other'}),{page:2,filter:{status:'shipped',paymentStatus:'paid'}});
 for(const query of [{page:'0'},{page:'-1'},{page:'1.5'},{page:'10001'},{page:['1','2']},{status:'unknown'},{payment:'pending'}])assert.throws(()=>orderHistoryQuery(query),{status:400});
});
let server,base,lastFilter;
const records=Array.from({length:24},(_,index)=>({_id:`alice-${index}`,user:'alice',status:index%2?'processing':'delivered',paymentStatus:index%3?'unpaid':'paid',requestHash:'private',requestId:'private'})).concat([{_id:'bob-1',user:'bob',status:'placed',paymentStatus:'unpaid'}]);
const original={user:User.findById,find:Order.find};
before(async()=>{
 process.env.JWT_SECRET='order-history-tests';User.findById=async(id)=>({_id:id});
 Order.find=(filter)=>{lastFilter=filter;return{sort:(sort)=>{assert.deepEqual(sort,{createdAt:-1,_id:-1});return{skip:(skip)=>({limit:async(limit)=>records.filter((record)=>Object.entries(filter).every(([key,value])=>record[key]===value)).slice(skip,skip+limit)})};}};};
 const app=express();app.use(express.json());app.use('/orders',routes);app.use(errorHandler);
 server=await new Promise((resolve,reject)=>{const s=app.listen(0,'127.0.0.1',(error)=>error?reject(error):resolve(s));s.on('error',reject);});base=`http://127.0.0.1:${server.address().port}/orders/my`;
});
after(async()=>{User.findById=original.user;Order.find=original.find;if(server)await new Promise((resolve)=>server.close(resolve));});
const request=(query='',user='alice')=>fetch(base+query,{headers:user?{Authorization:`Bearer ${signToken(user)}`}:{}});
test('paged history returns all owner pages without leaking another account or retry secrets',async()=>{
 assert.equal((await request('',null)).status,401);
 const first=await(await request('?page=1&user=bob')).json();assert.equal(first.orders.length,10);assert.equal(first.hasMore,true);assert.equal(first.orders[0]._id,'alice-0');assert.equal(first.orders[0].requestHash,undefined);assert.equal(lastFilter.user,'alice');
 const second=await(await request('?page=2')).json();assert.equal(second.orders.length,10);assert.equal(second.orders[0]._id,'alice-10');
 const third=await(await request('?page=3')).json();assert.equal(third.orders.length,4);assert.equal(third.hasMore,false);
 assert.equal((await(await request('?page=4')).json()).orders.length,0);
 const bob=await(await request('', 'bob')).json();assert.deepEqual(bob.orders.map((order)=>order._id),['bob-1']);
});
test('status and payment filters combine and invalid queries are rejected',async()=>{
 const data=await(await request('?status=delivered&payment=paid')).json();assert.equal(data.orders.length,4);assert.ok(data.orders.every((order)=>order.status==='delivered'&&order.paymentStatus==='paid'));
 assert.deepEqual(lastFilter,{status:'delivered',paymentStatus:'paid',user:'alice'});
 assert.equal((await request('?status=invalid')).status,400);assert.equal((await request('?page=0')).status,400);
});
