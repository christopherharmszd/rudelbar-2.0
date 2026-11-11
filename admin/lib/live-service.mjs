import {createContextNotices} from './context-notices.mjs';
import {createRaffles} from './raffles.mjs';
import {createContactNotices} from './contact-notices.mjs';
import {createGuestContacts} from './guest-contacts.mjs';
import {createEncounterMedia} from './encounter-media.mjs';
import {createSocialRetention} from './social-retention.mjs';
import {createEncounters} from './encounters.mjs';
import {createSocialConversations} from './social-conversations.mjs';
import {createEncounterSessions} from './encounter-sessions.mjs';
import {createWallNotices} from './wall-notices.mjs';
import {createGuestProfiles} from './guest-profile.mjs';
import {createConversationPush} from './conversation-push.mjs';
import {createConversations} from './conversations.mjs';
import {createReporting} from './reporting.mjs';
import {createGameRounds} from './game-rounds.mjs';
import {createGuestIdentity} from './guest-identity.mjs';
import {validId,stationsFor} from '../../shared/experience.mjs';
import {loadEvent,snapshotFor,peopleFor,guestUrl} from './abend-service.mjs';
import {createNotifications} from './notifications.mjs';
import {managesEvent,runsEvent,seesEvent,editsContent,requirePermission,usesStations,hasRole} from './permissions.mjs';
import {sectionAllowsStation} from '../../shared/content-model.mjs';

const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const text=(value,max,required=false)=>{if(typeof value!=='string'&&value!==undefined&&value!==null)fail('Bitte gültige Texte eingeben.');const s=String(value??'').trim();if(s.length>max||(required&&!s))fail(`Bitte die Angaben prüfen (maximal ${max} Zeichen).`);return s;};
const random=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
export async function digest(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
export const liveCsrf=token=>digest('rudelbar-team-csrf:'+token);
const done=['done','declined','cancelled'];
export function cleanRequest(kind,input){
  const location=text(input.location,160);
  if(kind==='music'||kind==='karaoke'){
    const song=text(input.song,160,true),artist=text(input.artist,160),note=text(input.note,1200);
    const format=kind==='karaoke'?(input.format||'solo'):'';
    if(format&&!['solo','duet','group'].includes(format))fail('Bitte eine gültige Karaoke-Besetzung wählen.');
    return {subject:song+(artist?' · '+artist:''),payload:{song,artist,note,format},location};
  }
  return {subject:text(input.subject,120)||'Nachricht an die Station',payload:{text:text(input.text,2000,true)},location};
}
export function createLiveService(env,client,{getContext,defer,transport}={}){
  const db=env.LIVE_DB;
  const database=()=>{if(!db)fail('Der Live-Bereich wird gerade eingerichtet. Bitte gleich noch einmal versuchen.',503);return db;};
  const first=(sql,args=[])=>database().prepare(sql).bind(...args).first();
  const all=async(sql,args=[])=>((await database().prepare(sql).bind(...args).all()).results||[]);
  const run=(sql,args=[])=>database().prepare(sql).bind(...args).run();
  const contexts=new Map();
  async function context(eventId){
    validId(eventId);
    if(getContext)return getContext(eventId);
    if(client?.runtimeOnly&&contexts.has(eventId))return contexts.get(eventId);
    const work=(async()=>{
    const event=await loadEvent(client,eventId),release=await snapshotFor(client,event),people=await peopleFor(client);
    const staffing=release.config?._staffIds||[];
    return {event:{...event,teamIds:[...new Set([...event.teamIds,...staffing])].filter(pid=>people.some(p=>p.personId===pid&&!p.archived&&!p.deletedAt))},release,people,stations:release.config?stationsFor(release.config).map(s=>({...s,enabled:s.enabled!==false&&sectionAllowsStation(release.config,s)})):[]};
    })();if(client?.runtimeOnly)contexts.set(eventId,work);try{return await work;}catch(error){contexts.delete(eventId);throw error;}
  }
  const notices=createNotifications(env,{context,defer,transport});
  const recipient=actor=>({id:actor.accountId?'u:'+actor.accountId:actor.publisher?'publisher':'p:'+actor.personId,eventId:actor.eventId,audience:'team',publisher:actor.publisher,personId:actor.personId,grantId:actor.accountSessionId||actor.grantId,expiresAt:actor.expiresAt,authVersion:actor.authVersion,stations:stations(actor).map(s=>s.id)});
  const guestRecipient=person=>({id:'v:'+person.id,eventId:person.event_id,audience:'guest',expiresAt:person.expires_at});
  function activity(row,audience,actor,kind,operation){return database().prepare('INSERT INTO live_activity(event_id,request_id,audience,actor,kind,created_at) SELECT ?,?,?,?,?,? FROM live_requests WHERE id=? AND last_operation=?').bind(row.event_id,row.id,audience,actor,kind,Date.now(),row.id,operation);}
  function guestAccess(ctx,accessCode){if(ctx.event.visibility==='private'&&(!accessCode||accessCode!==ctx.event.accessCode))fail('Bitte nutze den Gäste-Link dieses Abends.',404);}
  function requireOpen(ctx){if(ctx.release.state!=='open')fail('Die App für diesen Abend ist geschlossen. Deine bisherigen Nachrichten bleiben lesbar.',409);}
  async function visitor(eventId,sessionToken){
    const [id,secret,extra]=String(sessionToken||'').split('.');
    if(!id||!secret||extra||!/^[a-f0-9]{64}$/.test(secret))fail('Bitte melde dich mit deinem Vornamen an.',401);
    if(env.RUDELBAR_CONNECTED_IDENTITY==='1')return createGuestIdentity(database()).authenticate(eventId,id,await digest(secret));
    const person=await first('SELECT * FROM live_visitors WHERE id=? AND event_id=? AND expires_at>?',[id,eventId,Date.now()]);
    if(!person||person.secret_hash!==await digest(secret))fail('Deine Anmeldung ist abgelaufen. Bitte melde dich erneut an.',401);
    return person;
  }
  async function session({eventId,accessCode,name,sessionToken}){
    const ctx=await context(eventId);guestAccess(ctx,accessCode);
    name=text(name,32,true);
    if(sessionToken){try{const old=await visitor(eventId,sessionToken);await run('UPDATE live_visitors SET name=? WHERE id=?',[name,old.id]);return {name,sessionToken,expiresAt:old.expires_at};}catch(error){if(error.status!==401)throw error;}}
    requireOpen(ctx);
    const id=crypto.randomUUID(),secret=random(),expiresAt=Date.now()+7*86400000;
    await run('INSERT INTO live_visitors(id,event_id,secret_hash,name,created_at,expires_at) VALUES(?,?,?,?,?,?)',[id,eventId,await digest(secret),name,Date.now(),expiresAt]);
    return {name,sessionToken:`${id}.${secret}`,expiresAt};
  }
  function dto(row){return {id:row.id,eventId:row.event_id,stationId:row.station_id,stationName:row.station_name,visitorName:row.visitor_name,kind:row.kind,subject:row.subject,payload:JSON.parse(row.payload_json),location:row.location,status:row.status,createdAt:row.created_at,updatedAt:row.updated_at,queueOrder:row.queue_order,revision:row.revision,preview:row.preview||'',messageCount:row.message_count||0};}
  const select=`SELECT r.*,v.name AS visitor_name FROM live_requests r JOIN live_visitors v ON v.id=r.visitor_id`;
  async function ownRequest(eventId,id,person){const row=await first(select+' WHERE r.id=? AND r.event_id=? AND r.visitor_id=?',[id,eventId,person.id]);if(!row)fail('Anfrage nicht gefunden.',404);return row;}
  async function messages(id,internal){return all(`SELECT id,direction,author_name AS author,body,created_at AS createdAt FROM live_messages WHERE request_id=?${internal?'':" AND direction<>'internal'"} ORDER BY created_at,live_messages.rowid`,[id]);}
  async function mine({eventId,sessionToken,id}){
    const person=await visitor(eventId,sessionToken);
    if(id){const row=await ownRequest(eventId,id,person);return {request:dto(row),messages:await messages(id,false),activitySeq:await notices.sequence(id,'guest')};}
    const rows=await all(`SELECT r.*,v.name AS visitor_name,(SELECT body FROM live_messages WHERE request_id=r.id AND direction<>'internal' ORDER BY created_at DESC,live_messages.rowid DESC LIMIT 1) AS preview,(SELECT COUNT(*) FROM live_messages WHERE request_id=r.id AND direction<>'internal') AS message_count FROM live_requests r JOIN live_visitors v ON v.id=r.visitor_id WHERE r.event_id=? AND r.visitor_id=? ORDER BY r.updated_at DESC LIMIT 100`,[eventId,person.id]);
    return {name:person.name,requests:rows.map(dto)};
  }
  async function submit({eventId,accessCode,sessionToken,stationId,input,clientKey}){
    const person=await visitor(eventId,sessionToken),ctx=await context(eventId);guestAccess(ctx,accessCode);requireOpen(ctx);
    validId(clientKey);validId(stationId);
    const existing=await first(select+' WHERE r.event_id=? AND r.visitor_id=? AND r.client_key=?',[eventId,person.id,clientKey]);if(existing)return {request:dto(existing)};
    const station=ctx.stations.find(s=>s.id===stationId&&s.enabled!==false&&s.contactEnabled!==false);if(!station)fail('Diese Station nimmt aktuell keine neuen Anfragen an.',409);
    const availability=await first('SELECT accepting FROM live_station_state WHERE event_id=? AND station_id=?',[eventId,stationId]);if(availability?.accepting===0)fail('Diese Station hat den Eingang gerade pausiert. Bitte versuche es später erneut.',409);
    const clean=cleanRequest(station.kind,input),id=crypto.randomUUID(),now=Date.now(),operation=crypto.randomUUID();
    const statement=database().prepare(`INSERT OR IGNORE INTO live_requests(id,event_id,station_id,station_name,visitor_id,client_key,kind,subject,payload_json,location,status,created_at,updated_at,queue_order,revision,last_operation) SELECT ?,?,?,?,?,?,?,?,?,?,'new',?,?,?,1,? WHERE (SELECT COUNT(*) FROM live_requests WHERE visitor_id=? AND created_at>?)<10`).bind(id,eventId,stationId,station.name,person.id,clientKey,station.kind,clean.subject,JSON.stringify(clean.payload),clean.location,now,now,now,operation,person.id,now-300000);
    await database().batch([statement,activity({event_id:eventId,id},'team','v:'+person.id,'request',operation)]);
    const saved=await first(select+' WHERE r.event_id=? AND r.visitor_id=? AND r.client_key=?',[eventId,person.id,clientKey]);if(!saved)fail('Du hast schon mehrere Anfragen gesendet. Bitte warte kurz.',429);
    notices.dispatch(eventId);return {request:dto(saved)};
  }
  async function update(row,actor,{status=row.status,reply='',internal=false,stationId=row.station_id,stationName=row.station_name,promote=false,revision}){
    if(!Number.isInteger(revision)||revision!==row.revision)fail('Hier ist inzwischen etwas Neues angekommen. Bitte aktualisieren und erneut versuchen.',409);
    const operation=crypto.randomUUID(),now=Date.now();
    const queue=promote?Number((await first("SELECT MIN(queue_order) AS n FROM live_requests WHERE event_id=? AND station_id=? AND status IN('new','queued','in_progress')",[row.event_id,stationId]))?.n||now)-1:row.queue_order;
    const statements=[database().prepare('UPDATE live_requests SET status=?,station_id=?,station_name=?,updated_at=?,queue_order=?,revision=revision+1,last_operation=? WHERE id=? AND event_id=? AND revision=?').bind(status,stationId,stationName,now,queue,operation,row.id,row.event_id,revision)];
    const direction=actor.visitor?'visitor':internal?'internal':'team';
    if(reply)statements.push(database().prepare('INSERT INTO live_messages(id,request_id,direction,author_name,body,created_at) SELECT ?,?,?,?,?,? FROM live_requests WHERE id=? AND last_operation=?').bind(crypto.randomUUID(),row.id,direction,actor.name,reply,now,row.id,operation));
    if(status!==row.status||stationId!==row.station_id){const labels={new:'Neu eingegangen',queued:'Eingeplant',in_progress:'In Bearbeitung',done:row.kind==='music'?'Gespielt':row.kind==='karaoke'?'Gesungen':'Erledigt',declined:'Nicht möglich',cancelled:'Zurückgezogen'};const body=stationId!==row.station_id?`Weitergeleitet an ${stationName}.`:`Status: ${labels[status]}.`;statements.push(database().prepare("INSERT INTO live_messages(id,request_id,direction,author_name,body,created_at) SELECT ?,?,'system',?,?,? FROM live_requests WHERE id=? AND last_operation=?").bind(crypto.randomUUID(),row.id,actor.name,body,now,row.id,operation));}
    const author=actor.visitor?'v:'+actor.id:actor.accountId?'u:'+actor.accountId:actor.publisher?'publisher':'p:'+actor.personId;
    if(actor.visitor)statements.push(activity(row,'team',author,reply?'reply':'status',operation));
    else{
      if((reply&&!internal)||status!==row.status||stationId!==row.station_id)statements.push(activity(row,'guest',author,reply&&!internal?'reply':'status',operation));
      if(stationId!==row.station_id)statements.push(activity(row,'team',author,'forward',operation));
    }
    const results=await database().batch(statements);if(!results[0].meta.changes)fail('Die Anfrage wurde inzwischen geändert. Bitte aktualisieren.',409);
    notices.dispatch(row.event_id);
    return first(select+' WHERE r.id=?',[row.id]);
  }
  async function guestUpdate({eventId,accessCode,sessionToken,id,input}){
    const person=await visitor(eventId,sessionToken),ctx=await context(eventId);guestAccess(ctx,accessCode);requireOpen(ctx);
    const row=await ownRequest(eventId,id,person),reply=text(input.reply,2000);
    if(input.cancel&&done.includes(row.status))fail('Diese Anfrage ist bereits abgeschlossen.',409);
    if(!input.cancel&&!reply)fail('Bitte eine Nachricht schreiben.');
    if(row.status==='cancelled')fail('Diese Anfrage wurde zurückgezogen. Bitte eine neue Anfrage stellen.',409);
    const count=await first("SELECT COUNT(*) AS n FROM live_messages WHERE request_id=? AND direction='visitor' AND created_at>?",[id,Date.now()-300000]);if(count.n>=30)fail('Bitte warte einen Moment mit weiteren Nachrichten.',429);
    const saved=await update(row,{visitor:true,id:person.id,name:person.name},{revision:input.revision,reply,status:input.cancel?'cancelled':row.kind==='message'&&done.includes(row.status)?'new':row.status});return {request:dto(saved),messages:await messages(id,false),activitySeq:await notices.sequence(id,'guest')};
  }
  async function issueGrant(eventId,personId){
    if(await first('SELECT id FROM app_accounts WHERE person_id=? AND enabled=0',[personId]))fail('Das Benutzerkonto dieser Person ist deaktiviert.',403);
    const ctx=await context(eventId);if(!ctx.event.teamIds.includes(personId)||!ctx.people.some(p=>p.personId===personId&&!p.archived))fail('Bitte eine aktive Person aus dem Abendteam wählen.');
    const id=crypto.randomUUID(),code=random(),now=Date.now(),expiresAt=now+7*86400000;
    await run('INSERT INTO live_grants(id,event_id,person_id,secret_hash,created_at,expires_at) VALUES(?,?,?,?,?,?)',[id,eventId,personId,await digest(code),now,expiresAt]);
    return {id,code,expiresAt};
  }
  async function grants(eventId){return {grants:await all('SELECT id,person_id AS personId,created_at AS createdAt,expires_at AS expiresAt,revoked FROM live_grants WHERE event_id=? ORDER BY created_at DESC',[eventId])};}
  async function revoke(eventId,id){await run('UPDATE live_grants SET revoked=1 WHERE id=? AND event_id=?',[id,eventId]);return {ok:true};}
  async function operator(code){
    if(!/^[a-f0-9]{64}$/.test(String(code||'')))fail('Bitte öffne deinen persönlichen Team-Link.',401);
    const grant=await first('SELECT * FROM live_grants WHERE secret_hash=? AND revoked=0 AND expires_at>?',[await digest(code),Date.now()]);if(!grant)fail('Dieser Team-Zugang ist abgelaufen oder wurde zurückgenommen.',401);
    const ctx=await context(grant.event_id),person=ctx.people.find(p=>p.personId===grant.person_id&&!p.archived&&ctx.event.teamIds.includes(p.personId));
    if(!person)fail('Dieses Profil gehört aktuell nicht zum Abendteam.',403);
    if(await first('SELECT id FROM app_accounts WHERE person_id=? AND enabled=0',[person.personId]))fail('Das Benutzerkonto dieser Person ist deaktiviert.',403);
    return {publisher:false,grantId:grant.id,eventId:grant.event_id,name:person.name,personId:person.personId,ctx,expiresAt:grant.expires_at};
  }
  async function publisher(eventId,name='Redaktion'){return {publisher:true,canModerate:true,eventId,name,personId:null,ctx:await context(eventId)};}
  async function accountActor(eventId,user){
    const ctx=await context(eventId);requirePermission(seesEvent(user,eventId));
    if(!editsContent(user))requirePermission(ctx.event.teamIds.includes(user.personId)&&ctx.people.some(p=>p.personId===user.personId&&!p.archived));
    return {user,canUseStations:usesStations(user,eventId),canModerate:hasRole(user,'admin')||hasRole(user,'moderator',eventId),publisher:runsEvent(user,eventId),canManage:managesEvent(user,eventId),eventId,name:user.name,personId:user.personId,accountId:user.accountId,accountSessionId:user.sessionId,authVersion:user.ver,expiresAt:user.exp,ctx};
  }
  const allowed=(actor,station)=>actor.canUseStations!==false&&(actor.publisher||(!station.operatorIds?.length&&!station.assignmentRequired)||station.operatorIds?.includes(actor.personId));
  const isMessageStation=station=>!['game','wall','raffle','play','dance','dating'].includes(station.functionId);
  function stations(actor){return actor.ctx.stations.filter(s=>isMessageStation(s)&&allowed(actor,s));}
  async function staffContext(actor){
    const flags=await all('SELECT station_id,accepting,revision FROM live_station_state WHERE event_id=?',[actor.eventId]);
    const photos=await stationPhotos(actor.eventId);
    return {event:{id:actor.eventId,title:actor.ctx.event.title,venue:actor.ctx.event.venue,state:actor.ctx.release.state},person:{id:actor.personId,name:actor.name},publisher:actor.publisher,canManage:actor.canManage??actor.publisher,personalAccount:!!actor.accountId,canModerate:actor.canModerate===true,canEncounters:actor.user?(managesEvent(actor.user,actor.eventId)||hasRole(actor.user,'host',actor.eventId)):actor.publisher,canRaffle:actor.user?(managesEvent(actor.user,actor.eventId)||hasRole(actor.user,'raffle',actor.eventId)):actor.publisher,canWall:actor.user?(managesEvent(actor.user,actor.eventId)||hasRole(actor.user,'wall',actor.eventId)):actor.publisher,wallUrl:guestUrl(env.VISITOR_APP_URL||'http://localhost:8799',actor.ctx.event).replace('/?', '/wall.html?'),roundsEnabled:actor.ctx.release.config?.map?.enabled===true&&actor.ctx.release.config.map.layout.booths.some(b=>b.offers.some(o=>o.matching)),stations:stations(actor).map(s=>({id:s.id,name:s.name,kind:s.kind,enabled:s.enabled!==false,accepting:flags.find(f=>f.station_id===s.id)?.accepting!==0,revision:flags.find(f=>f.station_id===s.id)?.revision||0,imageUrl:photos.find(p=>p.station_id===s.id)?.image_url||s.imageUrl||'',photoRevision:photos.find(p=>p.station_id===s.id)?.revision||0,canUpdatePhoto:(actor.canManage??actor.publisher)||s.allowOperatorPhotos===true&&s.operatorIds?.includes(actor.personId)})),destinations:actor.ctx.stations.filter(s=>isMessageStation(s)&&s.enabled!==false&&s.contactEnabled!==false).map(s=>({id:s.id,name:s.name}))};
  }
  async function staffRow(actor,id){const row=await first(select+' WHERE r.id=? AND r.event_id=?',[id,actor.eventId]);if(!row||(!actor.publisher&&!stations(actor).some(s=>s.id===row.station_id)))fail('Diese Anfrage gehört nicht zu deinen Stationen.',404);return row;}
  async function inbox(actor,{id}={}){
    if(id){const row=await staffRow(actor,id);return {request:dto(row),messages:await messages(id,true),activitySeq:await notices.sequence(id,'team')};}
    const ids=stations(actor).map(s=>s.id);if(!actor.publisher&&!ids.length)return {requests:[]};
    const filter=actor.publisher?'':` AND r.station_id IN(${ids.map(()=>'?').join(',')})`;
    const rows=await all(`SELECT r.*,v.name AS visitor_name,(SELECT body FROM live_messages WHERE request_id=r.id ORDER BY created_at DESC,live_messages.rowid DESC LIMIT 1) AS preview FROM live_requests r JOIN live_visitors v ON v.id=r.visitor_id WHERE r.event_id=?${filter} ORDER BY CASE WHEN r.status IN('new','queued','in_progress') THEN 0 ELSE 1 END,r.queue_order,r.created_at LIMIT 500`,[actor.eventId,...(actor.publisher?[]:ids)]);
    return {requests:rows.map(dto)};
  }
  async function staffUpdate(actor,id,input){
    const row=await staffRow(actor,id),reply=text(input.reply,2000),status=input.status||row.status;
    if(!['new','queued','in_progress','done','declined','cancelled'].includes(status)||status==='cancelled'&&row.status!=='cancelled')fail('Ungültiger Status.');
    if(row.status==='cancelled'&&status!=='cancelled')fail('Die Anfrage wurde vom Gast zurückgezogen.');
    let stationId=row.station_id,stationName=row.station_name;
    if(input.stationId&&input.stationId!==row.station_id){const target=actor.ctx.stations.find(s=>s.id===input.stationId&&isMessageStation(s)&&s.enabled!==false&&s.contactEnabled!==false);if(!target)fail('Zielstation nicht gefunden.');stationId=target.id;stationName=target.name;}
    if(!reply&&status===row.status&&stationId===row.station_id&&!input.promote)fail('Bitte eine Aktion oder Nachricht wählen.');
    const saved=await update(row,actor,{revision:input.revision,reply,internal:input.internal===true,status:stationId!==row.station_id?'new':status,stationId,stationName,promote:input.promote===true});return {request:dto(saved),messages:await messages(id,true)};
  }
  async function stationState(actor,stationId,input){
    const station=actor.ctx.stations.find(s=>s.id===stationId);if(!station||!allowed(actor,station))fail('Diese Station gehört nicht zu deinem Bereich.',403);
    if(typeof input.accepting!=='boolean'||!Number.isInteger(input.revision))fail('Ungültige Stationsangabe.');
    const result=await run('INSERT INTO live_station_state(event_id,station_id,accepting,revision) VALUES(?,?,?,1) ON CONFLICT(event_id,station_id) DO UPDATE SET accepting=excluded.accepting,revision=live_station_state.revision+1 WHERE live_station_state.revision=?',[actor.eventId,stationId,input.accepting?1:0,input.revision]);
    if(!result.meta.changes)fail('Der Stationseingang wurde inzwischen geändert. Bitte aktualisieren.',409);return {ok:true};
  }
  async function availability(eventId){const rows=await all('SELECT station_id,accepting FROM live_station_state WHERE event_id=?',[eventId]);return rows;}
  async function stationPhotos(eventId){return all('SELECT station_id,image_url,revision,updated_at FROM live_station_photos WHERE event_id=?',[eventId]);}
  function requireStationPhoto(actor,id){const station=actor.ctx.stations.find(s=>s.id===id);if(!station||!allowed(actor,station)||!((actor.canManage??actor.publisher)||station.allowOperatorPhotos===true&&station.operatorIds?.includes(actor.personId)))fail('Du darfst das Foto dieser Station nicht ändern.',403);return station;}
  async function saveStationPhoto(actor,id,{imageUrl,revision}){
    requireStationPhoto(actor,id);if(!Number.isInteger(revision)||revision<0)fail('Bitte die Station erneut öffnen.');
    if(imageUrl&&!/^https:\/\/cdn\.sanity\.io\/images\/[a-z0-9-]+\/[a-z0-9_-]+\/[a-zA-Z0-9._-]+$/.test(imageUrl))fail('Bitte ein hochgeladenes Bild verwenden.');
    const result=revision===0?await run('INSERT OR IGNORE INTO live_station_photos(event_id,station_id,image_url,revision,updated_at,actor_name) VALUES(?,?,?,1,?,?)',[actor.eventId,id,imageUrl,Date.now(),actor.name]):await run('UPDATE live_station_photos SET image_url=?,revision=revision+1,updated_at=?,actor_name=? WHERE event_id=? AND station_id=? AND revision=?',[imageUrl,Date.now(),actor.name,actor.eventId,id,revision]);
    if(!result.meta.changes)fail('Das Stationsfoto wurde inzwischen geändert. Bitte aktualisieren.',409);return {ok:true};
  }
  async function guestNotice({eventId,sessionToken,action,input={}}){
   const person=await visitor(eventId,sessionToken),who=guestRecipient(person);if(!['list','mark','settings','subscribe','unsubscribe','test'].includes(action))fail('Nicht gefunden.',404);
   if(action==='list'){
    const result=await notices.list(who,input);
    if(env.RUDELBAR_CONNECTED_SOCIAL==='1'){
     await conversations.alertSequences(eventId,result.items,'station');const chats=await conversations.list(person);await conversations.alertSequences(eventId,chats.items,'conversation');const wallItems=await wallNotices.list(person),contextItems=await contextNotices.list(person);result.items=[...result.items,...chats.items,...wallItems.items,...contextItems.items].sort((a,b)=>b.alertSeq-a.alertSeq);result.count=result.items.length;
    }
    return {expiresAt:person.expires_at,...result,...await notices.settings(who)};
   }
   if(action==='mark'&&env.RUDELBAR_CONNECTED_SOCIAL==='1'&&['raffle-','dating-','dance-','play-','contact-'].some(prefix=>input.id?.startsWith(prefix)))return {expiresAt:person.expires_at,...await contextNotices.mark(person,input)};
   if(action==='mark'&&env.RUDELBAR_CONNECTED_SOCIAL==='1'&&input.id?.startsWith('wall-'))return {expiresAt:person.expires_at,...await wallNotices.mark(person,input)};
   if(action==='mark'&&env.RUDELBAR_CONNECTED_SOCIAL==='1'&&input.id?.startsWith('chat-'))return {expiresAt:person.expires_at,...await conversations.mark(person,{conversationId:input.id,seq:input.seq})};
   return {expiresAt:person.expires_at,...await notices[action](who,input)};
  }
  async function guestIdentity({eventId,sessionToken}){await visitor(eventId,sessionToken);const ctx=await context(eventId);return {accessCode:ctx.event.accessCode||''};}
  async function guestProfile({eventId,sessionToken,operation,input={}}){const person=await visitor(eventId,sessionToken),profiles=createGuestProfiles(database());if(operation==='read')return profiles.read(person);if(operation==='save')return profiles.save(person,input);if(operation==='unblock')return profiles.unblock(person,input.id);fail('Nicht gefunden.',404);}
  const conversations=createConversations(env,{visitor,context,dispatch:eventId=>conversationPush.dispatch(eventId)});
  const conversationPush=createConversationPush(env,{conversations,defer,transport});
  const wallNotices=createWallNotices(env,{context,defer,transport});
  const raffles=createRaffles(env,{context,visitor,notify:eventId=>contextNotices.dispatch(eventId)});
  const encounters=createEncounters(env,{context,visitor,notify:eventId=>contextNotices.dispatch(eventId)});
  const socialConversations=createSocialConversations(env,{context,visitor,contactAccess:(...args)=>guestContacts.access(...args),identityGuard:(...args)=>guestContacts.auth(...args),dispatch:eventId=>{contextNotices.dispatch(eventId);contactNotices.dispatch();}});
  const guestContacts=createGuestContacts(env,{context,socialRoom:(...args)=>socialConversations.room(...args)});
  const contactNotices=createContactNotices(env,{contacts:guestContacts,social:socialConversations,defer});
  const encounterMedia=createEncounterMedia(env,{encounters});
  const socialRetention=createSocialRetention(env);
  const encounterSessions=createEncounterSessions(env,{encounters,visitor});
  const contextNotices=createContextNotices(env,{resolve:(person,row)=>row.kind==='raffle'?raffles.resolveNotice(person,row):socialConversations.resolveNotice(person,row),pushAllowed:(person,item)=>item.kind==='raffle'?raffles.pushAllowed(person,item):socialConversations.pushAllowed(person,item),defer,transport});
  async function guestLogout({eventId,sessionToken}){const person=await visitor(eventId,sessionToken);await database().batch([database().prepare('UPDATE guest_sessions SET revoked_at=? WHERE id=? AND participation_id=? AND revoked_at IS NULL').bind(Date.now(),person.session_id||person.id,person.id),database().prepare('UPDATE live_push_subscriptions SET active=0,updated_at=? WHERE event_id=? AND recipient=?').bind(Date.now(),eventId,'v:'+person.id)]);return {ok:true};}
  async function guestAnalysis({eventId,sessionToken,operation,input={},events}){const person=await visitor(eventId,sessionToken),reporting=createReporting(database());if(operation==='settings')return reporting.guestSettings(person);if(operation==='consent')return reporting.guestConsent(person,input);if(operation==='events'){const ctx=await context(eventId);requireOpen(ctx);return reporting.ingest(person,{events},ctx.release);}fail('Nicht gefunden.',404);}
  const gameRounds=createGameRounds(env,{context,visitor,guestAccess,requireOpen,allowed});
  async function guestContactsAction(input){if(input.operation==='consume')return guestContacts.consume(input);if(input.operation==='available')return guestContacts.available();let person;if(input.operation==='request'){person=input.eventId?await visitor(input.eventId,input.sessionToken):null;return guestContacts.request(person,input);}person=input.contactToken?await guestContacts.identity(input.contactToken):await visitor(input.eventId,input.sessionToken);if(input.operation==='notifications')return contactNotices.handle(person,input);if(input.operation==='mine')return guestContacts.summary(person);if(input.operation==='consent')return guestContacts.consent(person,input);if(input.operation==='end')return guestContacts.end(person,input);if(input.operation==='close')return guestContacts.close(person);if(input.operation==='logout')return guestContacts.logout(person);if(input.operation==='social'){const r=await socialConversations.room(person,input.contextId,{forReport:input.action==='report'||input.action==='end'});if(r.row.kind!=='contact')fail('Dieser Gesprächsbereich gehört zum jeweiligen Abend.',403);if(!['read','send','mark','end','report'].includes(input.action))fail('Diese Aktion ist nicht verfügbar.',404);return socialConversations[input.action](person,input);}if(input.operation==='list')return socialConversations.list(person);fail('Diese Kontaktaktion ist nicht verfügbar.',404);}
  return {contactNotices,guestContacts,guestContactsAction,encounterMedia,socialRetention,encounters,encounter:input=>encounters.guest(input),socialConversations,socialConversation:input=>socialConversations.guest(input),encounterSessions,encounterSession:input=>encounterSessions.guest(input),contextNotices,raffles,raffle:input=>raffles.guest(input),wallNotices,internalVisitor:visitor,internalContext:context,conversationPush,conversations,conversation:input=>conversations.guest(input),staffReports:async(actor,input={})=>{const user=actor.user||(actor.publisher?{name:'Redaktion'}:{accountId:'grant',roles:[]});const old=await conversations.moderation(user,actor.eventId,input.kind==='social'?{}:input),social=await socialConversations.moderation(user,actor.eventId,input.kind==='social'?input:{});return {reports:[...old.reports,...social.reports].sort((a,b)=>b.createdAt-a.createdAt)};},guestProfile,guestLogout,guestAnalysis,roundAction:input=>gameRounds.guest(input),staffRounds:(actor,input)=>gameRounds.staff(actor,input),session,mine,submit,guestUpdate,issueGrant,grants,revoke,operator,publisher,accountActor,staffContext,inbox,staffUpdate,stationState,availability,guestNotice,guestIdentity,notices,recipient,stationPhotos,requireStationPhoto,saveStationPhoto};
}
