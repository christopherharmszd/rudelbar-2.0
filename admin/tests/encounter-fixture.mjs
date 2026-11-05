import {readFile,readdir} from 'node:fs/promises';
import {sqliteD1} from './sqlite-d1.mjs';
import {createLiveService} from '../lib/live-service.mjs';
import {createEncounters} from '../lib/encounters.mjs';
import {cleanEncounters} from '../../shared/encounters.mjs';
const dir=new URL('../migrations/',import.meta.url);
const schema=(await Promise.all((await readdir(dir)).filter(n=>n.endsWith('.sql')).sort().map(n=>readFile(new URL(n,dir),'utf8')))).join('\n');
export async function encounterFixture(extra={}){
 const db=sqliteD1();db.connection.exec(schema);
 const config={encounters:cleanEncounters({enabled:true,playEnabled:true,danceEnabled:true,datingEnabled:true,privacyUrl:'https://example.test/privacy',policyVersion:'encounters-v1',notice:'Freiwillige Sichtbarkeit für diesen Abend.',datingNotice:'Freiwillig mit 18+-Selbstauskunft.',...extra})};
 const ctx={event:{eventId:'evening',title:'Isolierte Prüfung',visibility:'public',teamIds:[]},release:{state:'open',versionId:'version',config},people:[],stations:[]};
 db.connection.prepare('INSERT INTO app_release_versions VALUES(?,?,?,?,?,?,?,?)').run('version','evening',JSON.stringify(config),'{}','source','{}',Date.now(),'test');
 db.connection.prepare('INSERT INTO app_active_releases VALUES(?,?,?,?,?,?)').run('evening','version','open',1,Date.now(),'open');
 const env={LIVE_DB:db,RUDELBAR_CONNECTED_IDENTITY:'1',RUDELBAR_SESSION_SECRET:crypto.randomUUID()+crypto.randomUUID()},live=createLiveService(env,null,{getContext:async()=>ctx}),guests=[];
 for(const name of ['Gleicher Name','Gleicher Name','Dritte Person','Vierte Person','Fünfte Person']){const session=await live.session({eventId:'evening',name});guests.push(await live.internalVisitor('evening',session.sessionToken));}
 const service=createEncounters(env,{context:live.internalContext,visitor:live.internalVisitor});
 const input=(extra={})=>({mode:'dating',about:'Ein schöner Abend',interests:['Musik'],agree:true,policyVersion:config.encounters.policyVersion,over18:true,gender:'woman',seeking:['woman'],revision:0,operationKey:crypto.randomUUID(),...extra});
 const optIn=(i,extra={})=>service.optIn(guests[i],input(extra));
 return {db,env,ctx,guests,service,input,optIn,close:()=>db.connection.close()};
}
