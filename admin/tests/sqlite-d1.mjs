import {DatabaseSync} from 'node:sqlite';
export function sqliteD1(path=':memory:'){
  const connection=new DatabaseSync(path);
  const execute=statement=>{const result=connection.prepare(statement.sql).run(...statement.args);return {success:true,results:[],meta:{changes:Number(result.changes),last_row_id:Number(result.lastInsertRowid)}};};
  const adapter={
    connection,
    prepare(sql){return {sql,args:[],bind(...args){return {...this,args};},async first(){return connection.prepare(this.sql).get(...this.args)||null;},async all(){return {success:true,results:connection.prepare(this.sql).all(...this.args)};},async run(){return execute(this);}};},
    async batch(statements){connection.exec('BEGIN IMMEDIATE');try{const results=statements.map(execute);connection.exec('COMMIT');return results;}catch(error){connection.exec('ROLLBACK');throw error;}},
  };
  return adapter;
}
