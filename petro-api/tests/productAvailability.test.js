import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import express from 'express';
import ProductSettings from '../models/ProductSettings.js';
import CatalogProduct from '../models/CatalogProduct.js';
import Inventory from '../models/Inventory.js';
import User from '../models/User.js';
import routes from '../routes/productRoutes.js';
import { normalizeCartItems } from '../services/cartItems.js';
import { buildBundleOffer } from '../services/bundles.js';
import { defaultBundles } from '../data/bundles.js';
import { seedProducts, getCatalog } from '../services/catalog.js';
import { signToken } from '../utils/token.js';
import { errorHandler } from '../middleware/errorHandler.js';
const slug=seedProducts[0].slug;
let stored={slug,images:[{url:'https://example.com/photo.jpg',publicId:'photo'}],prices:[],promotion:{enabled:false}},server,base;
const original={s:ProductSettings.find,u:ProductSettings.findOneAndUpdate,c:CatalogProduct.find,i:Inventory.find,user:User.findById};
before(async()=>{
 process.env.JWT_SECRET='availability-tests';ProductSettings.find=()=>({lean:async()=>[stored],session:()=>({lean:async()=>[stored]})});
 ProductSettings.findOneAndUpdate=async(_filter,{$set})=>{stored={...stored,...$set};};CatalogProduct.find=()=>({sort:()=>({session:()=>({lean:async()=>[]})})});
 Inventory.find=()=>({session:()=>({lean:async()=>[]})});User.findById=async(id)=>({_id:id,role:id==='admin'?'admin':'customer'});
 const app=express();app.use(express.json());app.use('/products',routes);app.use(errorHandler);
 server=await new Promise((resolve,reject)=>{const s=app.listen(0,'127.0.0.1',(error)=>error?reject(error):resolve(s));s.on('error',reject);});base=`http://127.0.0.1:${server.address().port}/products`;
});
after(async()=>{ProductSettings.find=original.s;ProductSettings.findOneAndUpdate=original.u;CatalogProduct.find=original.c;Inventory.find=original.i;User.findById=original.user;if(server)await new Promise((resolve)=>server.close(resolve));});
const patch=(user,body)=>fetch(`${base}/${slug}/availability`,{method:'PATCH',headers:{'Content-Type':'application/json',...(user?{Authorization:`Bearer ${signToken(user)}`}:{})},body:JSON.stringify(body)});
test('only admins may change visibility and the flag must be boolean',async()=>{
 assert.equal((await patch(null,{isArchived:true})).status,401);assert.equal((await patch('customer',{isArchived:true})).status,403);assert.equal((await patch('admin',{isArchived:'true'})).status,400);
});
test('hidden products leave the public catalog but remain editable, and restore without losing photos or stock',async()=>{
 assert.equal((await patch('admin',{isArchived:true,stock:0})).status,200);
 const data=await(await fetch(base)).json();assert.ok(!data.products.some((product)=>product.slug===slug));assert.ok(data.unavailableSlugs.includes(slug));
 const admin=await(await fetch(`${base}/admin`,{headers:{Authorization:`Bearer ${signToken('admin')}`}})).json();assert.ok(admin.products.some((product)=>product.slug===slug&&product.settings.isArchived));
 assert.equal(stored.images[0].publicId,'photo');assert.equal(stored.stock,undefined);
 assert.equal(buildBundleOffer(defaultBundles[0],await getCatalog()),null);
 await patch('admin',{isArchived:false});const restored=await getCatalog();assert.equal(restored.find((product)=>product.slug===slug).variants[0].stock,seedProducts[0].variants[0].stock);assert.ok(buildBundleOffer(defaultBundles[0],restored));
});
test('cart sync can drop unavailable lines while order validation stays strict',()=>{
 const line={slug,variantLabel:'250ml',quantity:1};assert.deepEqual(normalizeCartItems([line],[],[],{dropUnavailable:true}),[]);
 assert.throws(()=>normalizeCartItems([line],[],[]),{status:400});assert.throws(()=>normalizeCartItems([{...line,quantity:-1}],[],[],{dropUnavailable:true}),{status:400});
});
