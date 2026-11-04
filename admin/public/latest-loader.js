// A newer selection owns the view. Late values and late failures from an older
// selection must never replace its contents or re-enable obsolete actions.
export function createLatestLoader(onLoading=()=>{}){
 let generation=0,loading=false;
 return {
  get loading(){return loading;},
  invalidate(){generation++;loading=false;onLoading(false);},
  async run(read,commit){
   const current=++generation;loading=true;onLoading(true);
   try{const result=await read();if(current!==generation)return false;commit(result);return true;}
   catch(error){if(current===generation)throw error;return false;}
   finally{if(current===generation){loading=false;onLoading(false);}}
  }
 };
}
