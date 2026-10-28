import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {parse,validateHwpx,renderHwpxToSvg} from 'kordoc';
import sharp from 'sharp';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url))),base='http://127.0.0.1:8765',output=path.join(root,'outputs','hwpx_feature_check');await fs.mkdir(output,{recursive:true});
const html=await(await fetch(base+'/'+encodeURIComponent('직원현황_범용양식.html'))).text();const token=JSON.parse(html.match(/globalThis.KORDOC_BRIDGE=(\{[^<]+\});/)[1]).token;
const denied=await fetch(base+'/api/kordoc/hwpx',{method:'POST',body:'{}'});assert.equal(denied.status,403);
const code=await fs.readFile(path.join(root,'kordoc-bridge','report-client.js'),'utf8');
const people=[{id:'1',dept:'기획팀',name:'검증직원가',rank:'사무관',category:'계약직',start:'2026-01-01',end:'',employmentStatus:'working',extension:'1001',origin:'원기관',contact:'담당자 / 02-000-0000',staffingGroup:'직접고용 직원'},{id:'2',dept:'기획팀',name:'검증직원나',rank:'주무관',category:'파견직',start:'2026-01-01',end:'2027-01-01',employmentStatus:'leave',extension:'1002',origin:'원기관',contact:'',staffingGroup:'파견직원'}];
const stats={active:2,inside:{count:2},outside:{count:0},unassigned:0,rows:[{name:'직접고용 직원',scope:'inside',quota:3,count:1,vacancy:2,excess:0,working:1,leave:0,sick:0},{name:'파견직원',scope:'inside',quota:2,count:1,vacancy:1,excess:0,working:0,leave:1,sick:0}]};
const statuses={working:'재직',leave:'휴직',sick:'병가',retired:'퇴직'};
function context(generic){const common={today:'2026-10-28',window:{visibleEmployees:people},STATUS:statuses,EMPLOYMENT:statuses,reportingGroup:e=>e.staffingGroup,current:()=>true,soon:()=>false,$:id=>({value:id==='search'?'검증':'',selectedOptions:[{textContent:'전체'}]})};if(generic)Object.assign(common,{workforceStats:()=>stats,store:{organization:{name:'검증기관',nodes:[{name:'기획팀',parent:''}]},employees:people},filtered:()=>people.slice(0,1)});else Object.assign(common,{employees:people,DEPARTMENTS:['기획팀'],TYPES:[{id:'계약직',name:'직접고용 직원',inside:true,quota:3},{id:'파견직',name:'파견직원',inside:true,quota:2}],type:id=>({inside:true,name:id}),state:()=> 'active',employment:e=>e.employmentStatus});const c=vm.createContext(common);vm.runInContext(code,c);return c;}
for(const generic of [true,false])for(const kind of ['summary','roster']){
 const c=context(generic);const payload=vm.runInContext('buildHwpxDocument('+JSON.stringify(kind)+')',c);
 if(kind==='summary'){assert(!payload.markdown.includes('검증직원가'));assert(payload.markdown.includes('인력 구분별 현황'));assert(payload.markdown.includes('합계'));}else{assert(payload.markdown.includes('검증직원가'));if(generic)assert(!payload.markdown.includes('검증직원나'));}
 const response=await fetch(base+'/api/kordoc/hwpx',{method:'POST',headers:{Origin:base,'X-Kordoc-Token':token,'Content-Type':'application/json'},body:JSON.stringify(payload)});assert.equal(response.status,200,response.status===200?'':await response.text());const bytes=Buffer.from(await response.arrayBuffer());const validation=await validateHwpx(bytes);assert(validation.ok,JSON.stringify(validation.issues));const parsed=await parse(bytes,{images:false,ocr:false});assert(parsed.success);assert(parsed.markdown.includes(kind==='summary'?'인력 구분별 현황':'검증직원가'));
 const filename=(generic?'generic-':'dedicated-')+kind;await fs.writeFile(path.join(output,filename+'.hwpx'),bytes);
 if(generic){const rendered=await renderHwpxToSvg(bytes,{reflow:true});await fs.writeFile(path.join(output,filename+'.svg'),rendered.svg);await sharp(Buffer.from(rendered.svg)).resize({width:1500}).png().toFile(path.join(output,filename+'.png'));console.log(filename+': generated, parsed and rendered ('+rendered.pageCount+' pages).');}
}
console.log('PASS: both HR modes, summary excludes individual records, roster follows filters, authenticated local endpoint, valid HWPX XML/ZIP and editable table text roundtrip.');
