import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {sqliteD1} from './sqlite-d1.mjs';import {createSanityBudget,sanityBudgetStatus} from '../lib/sanity-budget.mjs';import {createSanity} from '../lib/sanity.mjs';
const schema=await readFile(new URL('../migrations/0018_sanity_budget.sql',import.meta.url),'utf8');
test('the shared budget caps concurrent attempts atomically, resets days without resetting the monthly cap',async()=>{
 const db=sqliteD1();db.connection.exec(schema);let now=Date.parse('2026-11-11T12:00Z');const env={LIVE_DB:db,RUDELBAR_SANITY_BUDGET:'1',SANITY_DAILY_REQUEST_LIMIT:3,SANITY_MONTHLY_REQUEST_LIMIT:5},budget=createSanityBudget(env,{now:()=>now});
 try{let results=await Promise.allSettled(Array.from({length:50},()=>budget()));assert.equal(results.filter(r=>r.status==='fulfilled').length,3);assert.equal((await sanityBudgetStatus(env)).counts.month_attempts,3);
 now+=86400000;results=await Promise.allSettled(Array.from({length:50},()=>budget()));assert.equal(results.filter(r=>r.status==='fulfilled').length,2);now+=86400000;await assert.rejects(budget,e=>e.status===429);assert.equal((await sanityBudgetStatus(env)).counts.month_attempts,5);
 now=Date.parse('2026-12-01T00:00Z');await budget();assert.equal((await sanityBudgetStatus(env)).counts.month_attempts,1);
 }finally{db.connection.close();}
});
test('exhaustion prevents network access, while coalesced requests spend one attempt',async()=>{
 const db=sqliteD1();db.connection.exec(schema);const env={LIVE_DB:db,RUDELBAR_SANITY_BUDGET:'1',SANITY_DAILY_REQUEST_LIMIT:1};let calls=0;const original=globalThis.fetch;globalThis.fetch=async()=>{calls++;return Response.json({result:[]});};
 try{const beforeRequest=createSanityBudget(env),client=createSanity({projectId:'fixture',dataset:'staging',token:'local-only',memoizeReads:true,beforeRequest});await Promise.all(Array.from({length:50},()=>client.list('rudelAppPerson')));assert.equal(calls,1);await assert.rejects(()=>client.list('rudelAppPartner'),e=>e.status===429);assert.equal(calls,1);}
 finally{globalThis.fetch=original;db.connection.close();}
});
