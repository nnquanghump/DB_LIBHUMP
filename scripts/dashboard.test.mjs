import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {normalize} from './sync-data.mjs';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const code=html.split('<script>')[1].split('</script>')[0];
async function boot(payload){
  const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:'',style:{},classList:{toggle(){},add(){},remove(){}},handlers:{},addEventListener(k,f){this.handlers[k]=f}});return elements.get(id)};
  const context={document:{querySelector:get,addEventListener(){}},location:{protocol:'https:'},fetch:async()=>({ok:true,json:async()=>payload}),AbortSignal,URLSearchParams,Intl,Date,setTimeout:()=>1,clearTimeout(){}};
  vm.runInNewContext(code,context);await new Promise(r=>setImmediate(r));return get;
}
test('JSON renders month comparison and safely escapes text',async()=>{
  const d=normalize([[null,'Chỉ số','Cán bộ phụ trách','06/2026','07/2026'],[1,'QUẢN LÝ NGƯỜI DÙNG',null],[null,'Tổng số thẻ thư viện đang hoạt động:','A',12,15],[null,'Ghi nhận','A','ok','<img src=x onerror=alert(1)>']]);
  const get=await boot({...d,ok:true,generatedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+86400000).toISOString()});
  assert.match(get('#subtitle').textContent,/07\/2026.*06\/2026/);
  assert.match(get('#overviewStrip').innerHTML,/15/);
  assert.match(get('#tableBody').innerHTML,/&lt;img/);
  assert.doesNotMatch(get('#tableBody').innerHTML,/<img/);
  get('#monthSelect').handlers.change({target:{value:'2026-06'}});assert.match(get('#subtitle').textContent,/06\/2026/);
});
test('failed, expired and malformed JSON hide numbers and search remains safe',async()=>{
  for(const payload of [{ok:false,error:'Google lỗi'},{ok:true,schemaVersion:1,sections:[],periods:[{}],expiresAt:'2020-01-01'},{}]){
    const get=await boot(payload);assert.equal(get('#overviewStrip').innerHTML,'');assert.equal(get('#monthSelect').disabled,true);get('#search').handlers.input({target:{value:'x'}});assert.ok(get('#dataNotice').textContent);
  }
});
