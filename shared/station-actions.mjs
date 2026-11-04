// Public navigation only. An assignment never grants private team access.
export function stationInteraction(station,experience={}){
 if(!station||station.enabled===false)return null;
 const feature=station.functionId;
 if(feature==='wall')return experience.wall?.enabled?{action:'wall',label:'Eure Memory Wall öffnen',description:'Fotos und Grüße aus eurem Abend.',icon:'images'}:null;
 if(feature==='raffle')return experience.raffle?.enabled?{action:'raffle',label:'Gewinnaktionen entdecken',description:'Freiwillig mitmachen und eigene Ergebnisse finden.',icon:'gift'}:null;
 if(['play','dance','dating'].includes(feature))return experience.encounters?.enabled&&experience.encounters[feature+'Enabled']?{action:'encounters',mode:feature,label:({play:'Menschen zum Spielen finden',dance:'Tanzpartner:innen finden',dating:'Menschen kennenlernen'})[feature],description:'Du entscheidest selbst, ob du für diese Suche sichtbar sein möchtest.',icon:({play:'dices',dance:'music-2',dating:'heart'})[feature]}:null;
 if(feature==='game')return experience.map?.layout&&experience.map.enabled!==false?{action:'map',label:'Spielrunden auf dem Dorfplan',description:'Finde euren Stand und schau nach einer Runde.',icon:'dices'}:null;
 if(station.contactEnabled===false)return null;
 return {action:'station',id:station.id,label:station.kind==='music'?'Song wünschen':station.kind==='karaoke'?'Zum Singen anmelden':'Station kontaktieren',description:station.kind==='music'?'Dein Wunsch direkt zum DJ.':station.kind==='karaoke'?'Allein oder gemeinsam ans Mikro.':'Fragen und Unterstützung direkt beim Team.',icon:station.kind==='music'?'disc-3':station.kind==='karaoke'?'mic-vocal':'messages-square'};
}
