import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {defaultExperience} from '../shared/experience.mjs';
const port=Number(process.env.RUDELBAR_QA_PORT||8836),cms='http://localhost:'+port,guest='http://localhost:'+(port+1),qa=new URL('../.qa/',import.meta.url);
if(!Number.isInteger(port)||port<1024||port>65534)throw Error('Invalid local port.');
let cookie='',csrf='';
async function api(path,method='GET',input){
 const r=await fetch(cms+path,{method,headers:{Origin:cms,...(cookie?{Cookie:cookie}:{}),...(csrf?{'X-CSRF-Token':csrf}:{}),...(input?{'Content-Type':'application/json'}:{})},...(input?{body:JSON.stringify(input)}:{})});
 const d=await r.json();assert.ok(r.ok,path+': '+JSON.stringify(d));return {r,d};
}
const signed=await api('/api/login','POST',JSON.parse(await readFile(new URL('isolated-credentials.json',qa),'utf8')));cookie=signed.r.headers.getSetCookie().map(c=>c.split(';')[0]).filter(c=>!c.endsWith('=')).join('; ');csrf=(await api('/api/session')).d.user.csrf;
const event=(await api('/api/abend/events','POST',{title:'Vier Gewinnformate · isolierte Prüfung',date:'2027-06-13',time:'18 Uhr',venue:'Nur lokale Vorschau',visibility:'public'})).d.event,eventId=event.eventId;
const actions=[['direct','Direkte Ziehung'],['virtual','Virtuelle Lose'],['wheel','Echtes Glücksrad'],['cards','Echte Gewinnkarten']].map(([format,title])=>({id:format,title:title+' · lokale Prüfung',format,admission:'profile',entryScope:'action',minAge:0,publicWinners:false,redeemAfterClose:false,rulesVersion:'qa-v1',rules:'Nur lokale Funktionsprüfung. Keine realen Teilnahmen, Gewinne oder Verpflichtungen.',privacyUrl:'https://example.test/privacy',issueProcess:'',ageCheckPolicy:'Keine beschränkten Preise.',noShowPolicy:'Nicht abgeholte fiktive Gewinne verfallen.',entryLimit:10,maxAwards:3,claimMinutes:60,retentionDays:1,prizes:[{id:'gift',name:'Nur fiktiver Platzhalter',quantity:3,minAge:0,alcohol:false,alternativeId:''}],wheelOutcomes:format==='wheel'?['gift','none']:[],cards:format==='cards'?['A','B','C'].map((mark,i)=>({id:'card-'+i,mark:'Karte '+mark,prizeId:'gift'})):[]}));
await api('/api/abend/events/'+eventId,'PUT',{...defaultExperience(eventId),raffle:{enabled:true,actions}});const review=(await api('/api/abend/events/'+eventId+'/check')).d;assert.equal(review.ok,true);await api('/api/abend/events/'+eventId+'/open','POST',{reviewToken:review.token,operationKey:crypto.randomUUID()});
for(const action of actions)await api('/api/raffle/start?'+new URLSearchParams({abend:eventId,aktion:action.id}),'POST',{});
await writeFile(new URL('raffle-preview-context.json',qa),JSON.stringify({cms,guest,eventId,cookie,csrf}),{mode:0o600});
console.log(JSON.stringify({isolated:true,eventId,guestUrl:guest+'/?abend='+eventId,teamUrl:cms+'/team?abend='+eventId}));
