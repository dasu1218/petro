import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import express from 'express';
import { validateProductDetails, applyProductDetails } from '../services/productDetails.js';
import { applyProductSettings } from '../services/productSettings.js';
import { seedProducts } from '../services/catalog.js';
import { buildBundleOffer } from '../services/bundles.js';
import { defaultBundles } from '../data/bundles.js';
import ProductSettings from '../models/ProductSettings.js';
import CatalogProduct from '../models/CatalogProduct.js';
import Inventory from '../models/Inventory.js';
import User from '../models/User.js';
import routes from '../routes/productRoutes.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { signToken } from '../utils/token.js';
const product = seedProducts[0];
const body = () => ({ name: ' Updated Shampoo ', description: ' A clearer product description. ', category: 'nutrition', badges: ['New', 'New'] });
test('details validation trims text, removes duplicate badges, and whitelists fields', () => {
  const details = validateProductDetails({ ...body(), slug:'forged', variants:[], role:'admin', stock:999 });
  assert.deepEqual(details, { name:'Updated Shampoo', description:'A clearer product description.', category:'nutrition', badges:['New'] });
  for(const patch of [{name:' '},{description:' '},{category:'other'},{badges:['x'.repeat(41)]},{badges:Array(7).fill('New')},{badges:null}])assert.throws(()=>validateProductDetails({...body(),...patch}),{status:400});
});
test('missing nested metadata defaults never clear original product details',()=>{
 const settings=new ProductSettings({slug:product.slug}).toObject();
 assert.equal(applyProductDetails(product, settings),product);
 assert.equal(applyProductDetails(product,null),product);
});
test('description edits preserve URLs, variants, photos, offers, and bundle component names',()=>{
 const settings={details:validateProductDetails(body()),images:[{url:'https://example.com/photo.jpg',publicId:'photo'}],prices:[{label:'250ml',price:2000}],promotion:{enabled:true,label:'Sale',percent:10}};
 const updated=applyProductSettings(product,settings);
 assert.equal(updated.slug,product.slug);assert.equal(updated.name,'Updated Shampoo');assert.equal(updated.variants[0].label,'250ml');assert.equal(updated.variants[0].stock,product.variants[0].stock);assert.equal(updated.variants[0].price,1800);assert.equal(updated.images[0].publicId,'photo');
 const bundle=buildBundleOffer(defaultBundles[0],[updated,...seedProducts.slice(1)]);assert.equal(bundle.items[0].name,'Updated Shampoo');
});
let server,base;
let stored={slug:product.slug,images:[{url:'https://example.com/photo.jpg',publicId:'photo'}],prices:[{label:'250ml',price:2000}],promotion:{enabled:false}};
const original={s:ProductSettings.find,u:ProductSettings.findOneAndUpdate,c:CatalogProduct.find,i:Inventory.find,user:User.findById};
before(async()=>{
 process.env.JWT_SECRET='details-tests-only';
 ProductSettings.find=()=>({lean:async()=>[stored],session:()=>({lean:async()=>[stored]})});
 ProductSettings.findOneAndUpdate=async(_filter,{$set})=>{stored={...stored,...$set};};
 CatalogProduct.find=()=>({sort:()=>({session:()=>({lean:async()=>[]})})});
 Inventory.find=()=>({session:()=>({lean:async()=>[]})});
 User.findById=async(id)=>({_id:id,role:id==='admin'?'admin':'customer'});
 const app=express();app.use(express.json());app.use('/products',routes);app.use(errorHandler);
 server=await new Promise((resolve,reject)=>{const s=app.listen(0,'127.0.0.1',(error)=>error?reject(error):resolve(s));s.on('error',reject);});base=`http://127.0.0.1:${server.address().port}/products`;
});
after(async()=>{ProductSettings.find=original.s;ProductSettings.findOneAndUpdate=original.u;CatalogProduct.find=original.c;Inventory.find=original.i;User.findById=original.user;if(server)await new Promise((resolve)=>server.close(resolve));});
const patch=(slug,user,payload)=>fetch(`${base}/${slug}/details`,{method:'PATCH',headers:{'Content-Type':'application/json',...(user?{Authorization:`Bearer ${signToken(user)}`}:{})},body:JSON.stringify(payload)});
test('only admins can edit details and both catalogs reflect the saved fields',async()=>{
 assert.equal((await patch(product.slug,null,body())).status,401);assert.equal((await patch(product.slug,'customer',body())).status,403);
 assert.equal((await patch('unknown','admin',body())).status,404);
 assert.equal((await patch(product.slug,'admin',body())).status,200);
 assert.equal(stored.images[0].publicId,'photo');assert.equal(stored.prices[0].price,2000);
 const publicData=await(await fetch(base)).json();assert.equal(publicData.products[0].name,'Updated Shampoo');assert.equal(publicData.products[0].category,'nutrition');assert.equal(publicData.products[0].variants[0].price,2000);
 const adminData=await(await fetch(`${base}/admin`,{headers:{Authorization:`Bearer ${signToken('admin')}`}})).json();assert.equal(adminData.products[0].description,'A clearer product description.');
});
