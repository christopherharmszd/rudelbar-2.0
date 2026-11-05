export function appTabs(active,{canEdit=true}={}){
 const pages=[...(canEdit?[['templates','Vorlagen'],['venueplans','Ortspläne']]:[]),['events','Vorbereitete Abende'],['history','Verlauf']];
 return '<nav class="workspace-tabs" aria-label="Gäste-App vorbereiten">'+pages.map(([key,title])=>'<a href="#'+key+'" '+(key===active?'aria-current="page"':'')+'>'+title+'</a>').join('')+'</nav>';
}
