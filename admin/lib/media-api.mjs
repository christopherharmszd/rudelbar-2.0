import {editsContent,requirePermission} from './permissions.mjs';
export async function mediaApi(request,env,{client,json,session}){
 const user=await session(request,env);if(!user)return json(401,{error:'Bitte anmelden.'});requirePermission(editsContent(user));
 if(request.method!=='GET')return json(405,{error:'Bitte Bilder über die Bildauswahl hochladen.'});
 const url=new URL(request.url),scope=url.searchParams.get('scope')||'app';if(!['app','website'].includes(scope))return json(400,{error:'Bitte den Bildbereich wählen.'});
 const source=scope==='website'?(client.website||client):client,images=await source.listImages(),assetId=url.searchParams.get('id');
 if(assetId){const asset=images.find(i=>i._id===assetId);if(!asset)return json(404,{error:'Bild nicht gefunden.'});return json(200,{image:asset,usage:await source.imageUsage(asset._id,asset.url)});}
 return json(200,{images:images.map(i=>({id:i._id,url:i.url,name:i.title||i.originalFilename||'Bild',width:i.metadata?.dimensions?.width||0,height:i.metadata?.dimensions?.height||0,createdAt:i._createdAt})),scope});
}
