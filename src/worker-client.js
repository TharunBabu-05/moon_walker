// One active job and one latest pending request per kind. No unbounded queues.
export function createWorkerClient(){
  const worker=new Worker(new URL('./surface-worker.js',import.meta.url),{type:'module'});
  let serial=0,failed=null;const jobs=new Map();
  worker.onmessage=({data})=>{const job=jobs.get(data.id);if(!job)return;jobs.delete(data.id);data.error?job.reject(new Error(data.error)):job.resolve(data.result);};
  worker.onerror=event=>{failed=new Error(event.message||'Surface worker failed');for(const job of jobs.values())job.reject(failed);jobs.clear();};
  return {run(type,payload){if(failed)return Promise.reject(failed);return new Promise((resolve,reject)=>{const id=++serial;jobs.set(id,{resolve,reject});worker.postMessage({id,type,payload});});},dispose(){worker.terminate();for(const j of jobs.values())j.reject(new Error('Worker closed'));jobs.clear();}};
}
