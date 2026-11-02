import {createSanity} from './sanity.mjs';

// Website content is shared with the existing production editor. App data and
// identities stay in their current dataset; this is routing, not a data copy.
export function createContentClient(env){
  const client=createSanity({projectId:env.SANITY_PROJECT_ID,dataset:env.SANITY_DATASET,token:env.SANITY_EDITOR_TOKEN});
  if(env.RUDELBAR_RUNTIME_RELEASES==='1')client.runtimeDb=env.LIVE_DB;
  const websiteDataset=env.SANITY_WEBSITE_DATASET||env.SANITY_DATASET;
  client.website=websiteDataset===env.SANITY_DATASET?client:createSanity({projectId:env.SANITY_PROJECT_ID,dataset:websiteDataset,token:env.SANITY_EDITOR_TOKEN});
  return client;
}
