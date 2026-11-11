const limit=(value,fallback)=>{const n=Number(value);return Number.isSafeInteger(n)&&n>0?n:fallback;};
export const sanityLimits=env=>({day:limit(env.SANITY_DAILY_REQUEST_LIMIT,1000),month:limit(env.SANITY_MONTHLY_REQUEST_LIMIT,20000)});
export function createSanityBudget(env,{now=()=>Date.now()}={}){
 if(env.RUDELBAR_SANITY_BUDGET!=='1')return undefined;
 return async()=>{
  if(!env.LIVE_DB)throw Object.assign(Error('Das Abrufbudget ist gerade nicht verfügbar. Es wurde keine Anbieterabfrage gestartet.'),{status:503});
  const at=now(),date=new Date(at).toISOString(),day=date.slice(0,10),month=date.slice(0,7),limits=sanityLimits(env);
  // One atomic conditional write for BOTH windows. Even concurrent Worker
  // instances cannot overspend the application budget. Failed attempts count
  // conservatively; there are no retries or automatic resets within a window.
  const result=await env.LIVE_DB.prepare(`INSERT INTO app_provider_budget VALUES('sanity',?,?,1,1,?)
   ON CONFLICT(id) DO UPDATE SET day_window=excluded.day_window,month_window=excluded.month_window,
   day_attempts=CASE WHEN app_provider_budget.day_window=excluded.day_window THEN day_attempts+1 ELSE 1 END,
   month_attempts=CASE WHEN app_provider_budget.month_window=excluded.month_window THEN month_attempts+1 ELSE 1 END,updated_at=excluded.updated_at
   WHERE (app_provider_budget.day_window!=excluded.day_window OR day_attempts<?)
   AND (app_provider_budget.month_window!=excluded.month_window OR month_attempts<?)`).bind(day,month,at,limits.day,limits.month).run();
  if(!result.meta.changes)throw Object.assign(Error('Das Abrufbudget für die Redaktion ist erreicht. Weitere Sanity-Abfragen wurden gestoppt. Bitte wende dich an die Administration.'),{status:429,code:'provider_budget_exhausted'});
 };
}
export async function sanityBudgetStatus(env){return {limits:sanityLimits(env),counts:await env.LIVE_DB.prepare("SELECT day_window,month_window,day_attempts,month_attempts,updated_at FROM app_provider_budget WHERE id='sanity'").first(),scope:'application-only'};}
