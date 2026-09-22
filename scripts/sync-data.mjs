import {mkdir, readFile, writeFile, copyFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const ROOT = new URL('../', import.meta.url);
export function month(value) {
  const s=String(value??'').trim(); let m;
  if((m=s.match(/^Date\((\d{4}),(\d{1,2}),\d+/))) return key(+m[1],+m[2]+1);
  if((m=s.match(/^(\d{4})-(\d{2})(?:-\d{2}(?:T.*)?)?$/))) return key(+m[1],+m[2]);
  if((m=s.match(/^(?:\d{1,2}[\/.-])?(\d{1,2})[\/.-](\d{4})$/))) return key(+m[2],+m[1]);
  if((m=s.match(/^(?:tháng|t)\s*(\d{1,2})\s*[\/.-]\s*(\d{4})$/i))) return key(+m[2],+m[1]);
  if(typeof value==='number' && value>35000 && value<80000){const d=new Date(Date.UTC(1899,11,30)+value*86400000);return key(d.getUTCFullYear(),d.getUTCMonth()+1);}
  return null;
}
function key(y,m){return y>=2000&&y<=2100&&m>=1&&m<=12?`${y}-${String(m).padStart(2,'0')}`:null;}
const blank=v=>v===null||v===undefined||String(v).trim()==='';
export function normalize(rows){
  const hi=rows.findIndex(r=>r.some(v=>/^\s*Chỉ số\s*$/i.test(String(v??''))));
  if(hi<0)throw Error('Không tìm thấy dòng tiêu đề Chỉ số trong sheet Dashboard.');
  const h=rows[hi],label=h.findIndex(v=>/^\s*Chỉ số\s*$/i.test(String(v??''))),owner=h.findIndex(v=>/cán bộ phụ trách/i.test(String(v??'')));
  if(owner<0)throw Error('Thiếu cột Cán bộ phụ trách.');
  const periods=[];
  h.forEach((v,col)=>{if(col<=owner)return;const k=month(v);if(k){if(periods.some(p=>p.key===k))throw Error('Trùng cột tháng '+k);periods.push({key:k,col,label:k.slice(5)+'/'+k.slice(0,4)});}});
  const sections=[];let section;
  for(let i=hi+1;i<rows.length;i++){
    const r=rows[i];if(blank(r[label]))continue;
    const title=String(r[label]).trim();
    const sectionRow=blank(r[owner])&&periods.every(p=>blank(r[p.col]))&&(title===title.toUpperCase())&&/[A-ZÀ-Ỹ]/.test(title);
    if(sectionRow){section={id:'section-'+sections.length,title,metrics:[]};sections.push(section);continue;}
    if(!section)throw Error('Chỉ số ngoài phân hệ tại dòng '+(i+1));
    const values={};for(const p of periods){const v=r[p.col];if(typeof v==='string'&&/^#(?:REF!|DIV\/0!|VALUE!|N\/A|ERROR!|NUM!|NAME\?)/.test(v))throw Error(`Lỗi ô dữ liệu dòng ${i+1} (${title}), tháng ${p.label}: ${v}`);values[p.key]=blank(v)?null:v;}
    section.metrics.push({label:String(r[label]).trim(),owner:String(r[owner]??'').trim(),values});
  }
  const metrics=sections.flatMap(s=>s.metrics);
  const active=periods.filter(p=>metrics.some(m=>!blank(m.values[p.key]))).sort((a,b)=>a.key.localeCompare(b.key));
  if(!metrics.length||!active.length)throw Error('Không tìm thấy tháng có dữ liệu.');
  const latest=active.at(-1).key,d=new Date(latest+'-01T00:00:00Z');d.setUTCMonth(d.getUTCMonth()-1);const previous=d.toISOString().slice(0,7);
  return {schemaVersion:1,latestMonth:latest,previousMonth:active.some(p=>p.key===previous)?previous:null,periods:active.map(({key,label})=>({key,label})),sections};
}
export function parseGoogle(text){
  const start=text.indexOf('{'),end=text.lastIndexOf('}');if(start<0)throw Error('Google không trả về dữ liệu bảng. Kiểm tra quyền chia sẻ.');
  const data=JSON.parse(text.slice(start,end+1));if(data.status==='error'||!data.table)throw Error('Không đọc được sheet Dashboard. Kiểm tra tên sheet và quyền chia sẻ.');
  // headers=0 keeps all original header rows, including merged titles.
  return data.table.rows.map(r=>data.table.cols.map((_,i)=>r.c?.[i]?.v??null));
}
export async function run(){
  const config=JSON.parse(await readFile(new URL('config.json',ROOT),'utf8'));
  const out=new URL('_site/',ROOT);await mkdir(new URL('data/',out),{recursive:true});await copyFile(new URL('index.html',ROOT),new URL('index.html',out));
  const now=new Date(),generatedAt=now.toISOString(),expiresAt=new Date(+now+config.maxAgeHours*3600000).toISOString();
  let payload;
  try{
    const id=config.sheetUrl.match(/\/spreadsheets\/d\/([\w-]+)/)?.[1];if(!id)throw Error('Link Google Sheets không hợp lệ.');
    const u=new URL(`https://docs.google.com/spreadsheets/d/${id}/export`);u.search=new URLSearchParams({format:'xlsx',t:String(+now)});
    const response=await fetch(u,{signal:AbortSignal.timeout(45000),cache:'no-store'});if(!response.ok)throw Error('Google Sheets trả về HTTP '+response.status);
    const bytes=Buffer.from(await response.arrayBuffer());
    if(bytes[0]!==80||bytes[1]!==75)throw Error('Google không trả về Excel. Kiểm tra quyền chia sẻ.');
    const result=spawnSync('python3',[fileURLToPath(new URL('scripts/read-xlsx.py',ROOT)),config.sheetName],{input:bytes,maxBuffer:30*1024*1024,timeout:30000});
    if(result.status!==0)throw Error('Không đọc được bản Excel hoặc thiếu sheet '+config.sheetName);
    const rows=JSON.parse(result.stdout.toString());payload={ok:true,generatedAt,expiresAt,...normalize(rows)};
    console.log(`Đồng bộ thành công: ${payload.latestMonth}, ${payload.sections.length} phân hệ.`);
  }catch(e){payload={schemaVersion:1,ok:false,generatedAt,expiresAt,error:e.message};console.error('Đồng bộ thất bại:',e.message);}
  // One atomic Pages artifact: status and data cannot be from different builds.
  await writeFile(new URL('data/dashboard.json',out),JSON.stringify(payload,null,2));
  if(process.env.GITHUB_OUTPUT)await writeFile(process.env.GITHUB_OUTPUT,`ok=${payload.ok}\n`,{flag:'a'});
  return payload;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await run();
