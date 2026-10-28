function hwpxText(value){return String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\|/g,'&#124;').replace(/[*_`\[\]\\]/g,c=>'\\'+c).replace(/[\r\n]+/g,' ');}
function hwpxTable(headers,rows){return '| '+headers.map(hwpxText).join(' | ')+' |\n| '+headers.map(()=>'---').join(' | ')+' |\n'+rows.map(row=>'| '+row.map(v=>hwpxText(v==null?'—':v)).join(' | ')+' |').join('\n');}
// Count organizational units, including vacant units, rather than employee departments.
function organizationComposition(organization){
 const order=['처','본부','국','부','실','단','과','팀','센터','지사','지점','위원회','기타'];
 const suffixes=['위원회','본부','센터','지사','지점','처','국','부','실','단','과','팀'];
 const counts=Object.fromEntries(order.map(type=>[type,0])),seen=new Set();
 for(const node of organization?.nodes||[]){
  let name=String(node.name||'').replace(/\s+/g,'');if(!name||name===String(organization.name||'').replace(/\s+/g,''))continue;
  if(['부위원장','상임위원','위원장','기관장','대표','대표이사','이사장','총장','원장','청장','회장'].includes(name))continue;
  // A department head node represents that unit when the unit itself is not listed.
  if(/(?:처|본부|국|부|실|단|과|팀|센터|지사|지점)장$/.test(name))name=name.slice(0,-1);
  const type=suffixes.find(suffix=>name.endsWith(suffix));
  if(!type&&!node.parent)continue;
  if(seen.has(name))continue;seen.add(name);counts[type||'기타']++;
 }
 const parts=order.filter(type=>counts[type]).map(type=>type==='기타'?'기타 '+counts[type]+'개':counts[type]+type);
 return {counts,total:seen.size,text:parts.join(' ')||'구성 미설정'};
}

function buildHwpxDocument(kind){
 const generic=typeof workforceStats==='function',organization=generic?store.organization.name:'인구전략위원회',title=organization+(kind==='summary'?' 인력현황 요약 보고서':' 직원 명부'),date=typeof today==='string'?today:localDate();
 const scopeLabels={inside:'정원 내',outside:'정원 외',unspecified:'미지정'};
 let markdown='# '+hwpxText(title)+'\n\n기준일: '+date+'\n\n';
 if(kind==='summary'){
  let rows,active,inside,outside,unassigned,ending,departments;
  if(generic){const stats=workforceStats(store);rows=stats.rows;active=stats.active;inside=stats.inside.count;outside=stats.outside.count;unassigned=stats.unassigned;const currentPeople=store.employees.filter(current);ending=currentPeople.filter(soon).length;departments=new Set(currentPeople.map(e=>e.dept)).size;}
  else{const currentPeople=employees.filter(e=>state(e)==='active');active=currentPeople.length;inside=currentPeople.filter(e=>type(e.category).inside).length;outside=active-inside;unassigned=0;ending=currentPeople.filter(soon).length;departments=new Set(currentPeople.map(e=>e.dept)).size;rows=TYPES.map(t=>{const people=currentPeople.filter(e=>e.category===t.id);return {name:t.name,scope:t.inside?'inside':'outside',quota:t.quota,count:people.length,vacancy:Math.max(0,t.quota-people.length),excess:Math.max(0,people.length-t.quota),working:people.filter(e=>employment(e)==='working').length,leave:people.filter(e=>employment(e)==='leave').length,sick:people.filter(e=>employment(e)==='sick').length};});}
  markdown+='## 인력 운영 현황\n\n'+hwpxTable(['항목','인원 / 수'],[['전체 현원',active+'명'],['정원 내 현원',inside+'명'],['정원 외 현원',outside+'명'],['정원 구분 미지정',unassigned+'명'],['30일 이내 근무 종료',ending+'명'],['조직 구성',organizationComposition(generic?store.organization:{name:'인구전략위원회',nodes:DEPARTMENTS.map(name=>({name,parent:'조직'}))}).text]])+'\n\n';
  markdown+='## 인력 구분별 현황\n\n';const allSet=rows.every(r=>r.quota!==null);const totals=['합계','전체',allSet?rows.reduce((s,r)=>s+r.quota,0):'일부 미설정',active,allSet?rows.reduce((s,r)=>s+r.vacancy,0):null,allSet?rows.reduce((s,r)=>s+r.excess,0):null,rows.reduce((s,r)=>s+r.working,0),rows.reduce((s,r)=>s+r.leave,0),rows.reduce((s,r)=>s+r.sick,0)];
  markdown+=hwpxTable(['인력 구분','정원 구분','정원 / 기준','현원','미충원','초과','재직','휴직','병가'],[...rows.map(r=>[r.name,scopeLabels[r.scope],r.quota===null?'미설정':r.quota,r.count,r.vacancy,r.excess,r.working,r.leave,r.sick]),totals])+'\n\n';
  markdown+='집계 기준: 기준일의 근무기간에 해당하는 직원 중 퇴직자를 제외하며 휴직·병가를 포함합니다. 검색 조건과 관계없이 전체 직원으로 집계합니다. 정원 또는 기준이 미설정인 구분의 미충원·초과는 계산하지 않습니다.\n';
 }else{
  const people=generic?filtered():(window.visibleEmployees||[]);const statusSelect=generic?$('statusFilter'):$('stateFilter'),deptSelect=generic?$('departmentFilter'):$('deptFilter'),sortSelect=$('sortOrder');
  const selectedText=select=>select?.selectedOptions?.[0]?.textContent||'전체';
  markdown+='출력 인원: '+people.length+'명 / '+hwpxText(selectedText(statusSelect))+' / '+hwpxText(selectedText(deptSelect))+' / '+hwpxText(selectedText(sortSelect))+'\n\n';
  const query=$('search').value.trim();if(query)markdown+='검색어: '+hwpxText(query)+'\n\n';
  if(!people.length)markdown+='선택한 조건에 해당하는 직원이 없습니다.\n';
  else{const headers=['소속부서','이름','직급',generic?'고용형태':'인력 구분','근무시작일','근무종료일','구분','내선번호'];
   markdown+=hwpxTable(headers,people.map(e=>[e.dept,e.name,e.rank,generic?e.category:type(e.category).name,e.start,e.end||'—',generic?STATUS[e.employmentStatus]:EMPLOYMENT[employment(e)],e.extension||'—']))+'\n\n';
   markdown+='## 원소속 및 담당자 연락처\n\n'+hwpxTable(['소속부서','이름','원소속','원소속 담당자 연락처'],people.map(e=>[e.dept,e.name,e.origin||'—',e.contact||'—']))+'\n';
   if(generic)markdown+='\n## 관리·보고용 인력 구분\n\n'+hwpxTable(['소속부서','이름','인력 구분'],people.map(e=>[e.dept,e.name,reportingGroup(e)]))+'\n';
  }
 }
 return {markdown,filename:title.replace(/[\\/:*?"<>|]/g,'_')+'_'+date+'.hwpx'};
}
async function exportHwpx(kind){
 const say=typeof message==='function'?message:notify;
 if(!globalThis.KORDOC_BRIDGE){say('한글문서 저장은 Kordoc 로컬 연결이 필요합니다. Kordoc_연결실행.cmd를 실행하고 아래 ‘Kordoc 직원현황 열기’ 링크에서 접속하세요. 기존 자료는 JSON 백업으로 옮길 수 있습니다.');return;}
 const buttons=[...document.querySelectorAll('[data-hwpx]')];buttons.forEach(b=>b.disabled=true);
 try{say('편집 가능한 한글문서를 생성하고 있습니다…');const payload=buildHwpxDocument(kind);const response=await fetch('/api/kordoc/hwpx',{method:'POST',headers:{'Content-Type':'application/json','X-Kordoc-Token':globalThis.KORDOC_BRIDGE.token},body:JSON.stringify(payload),signal:AbortSignal.timeout(100000)});if(!response.ok){const result=await response.json();throw Error(result.error||'문서를 생성하지 못했습니다.');}download(await response.arrayBuffer(),payload.filename,'application/vnd.hancom.hwpx');say('HWPX 파일을 저장했습니다. 한글에서 열어 표와 내용을 편집할 수 있습니다.');}catch(e){say('한글문서 저장 실패: '+(e.name==='TimeoutError'?'문서 생성 시간이 초과되었습니다. 명부의 직원 범위를 줄여 주세요.':e.message));}finally{buttons.forEach(b=>b.disabled=false);}
}
