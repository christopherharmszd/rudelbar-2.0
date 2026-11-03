import {raffleIssues} from '../../shared/raffle.mjs';
import {encounterIssues} from '../../shared/encounters.mjs';
import {wallIssues} from '../../shared/wall.mjs';
import {catalogFor,peopleFor,loadEvent,configurationFor} from './abend-service.mjs';
import {cleanExperience} from '../../shared/experience.mjs';
import {createResources} from './resources.mjs';
import {releaseContinuity} from './release-continuity.mjs';
export async function revisionToken(value){const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value))));return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');}
export async function reviewEvening(client,id){
 const [event,current,catalog,people]=await Promise.all([loadEvent(client,id),configurationFor(client,id),catalogFor(client),peopleFor(client)]),issues=[],warnings=[];
 if(!event.title)issues.push('Gib dem Abend einen Namen.');
 if(!event.date)issues.push('Ergänze das Datum, bevor du den Abend freigibst.');
 if(!event.venue)issues.push('Ergänze den Ort, bevor du den Abend freigibst.');
 if(event.linkedEventId&&!event.linkedWebsitePublished&&event.visibility==='public')issues.push('Der verknüpfte öffentliche Termin ist noch nicht veröffentlicht.');
 if(event.source==='website'&&!event.websitePublished&&!event.revision)issues.push('Veröffentliche zuerst den öffentlichen Website-Termin.');
 try{cleanExperience(current.experience,catalog,id,people,event.teamIds);}catch(error){issues.push(error.message);}
 let config=current.experience;
 if(config.resourceSelection){
  try{
   const compiled=await createResources(client).compile(config,event);config=compiled.config;
   issues.push(...compiled.issues.map(i=>i.message));warnings.push(...compiled.warnings.map(i=>i.message));
  }catch(error){if(![400,409].includes(error.status))throw error;issues.push(error.message);}
 }
 issues.push(...wallIssues(config.wall||{}));
 issues.push(...raffleIssues(config.raffle||{}));
 issues.push(...encounterIssues(config.encounters||{}));
 if(config.features?.roundChat&&!config.communication?.privacyUrl)issues.push('Für Gespräche in Spielrunden fehlt die Datenschutzinformation. Ergänze sie unter „Gespräche in der Runde“.');
 const visible=['equipment','games','program','menu'].flatMap(k=>config[k]||[]);
 if(client.runtimeDb)issues.push(...await releaseContinuity(client.runtimeDb,id,config));
 if(!visible.length)warnings.push('Es sind noch keine Speisen, Getränke, Aktivitäten oder Programmpunkte ausgewählt.');
 if(!event.teamIds.length)warnings.push('Für diesen Abend ist noch kein Team ausgewählt. Ansprechpartner sind optional.');
 for(const station of config.stations||[])if(station.enabled!==false&&station.assignmentRequired&&!station.operatorIds?.length)warnings.push(`${station.name}: Betreuung noch zuordnen. Bisher sieht nur die Abendleitung diesen Eingang.`);
 if(config.map?.enabled){const booths=config.map.layout?.booths?.filter(b=>b.visible!==false)||[];if(!booths.length)issues.push('Die Karte ist eingeschaltet, hat aber noch keinen sichtbaren Stand.');for(const b of booths)if(!b.offers?.length)warnings.push(b.title+': Dieser Kartenstand enthält noch keine Angebote.');}
 const resourceVersion=config._resourceSnapshot?{resourceRevision:config._resourceSnapshot.resourceRevision,sourcesVersion:config._resourceSnapshot.sourcesVersion}:null;
 const token=await revisionToken({event,current,catalogRevision:catalog.revision,people:people.map(p=>[p.personId,p.revision]),resourceVersion});
 return {ok:!issues.length,issues,warnings,token,resourceVersion,event:{title:event.title,date:event.date,venue:event.venue,state:event.app.state},counts:{contents:visible.length,team:config._staffIds?.length??event.teamIds.length,stations:(config.stations||[]).filter(s=>s.enabled!==false).length}};
}
