import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import express from 'express';
import { dashboardSummary } from '../services/dashboard.js';
import routes from '../routes/dashboardRoutes.js';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Inventory from '../models/Inventory.js';
import CatalogProduct from '../models/CatalogProduct.js';
import ProductSettings from '../models/ProductSettings.js';
import { signToken } from '../utils/token.js';
import { errorHandler } from '../middleware/errorHandler.js';
const group=(status,paymentStatus,paymentMethod,count,total)=>({_id:{status,paymentStatus,paymentMethod},count,total});
test('dashboard distinguishes active orders, recorded payments, and delivered unpaid COD amounts',()=>{
 const data=dashboardSummary([group('placed','unpaid','cod',2,5600),group('delivered','unpaid','cod',3,15000),group('delivered','paid','cod',1,5000),group('cancelled','unpaid','cod',1,2800),group('processing','unpaid',undefined,1,3000),group('shipped','paid','cod',1,4000),group('delivered','unpaid',undefined,1,1000)],[]);
 assert.equal(data.orders.total,10);assert.equal(data.orders.active,4);assert.equal(data.orders.recordedPayments,9000);assert.equal(data.orders.deliveredCashDue,15000);assert.equal(data.orders.deliveredCashOrders,3);assert.equal(data.orders.byStatus.delivered,5);
});
test('low stock excludes hidden products, includes zero quantities, and limits the sorted preview',()=>{
 const products=Array.from({length:14},(_,index)=>({slug:`product-${index}`,name:`Product ${index}`,variants:[{label:'small',stock:index%6}]}));
 products.push({slug:'hidden',name:'Hidden',isArchived:true,variants:[{label:'small',stock:0}]});
 const data=dashboardSummary([],products,new Date('2026-11-13T00:00:00Z'));
 assert.deepEqual(data.products,{total:15,visible:14,hidden:1,lowStockVariants:14});assert.equal(data.lowStock.length,10);assert.equal(data.lowStock[0].stock,0);assert.ok(data.lowStock.every((entry)=>entry.slug!=='hidden'));assert.equal(data.generatedAt,'2026-11-13T00:00:00.000Z');
});
test('empty stores return zero summaries with every order status present',()=>{
 const data=dashboardSummary([],[]);assert.equal(data.orders.total,0);assert.equal(data.orders.recordedPayments,0);assert.equal(data.products.total,0);assert.deepEqual(data.lowStock,[]);assert.deepEqual(Object.values(data.orders.byStatus),[0,0,0,0,0]);
});
let server,base,aggregateCalls=0;
const original={user:User.findById,order:Order.aggregate,inventory:Inventory.find,catalog:CatalogProduct.find,settings:ProductSettings.find};
before(async()=>{
 process.env.JWT_SECRET='dashboard-tests';User.findById=async(id)=>({_id:id,role:id==='admin'?'admin':'customer'});
 Order.aggregate=async()=>{aggregateCalls++;return[group('delivered','paid','cod',1,2800)];};Inventory.find=()=>({session:()=>({lean:async()=>[]})});CatalogProduct.find=()=>({sort:()=>({session:()=>({lean:async()=>[]})})});ProductSettings.find=()=>({session:()=>({lean:async()=>[]})});
 const app=express();app.use('/dashboard',routes);app.use(errorHandler);
 server=await new Promise((resolve,reject)=>{const s=app.listen(0,'127.0.0.1',(error)=>error?reject(error):resolve(s));s.on('error',reject);});base=`http://127.0.0.1:${server.address().port}/dashboard`;
});
after(async()=>{User.findById=original.user;Order.aggregate=original.order;Inventory.find=original.inventory;CatalogProduct.find=original.catalog;ProductSettings.find=original.settings;if(server)await new Promise((resolve)=>server.close(resolve));});
test('dashboard totals are admin-only and do not return raw customer records',async()=>{
 assert.equal((await fetch(base)).status,401);assert.equal((await fetch(base,{headers:{Authorization:`Bearer ${signToken('customer')}`}})).status,403);assert.equal(aggregateCalls,0);
 const response=await fetch(base,{headers:{Authorization:`Bearer ${signToken('admin')}`}});assert.equal(response.status,200);const data=await response.json();assert.equal(data.orders.recordedPayments,2800);assert.equal(data.orders.total,1);assert.equal(data.user,undefined);assert.equal(data.email,undefined);assert.equal(aggregateCalls,1);
});
