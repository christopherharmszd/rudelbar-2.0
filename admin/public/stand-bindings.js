export function createStandBindings({resources,esc,dialog,onPlace}){
 const stands=()=>resources.nodes.filter(n=>n.kind==='stand');
 const find=id=>stands().find(n=>n.id===id);
 function details(booth){
  const stand=find(booth.standId);
  if(stand&&!booth.overrideStandDetails)Object.assign(booth,{title:stand.name,description:stand.description||'',imageUrl:stand.imageUrl||'',imageAlt:stand.imageAlt||''});
 }
 function bind(booth,id){
  if(!id){delete booth.standId;delete booth.overrideStandDetails;return;}
  const stand=find(id);if(!stand)throw new Error('Dieser Stand ist nicht mehr vorhanden.');
  booth.standId=id;booth.overrideStandDetails=false;booth.offers=[];booth.personIds=[];details(booth);
 }
 function fields(booth){
  const options=stands().filter(n=>!n.archived||n.id===booth.standId).map(n=>'<option value="'+n.id+'" '+(n.id===booth.standId?'selected':'')+'>'+esc(n.name)+(n.archived?' · pausiert':'')+'</option>').join('');
  return '<label class="field"><span>Verknüpfter Stand</span><select data-prop="standId"><option value="">Freies Kartenelement</option>'+options+(booth.standId&&!find(booth.standId)?'<option selected value="'+esc(booth.standId)+'">Stand nicht mehr verfügbar</option>':'')+'</select></label>'+(booth.standId?'<p>Inhalte und Betreuung kommen aus der zentralen Zuordnung. Dieser Ortsplan legt die Position fest.</p><label class="check-line"><input type="checkbox" data-prop="overrideStandDetails" '+(booth.overrideStandDetails?'checked':'')+'>Eigene Beschriftung und Bilder für diesen Ortsplan</label>':'<p>Du kannst hier einen vorhandenen Stand auswählen oder ein freies Orientierungselement gestalten.</p>');
 }
 function button(){return '<button class="btn secondary small" type="button" data-me="existing-stand">+ Vorhandenen Stand platzieren</button>';}
 function choose(){
  const available=stands().filter(n=>!n.archived);
  if(!available.length){dialog('Zuerst einen Stand einrichten','<p>Lege unter „Unser Angebot → Stände“ einen Anlaufpunkt mit seinen Inhalten an. Danach kannst du ihn hier platzieren.</p><a class="btn secondary" href="#library/stands">Zu den Ständen</a>',async()=>{},{saveLabel:'Fertig'});return;}
  dialog('Welcher Stand gehört auf die Karte?','<label class="field"><span>Vorhandener Stand</span><select name="stand" required>'+available.map(s=>'<option value="'+s.id+'">'+esc(s.name)+'</option>').join('')+'</select></label><p>Beschreibung, Bilder und Angebote bleiben zentral gepflegt. Du legst hier die Position und Darstellung fest.</p>',async fd=>onPlace(find(fd.get('stand'))),{saveLabel:'Stand platzieren'});
 }
 return {fields,button,choose,bind,details};
}
