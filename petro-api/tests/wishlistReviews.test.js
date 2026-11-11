import assert from 'node:assert/strict';
import { before, beforeEach, after, test } from 'node:test';
import express from 'express';
import User from '../models/User.js';
import Wishlist from '../models/Wishlist.js';
import Review from '../models/Review.js';
import wishlistRoutes from '../routes/wishlistRoutes.js';
import reviewRoutes from '../routes/reviewRoutes.js';
import { validateReview, publicReview } from '../services/reviews.js';
import { signToken } from '../utils/token.js';
import { errorHandler } from '../middleware/errorHandler.js';
const slug = 'petal-cleanse-shampoo';
let saved, reviews, server, base;
const original = { user: User.findById, wf: Wishlist.find, wu: Wishlist.updateOne, wd: Wishlist.deleteOne, rf: Review.find, ro: Review.findOne, ru: Review.findOneAndUpdate, rd: Review.deleteOne, ra: Review.aggregate };
beforeEach(() => { saved = new Map(); reviews = new Map(); });
before(async () => {
  process.env.JWT_SECRET = 'wishlist-review-tests';
  User.findById = async (id) => ({ _id: id, name: `Customer ${id}` });
  Wishlist.find = ({ user }) => ({ sort: () => ({ lean: async () => [...saved.values()].filter((item) => item.user === user) }) });
  Wishlist.updateOne = async (filter) => saved.set(`${filter.user}:${filter.slug}`, filter);
  Wishlist.deleteOne = async (filter) => saved.delete(`${filter.user}:${filter.slug}`);
  Review.findOne = async (filter) => reviews.get(`${filter.user}:${filter.slug}`) || null;
  Review.findOneAndUpdate = async (filter, update) => { const review = { ...filter, ...update.$set, _id: `${filter.user}-review`, updatedAt: new Date() }; reviews.set(`${filter.user}:${filter.slug}`, review); return review; };
  Review.deleteOne = async (filter) => reviews.delete(`${filter.user}:${filter.slug}`);
  Review.find = ({ slug }) => ({ sort: () => ({ skip: () => ({ limit: async () => [...reviews.values()].filter((item) => item.slug === slug) }) }) });
  Review.aggregate = async ([match]) => { const items = [...reviews.values()].filter((item) => item.slug === match.$match.slug); return items.length ? [{ count: items.length, rating: items.reduce((sum, item) => sum + item.rating, 0) / items.length }] : []; };
  const app = express(); app.use(express.json()); app.use('/wishlist', wishlistRoutes); app.use('/reviews', reviewRoutes); app.use(errorHandler);
  server = await new Promise((resolve, reject) => { const listener = app.listen(0, '127.0.0.1', (error) => error ? reject(error) : resolve(listener)); listener.on('error', reject); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { User.findById=original.user; Wishlist.find=original.wf; Wishlist.updateOne=original.wu; Wishlist.deleteOne=original.wd; Review.find=original.rf; Review.findOne=original.ro; Review.findOneAndUpdate=original.ru; Review.deleteOne=original.rd; Review.aggregate=original.ra; if(server) await new Promise((resolve)=>server.close(resolve)); });
const request = (path, method='GET', user, body) => fetch(base+path, { method, headers: { 'Content-Type':'application/json', ...(user ? {Authorization:`Bearer ${signToken(user)}`} : {}) }, body:body===undefined?undefined:JSON.stringify(body) });
test('review validation rejects invalid scores and blank or oversized comments', () => {
  for (const input of [null,{rating:0,comment:'x'},{rating:6,comment:'x'},{rating:4.5,comment:'x'},{rating:4,comment:' '},{rating:4,comment:'x'.repeat(1001)}]) assert.throws(()=>validateReview(input),{status:400});
  assert.deepEqual(validateReview({rating:5,comment:' Good ',user:'forged'}),{rating:5,comment:'Good'});
  assert.equal(publicReview({_id:'id',user:'private',email:'private',rating:5,comment:'Good'}).user,undefined);
});
test('wishlist and review mutations require login',async()=>{
  for(const [path,method] of [['/wishlist','GET'],[`/wishlist/${slug}`,'PUT'],[`/wishlist/${slug}`,'DELETE'],[`/reviews/${slug}`,'PUT'],[`/reviews/${slug}`,'DELETE'],[`/reviews/${slug}/mine`,'GET']]) assert.equal((await request(path,method)).status,401);
});
test('wishlist saves are idempotent and isolated by account',async()=>{
  await request(`/wishlist/${slug}`,'PUT','alice',{user:'bob'}); await request(`/wishlist/${slug}`,'PUT','alice');
  assert.equal(saved.size,1); assert.deepEqual((await(await request('/wishlist','GET','bob')).json()).slugs,[]);
  await request(`/wishlist/${slug}`,'DELETE','bob'); assert.equal(saved.size,1);
  await request(`/wishlist/${slug}`,'DELETE','alice'); assert.equal(saved.size,0);
  assert.equal((await request('/wishlist/unknown','PUT','alice')).status,404);
});
test('customers update only their own review and public summaries reflect submitted ratings',async()=>{
  await request(`/reviews/${slug}`,'PUT','alice',{rating:5,comment:'Great',user:'bob',authorName:'Forged'});
  await request(`/reviews/${slug}`,'PUT','alice',{rating:3,comment:'Updated'});
  await request(`/reviews/${slug}`,'PUT','bob',{rating:5,comment:'Good'});
  assert.equal(reviews.size,2);
  const data=await(await request(`/reviews/${slug}`)).json(); assert.equal(data.count,2);assert.equal(data.rating,4);assert.equal(data.reviews[0].authorName,'Customer alice');assert.equal(data.reviews[0].user,undefined);
  assert.equal((await(await request(`/reviews/${slug}/mine`,'GET','alice')).json()).review.comment,'Updated');
  await request(`/reviews/${slug}`,'DELETE','alice'); assert.equal(reviews.size,1);assert.ok(reviews.has(`bob:${slug}`));
});
test('empty reviews have no fabricated rating and invalid pages/products are rejected',async()=>{
  const data=await(await request(`/reviews/${slug}`)).json();assert.equal(data.rating,null);assert.equal(data.count,0);
  assert.equal((await request(`/reviews/${slug}?page=-1`)).status,400);
  assert.equal((await request('/reviews/unknown')).status,404);
});
