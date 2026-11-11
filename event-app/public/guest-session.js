export function createGuestSession({getName,connect,verify,onMissingName=()=>{}}){
 let ready=false,pending=null;
 async function ensure({refresh=false}={}){
  if(refresh)ready=false;
  if(pending)return pending;
  if(ready)return;
  const name=getName();
  if(!verify&&!name){onMissingName();throw Object.assign(new Error('Bitte melde dich mit deinem Vornamen an.'),{status:401});}
  pending=(async()=>{const result=verify?await verify():await connect(name);ready=true;return result;})();
  try{return await pending;}finally{pending=null;}
 }
 async function signIn(name){ready=false;await connect(name);const profile=verify?await verify():undefined;ready=true;return profile;}
 return {ensure,signIn,check:async()=>{ready=false;return ensure();},invalidate(){ready=false;}};
}
