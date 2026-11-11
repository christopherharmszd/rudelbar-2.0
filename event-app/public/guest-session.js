export function createGuestSession({getName,connect,onMissingName}){
 let ready=false,pending=null;
 async function ensure({refresh=false}={}){
  if(refresh)ready=false;
  if(pending)return pending;
  if(ready)return;
  const name=getName();
  if(!name){onMissingName();throw new Error('Verrätst du uns zuerst deinen Vornamen?');}
  pending=(async()=>{await connect(name);ready=true;})();
  try{await pending;}finally{pending=null;}
 }
 return {ensure,invalidate(){ready=false;}};
}
