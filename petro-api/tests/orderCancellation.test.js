import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cancelOrder, reservedStock } from '../services/orderCancellation.js';
const originalOrder = () => ({ _id:'order-1',status:'placed',paymentStatus:'unpaid',statusHistory:[],items:[
 {quantity:2,components:[{slug:'shampoo',variantLabel:'250ml',quantity:1}]},
 {quantity:3,components:[{slug:'shampoo',variantLabel:'250ml',quantity:1},{slug:'tonic',variantLabel:'120ml',quantity:2}]},
] });
function database() {
 const state={order:originalOrder(),stock:new Map([['shampoo:250ml',10],['tonic:120ml',20]]),ended:0,stale:false};
 const deps={Order:{findById:()=>({session:async()=>state.order}),findOneAndUpdate:async(filter,update)=>{
  if(state.stale||state.order.status!==filter.status||state.order.paymentStatus!==filter.paymentStatus)return null;
  state.order={...state.order,...update.$set,statusHistory:[...state.order.statusHistory,update.$push.statusHistory]};return state.order;
 }},Inventory:{findOneAndUpdate:async({key,stock},{$inc})=>{const current=state.stock.get(key);if(current===undefined||current>stock.$lte)return null;state.stock.set(key,current+$inc.stock);return{stock:state.stock.get(key)};}},startSession:async()=>({withTransaction:async(callback)=>{
  const order=structuredClone(state.order),stock=new Map(state.stock);try{return await callback();}catch(error){state.order=order;state.stock=stock;throw error;}
 },endSession:async()=>{state.ended++;}})};return{state,deps};
}
test('reservation snapshots combine shared product and bundle components',()=>{
 const stock=reservedStock(originalOrder());assert.equal(stock.get('shampoo:250ml'),5);assert.equal(stock.get('tonic:120ml'),6);
 for(const order of [{items:[]},{items:[{quantity:1,components:[]}]},{items:[{quantity:-1,components:[{slug:'x',variantLabel:'y',quantity:1}]}]}])assert.throws(()=>reservedStock(order),{status:409});
});
test('cancellation restores stock once and records the original reason and admin',async()=>{
 const{state,deps}=database();const result=await cancelOrder('order-1','admin',{reason:' Customer requested cancellation ',cancelledBy:'forged'},deps);
 assert.equal(result.replayed,false);assert.equal(state.stock.get('shampoo:250ml'),15);assert.equal(state.stock.get('tonic:120ml'),26);assert.equal(state.order.status,'cancelled');assert.equal(state.order.cancellation.reason,'Customer requested cancellation');assert.equal(state.order.cancellation.cancelledBy,'admin');assert.equal(state.order.statusHistory.length,1);
 const retry=await cancelOrder('order-1','other-admin',{reason:'Different retry reason'},deps);assert.equal(retry.replayed,true);assert.equal(state.stock.get('shampoo:250ml'),15);assert.equal(state.order.cancellation.cancelledBy,'admin');assert.equal(state.order.statusHistory.length,1);
});
test('processing orders can be cancelled but shipped, delivered, and paid orders cannot',async()=>{
 const allowed=database();allowed.state.order.status='processing';await cancelOrder('order-1','admin',{reason:'Requested'},allowed.deps);assert.equal(allowed.state.order.status,'cancelled');
 for(const patch of [{status:'shipped'},{status:'delivered'},{paymentStatus:'paid'},{status:'cancelled'}]){const{state,deps}=database();Object.assign(state.order,patch);await assert.rejects(cancelOrder('order-1','admin',{reason:'Requested'},deps),{status:409});assert.equal(state.stock.get('shampoo:250ml'),10);}
});
test('missing inventory rolls back both the cancellation and earlier component restorations',async()=>{
 const{state,deps}=database();state.stock.delete('tonic:120ml');await assert.rejects(cancelOrder('order-1','admin',{reason:'Requested'},deps),{status:409});assert.equal(state.order.status,'placed');assert.equal(state.order.cancellation,undefined);assert.equal(state.stock.get('shampoo:250ml'),10);assert.equal(state.ended,1);
});
test('stale orders and missing stock snapshots cannot restore inventory',async()=>{
 const stale=database();stale.state.stale=true;await assert.rejects(cancelOrder('order-1','admin',{reason:'Requested'},stale.deps),{status:409});assert.equal(stale.state.stock.get('shampoo:250ml'),10);
 const incomplete=database();incomplete.state.order.items[0].components=[];await assert.rejects(cancelOrder('order-1','admin',{reason:'Requested'},incomplete.deps),{status:409});assert.equal(incomplete.state.order.status,'placed');
});
test('invalid reasons fail before database work and unknown orders return 404',async()=>{
 const{state,deps}=database();for(const reason of [null,' ','x'.repeat(201)])await assert.rejects(cancelOrder('order-1','admin',{reason},deps),{status:400});assert.equal(state.ended,0);
 state.order=null;await assert.rejects(cancelOrder('unknown','admin',{reason:'Requested'},deps),{status:404});assert.equal(state.ended,1);
});
