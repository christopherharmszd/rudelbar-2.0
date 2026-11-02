import {catalogFor,strip} from './abend-service.mjs';
import {editsContent,requirePermission} from './permissions.mjs';
import {exportCatalogCsv,previewCatalogImport,parseCsv,defaultCsvMapping} from '../../shared/catalog-csv.mjs';
import {CATALOG_ID} from '../../shared/experience.mjs';
import {revisionToken} from './evening-review.mjs';
export async function catalogCsvApi(request,{client,user,json,data}){
 requirePermission(editsContent(user));const url=new URL(request.url),catalog=await catalogFor(client);
 if(request.method==='GET')return new Response(exportCatalogCsv(catalog,{template:url.searchParams.get('template')==='1',category:url.searchParams.get('category')||''}),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="rudelbar-inhalte.csv"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 const input=await data(request),path=url.pathname;
 if(path.endsWith('/inspect')){const p=parseCsv(input.csv);return json(200,{headers:p.headers,mapping:defaultCsvMapping(p.headers),rows:p.rows.length});}
 const hash=await revisionToken({csv:input.csv,mapping:input.mapping,defaultCategoryId:input.defaultCategoryId||'',defaultFormat:input.defaultFormat||'',requestKey:input.requestKey}),receiptId='rudel-app-import-'+input.requestKey;
 if(!/^[a-f0-9-]{36}$/.test(input.requestKey||''))return json(400,{error:'Bitte den Import neu beginnen.'});
 if(path.endsWith('/apply')){const receipt=await client.getDocument('drafts.'+receiptId);if(receipt){if(receipt.hash!==hash)return json(409,{error:'Diese Importkennung gehört zu einer anderen Datei.'});return json(200,{ok:true,counts:receipt.counts,replayed:true,catalog});}}
 if(input.revision!==catalog.revision)return json(409,{error:'Die Inhalte wurden inzwischen geändert. Bitte die Vorschau neu prüfen.'});
 const result=previewCatalogImport(catalog,input),{catalog:next,...preview}=result;
 if(path.endsWith('/preview'))return json(200,{...preview,hash,revision:catalog.revision});
 if(!path.endsWith('/apply'))return json(404,{error:'Nicht gefunden.'});
 if(result.errors.length)return json(400,{error:'Bitte die markierten Zeilen zuerst korrigieren.',errors:result.errors});
 if(input.hash!==hash)return json(409,{error:'Die Datei oder Zuordnung wurde geändert. Bitte die Vorschau erneut öffnen.'});
 await client.commitPrivate([{type:'rudelAppCatalog',id:CATALOG_ID,fields:next,revision:catalog.revision||undefined},{type:'rudelAppImport',id:receiptId,fields:{hash,counts:result.counts,createdAt:new Date().toISOString(),actor:user.accountId||'legacy-redaktion'}}]);
 return json(200,{ok:true,counts:result.counts,catalog:await catalogFor(client)});
}
