// Only these events may enter reporting. Content, names, URLs and secrets are
// intentionally not part of the schema. Operational ledgers stay authoritative.
export const MEASUREMENT_VERSION=1;
const spec=(label,source,family,options={})=>({label,source,family,...options});
export const MEASUREMENTS=Object.freeze({
 'entry.opened':spec('Einstiegslink geöffnet','client','entry'),
 'guest.started':spec('Gastzugang angelegt','server','entry'),
 'guest.resumed':spec('Gastzugang wiederaufgenommen','server','entry'),
 'view.opened':spec('Bereich geöffnet','client','usage'),
 'offer.opened':spec('Inhalt geöffnet','client','usage'),
 'stand.opened':spec('Stand geöffnet','client','usage'),
 'map.opened':spec('Ortsplan geöffnet','client','usage'),
 'action.started':spec('Aktion begonnen','client','usage'),
 'action.failed':spec('Aktion fehlgeschlagen','client','quality'),
 'conversation.sent':spec('Nachricht in einer Spielrunde gesendet','server','communication',{active:true}),
 'request.created':spec('Anfrage eingegangen','server','communication',{active:true}),
 'request.replied':spec('Anfrage beantwortet','server','communication'),
 'request.changed':spec('Anfragestatus geändert','server','communication'),
 'round.created':spec('Runde erstellt','server','participation',{active:true}),
 'round.joined':spec('Runde beigetreten','server','participation',{active:true}),
 'round.left':spec('Runde verlassen','server','participation',{active:true}),
 'round.started':spec('Runde gestartet','server','participation',{active:true}),
 'round.ended':spec('Runde beendet','server','participation',{active:true}),
 'wall.submitted':spec('Wall-Beitrag eingereicht','server','wall',{active:true}),
 'wall.approved':spec('Wall-Beitrag freigegeben','server','wall'),
 'wall.withdrawn':spec('Wall-Beitrag zurückgezogen','server','wall',{active:true}),
 'dating.activated':spec('Dating freiwillig aktiviert','server','dating',{sensitive:true,active:true}),
 'dating.paused':spec('Dating pausiert','server','dating',{sensitive:true}),
 'dating.interest':spec('Interesse gesendet','server','dating',{sensitive:true,active:true}),
 'dating.matched':spec('Gegenseitiges Interesse','server','dating',{sensitive:true}),
 'encounter.joined':spec('Begegnungsaktion angemeldet','server','participation',{active:true}),
 'contact.confirmed':spec('Kontaktverbindung bestätigt','server','contacts',{active:true}),
 'raffle.entered':spec('Gewinnaktion angemeldet','server','raffle',{active:true}),
 'raffle.drawn':spec('Ziehung festgeschrieben','server','raffle'),
 'prize.redeemed':spec('Gewinn ausgegeben','server','raffle'),
 'upload.failed':spec('Upload fehlgeschlagen','server','quality'),
 'push.accepted':spec('Push vom Versanddienst angenommen','server','delivery'),
 'inbox.read':spec('In-App-Inhalt als gelesen markiert','server','delivery',{active:true})
});
export const VIEWS=['home','welcome','name','overview','discover','map','equipment','games','program','drinks','evening','encounters','inbox','help','wall','dating','raffle','profile'];
const fail=message=>{throw Object.assign(new Error(message),{status:400});};
const key=value=>{if(typeof value!=='string'||!/^[a-z0-9][a-z0-9-]{0,119}$/i.test(value))fail('Ungültige Messreferenz.');return value;};
const REF_KEYS=['releaseId','standId','occurrenceId','contentKey','functionId','objectId','placementId'];
export function cleanMeasurement(input,{source,eventId,participationId='',consent=false,now=Date.now()}={}){
 if(!input||typeof input!=='object'||Array.isArray(input))fail('Ungültiges Messereignis.');
 const definition=Object.hasOwn(MEASUREMENTS,input.type)?MEASUREMENTS[input.type]:null;
 if(!definition||definition.source!==source)fail('Dieses Ereignis kann hier nicht erfasst werden.');
 if(source==='client'&&!consent)return null;
 for(const field of Object.keys(input))if(!['type','key','refs','view','action','errorCode'].includes(field))fail('Nicht zulässiges Messfeld.');
 const refs={};
 if(input.refs&&(typeof input.refs!=='object'||Array.isArray(input.refs)))fail('Ungültige Messreferenzen.');
 for(const [field,value]of Object.entries(input.refs||{})){
  if(!REF_KEYS.includes(field))fail('Nicht zulässige Messreferenz.');
  if(field==='contentKey'){
   if(typeof value!=='string'||!/^(equipment|games|program|menu)\/[a-z0-9][a-z0-9-]{0,89}$/i.test(value))fail('Ungültiger Inhaltsverweis.');
   refs[field]=value;
  }else refs[field]=key(value);
 }
 if(input.view!==undefined&&!VIEWS.includes(input.view))fail('Unbekannter App-Bereich.');
 if(input.action!==undefined&&!['music','karaoke','message','round','join','wall','dating','raffle','contact'].includes(input.action))fail('Unbekannte Aktion.');
 if(input.errorCode!==undefined&&!['network','validation','unavailable','unauthorized','conflict','rate-limit','server','upload'].includes(input.errorCode))fail('Unbekannte Fehlerart.');
 if(!Number.isSafeInteger(now)||now<0)fail('Ungültiger Erfassungszeitpunkt.');
 return {schemaVersion:MEASUREMENT_VERSION,type:input.type,key:key(input.key),eventId:key(eventId),participationId:participationId?key(participationId):'',source,recordedAt:now,refs,...(input.view?{view:input.view}:{}),...(input.action?{action:input.action}:{}),...(input.errorCode?{errorCode:input.errorCode}:{}),family:definition.family,sensitive:definition.sensitive===true};
}
export const REPORTING_RULES=Object.freeze({
 detailedRetentionDays:30,aggregateRetentionMonths:13,sensitiveMinimumGroup:5,
 activeGuestDefinition:'Eindeutige Abendteilnahme mit mindestens einer bewusst ausgelösten, serverseitig bestätigten Aktion im Zeitraum.',
 guestDefinition:'Gastzugänge sind Abendteilnahmen, keine verifizierten Menschen.',
 historicalCoverage:'Bedienereignisse sind erst ab Einführung und im Umfang freiwillig zugestimmter Messung verfügbar.',
 pushDefinition:'Annahme durch den Versanddienst ist kein Nachweis für Anzeige oder Lesen.',
 datingDefinition:'Dating-Teilnahme zählt ausschließlich nach ausdrücklicher Aktivierung.',
 physicalDefinition:'Eine digitale Teilnahme bestätigt keine tatsächliche Begegnung vor Ort.'
});
