/**
 * LFEA view-draft persistence ONLY. Never persist pre-flight authorization,
 * model bytes, engineering findings, or a Run permission.
 *
 * Every draft is scoped to the current semantic source/preparation identity
 * and expires. Corrupt/disabled/quota-limited storage is best-effort.
 */
export const LFEA_PIPELINE_LOCAL_DRAFT_SCHEMA = 'lfea-pipeline-local-draft/v1';
const PREFIX='aa3:lfea:pipeline-draft:v1:';
const TTL_MS=14*24*60*60*1000;
const MAX_BYTES=16384;
const KEY=/^[A-Za-z0-9._:-]{8,256}$/u;

function storageOrNull(storage){
  if(storage!==undefined)return storage;
  try{return globalThis.localStorage??null;}catch{return null;}
}
function storageKey(kind,identity){
  if(!['cases','error-check'].includes(kind)||
     typeof identity!=='string'||!KEY.test(identity))return null;
  return PREFIX+kind+':'+identity;
}
export function readLfeaPipelineDraft(kind,identity,{
  storage,now=Date.now()
}={}){
  const key=storageKey(kind,identity);
  if(!key)return null;
  try{
    const raw=storageOrNull(storage)?.getItem(key);
    if(typeof raw!=='string'||raw.length>MAX_BYTES)return null;
    const record=JSON.parse(raw);
    if(record?.schema!==LFEA_PIPELINE_LOCAL_DRAFT_SCHEMA||
       record.kind!==kind||record.identity!==identity||
       typeof record.writtenAt!=='number'||!Number.isFinite(record.writtenAt)||
       record.writtenAt>now||now-record.writtenAt>TTL_MS||
       record.data===null||typeof record.data!=='object'||
       Array.isArray(record.data))return null;
    return record.data;
  }catch{return null;}
}
export function saveLfeaPipelineDraft(kind,identity,data,{
  storage,now=Date.now()
}={}){
  const key=storageKey(kind,identity);
  if(!key||!data||typeof data!=='object'||Array.isArray(data))return false;
  try{
    const payload=JSON.stringify({
      schema:LFEA_PIPELINE_LOCAL_DRAFT_SCHEMA,kind,identity,
      writtenAt:now,data
    });
    if(payload.length>MAX_BYTES)return false;
    const target=storageOrNull(storage);
    if(!target)return false;
    target.setItem(key,payload);
    return true;
  }catch{return false;}
}
