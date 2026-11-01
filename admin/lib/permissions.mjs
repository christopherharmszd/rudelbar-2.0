export const ROLE_LABELS={admin:'Administration',editor:'Redaktion',manager:'Abendleitung',station:'Stationsbetreuung',host:'Gastgeber & Moderation'};
export const legacyUser=user=>!!user&&!user.accountId;
export function hasRole(user,role,eventId){return !!user&&(legacyUser(user)||(user.roles||[]).some(r=>r.role===role&&(!eventId||!r.eventId||r.eventId===eventId)));}
export const managesUsers=user=>hasRole(user,'admin');
export const editsContent=user=>hasRole(user,'admin')||hasRole(user,'editor');
export const managesEvent=(user,eventId)=>editsContent(user)||hasRole(user,'manager',eventId);
export const seesEvent=(user,eventId)=>editsContent(user)||(user?.roles||[]).some(r=>r.eventId===eventId);
export const runsEvent=(user,eventId)=>managesEvent(user,eventId)||hasRole(user,'host',eventId);
export function requirePermission(allowed){if(!allowed)throw Object.assign(new Error('Für diesen Bereich hast du keine Berechtigung.'),{status:403});}
export function publicUser(user){return user?{id:user.accountId||'legacy-redaktion',name:user.name||'Redaktion',email:user.email||user.sub,role:editsContent(user)?'publisher':'team',roles:user.roles||[{role:'admin'}],legacy:legacyUser(user),personId:user.personId||'',csrf:user.csrf}:null;}
