import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalize,month,parseGoogle} from './sync-data.mjs';
const rows=()=>[['Tiêu đề'],[null,'Chỉ số','Cán bộ phụ trách','Date(2026,5,1)','Date(2026,6,1)','Date(2026,7,1)'],[null,'QUẢN LÝ NGƯỜI DÙNG',null],[null,'Số thẻ','CN. Bảy',12,0,null],[null,'Nội dung','CN. Bảy','A','B',null]];
test('typed dates, empty future months, real zero, missing values',()=>{const d=normalize(rows());assert.equal(d.latestMonth,'2026-07');assert.equal(d.previousMonth,'2026-06');assert.equal(d.sections[0].metrics[0].values['2026-07'],0);assert.equal(d.periods.length,2)});
test('calendar previous month does not skip missing month',()=>{const r=rows();r[1][4]='Date(2026,8,1)';assert.equal(normalize(r).previousMonth,null)});
test('duplicate dates, malformed header and error cells rejected',()=>{const r=rows();r[1][4]=r[1][3];assert.throws(()=>normalize(r),/Trùng/);assert.throws(()=>normalize([['x']]),/tiêu đề/);const e=rows();e[3][4]='#DIV/0!';assert.throws(()=>normalize(e),/Lỗi ô/)});
test('Google typed cells preserve dates and numbers; reject error payload',()=>{assert.deepEqual(parseGoogle('google.visualization.Query.setResponse({"table":{"cols":[{},{}],"rows":[{"c":[{"v":"Date(2026,6,1)"},{"v":12.5,"f":"12,5"}]}]}});'),[['Date(2026,6,1)',12.5]]);assert.throws(()=>parseGoogle('{"status":"error"}'))});
test('invalid months rejected',()=>{assert.equal(month('13/2026'),null);assert.equal(month('07/2026'),'2026-07')});
