import {cleanRaffle} from '../../shared/raffle.mjs';
// Publishing must not strand open work behind removed stations or offer aliases.
// Closing the evening keeps its existing package and is deliberately separate.
export async function releaseContinuity(db,eventId,config){
 const issues=[],stations=new Set((config.stations||[]).map(s=>s.id));
 const requests=(await db.prepare("SELECT DISTINCT station_id,station_name FROM live_requests WHERE event_id=? AND status IN('new','queued','in_progress')").bind(eventId).all()).results||[];
 for(const row of requests)if(!stations.has(row.station_id))issues.push('Für '+row.station_name+' sind noch Anfragen offen. Bitte zuerst abschließen oder weiterleiten, oder den bisherigen Eingang beibehalten.');
 const rounds=(await db.prepare("SELECT booth_id,offer_type,offer_id,capacity FROM game_rounds WHERE event_id=? AND status!='ended'").bind(eventId).all()).results||[];
 for(const row of rounds){
  const booth=config.map?.enabled&&config.map.layout?.booths.find(b=>b.id===row.booth_id&&b.visible!==false);
  const ref=booth?.offers.find(o=>o.type===row.offer_type&&o.id===row.offer_id&&o.matching);
  const offer=config[row.offer_type]?.find(o=>o.id===row.offer_id);
  if(!ref||!offer||offer.capacity<row.capacity)issues.push('Eine laufende Spielrunde verwendet eine geänderte oder entfernte Zuordnung. Bitte die Runde zuerst beenden oder ihre Plätze und Kartenposition beibehalten.');
 }
 const nextRaffle=cleanRaffle(config.raffle||{}),campaigns=(await db.prepare("SELECT c.config_id,c.config_json,c.state FROM raffle_campaigns c WHERE c.event_id=? AND c.expires_at>? AND (c.state IN('open','frozen') OR EXISTS(SELECT 1 FROM raffle_draws d WHERE d.campaign_id=c.id AND d.state IN('pending','awarded')))").bind(eventId,Date.now()).all()).results||[];
 for(const campaign of campaigns){const next=nextRaffle.actions.find(a=>a.id===campaign.config_id);if(!next||JSON.stringify(next)!==JSON.stringify(JSON.parse(campaign.config_json)))issues.push('Die laufende Gewinnaktion '+JSON.parse(campaign.config_json).title+' verwendet bereits festgelegte Regeln und Vorräte. Vor einer Änderung beenden und offene Gewinnrechte abschließen; für neue Regeln eine neue Aktion anlegen.');}
 return [...new Set(issues)];
}
