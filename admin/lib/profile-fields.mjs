import {cleanText,fail} from './account-utils.mjs';
export const PARTNER_TYPE='rudelAppPartner';
export function profileImage(value){
 const url=cleanText(value,1000);if(url&&!/^https:\/\/cdn\.sanity\.io\/images\/[a-z0-9-]+\/[a-z0-9_-]+\/[a-zA-Z0-9._-]+$/.test(url))fail('Bitte ein hochgeladenes JPG-, PNG- oder WebP-Bild verwenden.');return url;
}
export function affiliationFields(input,partners=[]){
 const membershipType=input.membershipType||'rudelbar';if(!['rudelbar','partner'].includes(membershipType))fail('Bitte Rudelbar oder einen Partner als Zugehörigkeit wählen.');
 const partnerId=membershipType==='partner'?cleanText(input.partnerId,90,true):'';
 if(partnerId&&!partners.some(p=>p.partnerId===partnerId))fail('Bitte einen vorhandenen Partner wählen oder einen neuen Partner anlegen.');
 return {membershipType,partnerId,avatarUrl:profileImage(input.avatarUrl)};
}
export function cleanPartner(input,partnerId){
 return {partnerId,name:cleanText(input.name,100,true),logoUrl:profileImage(input.logoUrl),archived:input.archived===true};
}
export const affiliationFor=(person,partners)=>person.membershipType==='partner'?{type:'partner',name:partners.find(p=>p.partnerId===person.partnerId)?.name||'Rudelbar-Partner',logoUrl:partners.find(p=>p.partnerId===person.partnerId)?.logoUrl||''}:{type:'rudelbar',name:'Rudelbar-Team',logoUrl:''};
