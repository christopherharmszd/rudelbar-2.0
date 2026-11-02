export const ROLE_LABELS={admin:'Administration',author:'Redaktion · Beiträge verfassen',editor:'Backstage-Verwaltung',manager:'Abendleitung',station:'Live-Team · Stationsbetreuung',host:'Empfang & Moderation',wall:'Wall-Team · Fotos und Leinwand',moderator:'Schutz-Team · gemeldete Inhalte'};
export const legacyUser=user=>!!user&&!user.accountId;
export function hasRole(user,role,eventId){return !!user&&(legacyUser(user)||(user.roles||[]).some(r=>r.role===role&&(!eventId||!r.eventId||r.eventId===eventId)));}
export const managesUsers=user=>hasRole(user,'admin');
export const editsContent=user=>hasRole(user,'admin')||hasRole(user,'editor');
export const writesPosts=user=>editsContent(user)||hasRole(user,'author');
export const readsEvents=user=>editsContent(user)||(user?.roles||[]).some(r=>['manager','station','host','moderator','wall'].includes(r.role));
export const managesEvent=(user,eventId)=>editsContent(user)||hasRole(user,'manager',eventId);
export const seesEvent=(user,eventId)=>editsContent(user)||(user?.roles||[]).some(r=>r.eventId===eventId);
export const runsEvent=(user,eventId)=>managesEvent(user,eventId)||hasRole(user,'host',eventId);
export function requirePermission(allowed){if(!allowed)throw Object.assign(new Error('Für diesen Bereich hast du keine Berechtigung.'),{status:403});}
export function publicUser(user){return user?{id:user.accountId||'legacy-redaktion',name:user.name||'Redaktion',email:user.email||user.sub,role:editsContent(user)?'publisher':writesPosts(user)?'writer':'team',roles:user.roles||[{role:'admin'}],legacy:legacyUser(user),personId:user.personId||'',csrf:user.csrf}:null;}

export const usesStations=(user,eventId)=>editsContent(user)||['manager','host','station'].some(role=>hasRole(user,role,eventId));
