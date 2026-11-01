import {WorkerEntrypoint} from 'cloudflare:workers';
import worker from './worker.mjs';
import {createSanity} from './lib/sanity.mjs';
import {getVisitorExperience} from './lib/abend-service.mjs';
export class VisitorContent extends WorkerEntrypoint {
  async getExperience(input){
    return getVisitorExperience(createSanity({projectId:this.env.SANITY_PROJECT_ID,dataset:this.env.SANITY_DATASET,token:this.env.SANITY_EDITOR_TOKEN}),input);
  }
}
export default worker;
