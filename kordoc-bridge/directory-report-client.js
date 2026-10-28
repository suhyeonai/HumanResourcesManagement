function directoryReportText(value){return String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\|/g,'&#124;').replace(/[*_`\[\]\\]/g,c=>'\\'+c).replace(/[\r\n]+/g,' ');}
function buildDirectoryHwpx(){
 const org=validateOrganization(data.organization||defaultOrganization()),q=$('search').value.trim().toLocaleLowerCase(),dept=$('department').value,filter=$('photoFilter').value;
 const people=data.people.filter(e=>(!dept||e.dept===dept)&&(!q||[e.dept,e.name,e.rank,e.extension].join(' ').toLocaleLowerCase().includes(q))&&(!filter||(filter==='extension'?!!e.extension:!e.extension)));
 const text=directoryReportText,table=rows=>'| 이름 | 담당 역할 | 직급 | 내선번호 |\n| --- | --- | --- | --- |\n'+rows.map(e=>'| '+[e.name,normalizeRoles(e.roles).map(r=>({head:'부서장',teamLead:'팀장',admin:'서무',secretary:'비서',driver:'운전원'}[r])).join(' · ')||'—',e.rank,e.extension||'—'].map(text).join(' | ')+' |').join('\n');
 let markdown='# '+text(org.name)+' 조직연락망\n\n기준일: '+localDate()+' / 출력 인원: '+people.length+'명\n\n';
 if(q||dept||filter)markdown+='적용 조건: '+text([dept||'전체 부서',q?'검색어 '+q:'',filter==='extension'?'내선번호 등록':filter==='missing'?'내선번호 미등록':''].filter(Boolean).join(' / '))+'\n\n';
 markdown+='사진을 제외한 편집 가능한 부서별 연락처 표입니다.\n\n';
 const map=new Map(org.nodes.map(n=>[n.name,n])),ordered=[];
 function visit(node,path){ordered.push({name:node.name,path:[...path,node.name]});org.nodes.filter(n=>n.parent===node.name).forEach(n=>visit(n,[...path,node.name]));}
 org.nodes.filter(n=>!n.parent).forEach(n=>visit(n,[]));
 for(const unit of ordered){const rows=people.filter(e=>orgUnit(e)===unit.name).sort(compareStaff);if(!rows.length)continue;markdown+='## '+text(unit.path.join(' > '))+'\n\n'+table(rows)+'\n\n';}
 const unmatched=people.filter(e=>!map.has(orgUnit(e))).sort(compareStaff);if(unmatched.length)markdown+='## 조직 확인 필요\n\n'+table(unmatched)+'\n\n';
 if(!people.length)markdown+='선택한 조건에 해당하는 직원이 없습니다.\n';
 return {markdown,filename:org.name.replace(/[\\/:*?"<>|]/g,'_').slice(0,80)+'_조직연락망_'+localDate()+'.hwpx'};
}
async function exportDirectoryHwpx(){
 if(viewer)return;
 if(!globalThis.KORDOC_BRIDGE){$('directoryHwpxHelp').showModal();return;}
 const button=$('directoryHwpxButton');button.disabled=true;
 try{tell('한글 연락망 문서를 생성하고 있습니다…');const payload=buildDirectoryHwpx(),response=await fetch('/api/kordoc/hwpx',{method:'POST',headers:{'Content-Type':'application/json','X-Kordoc-Token':globalThis.KORDOC_BRIDGE.token},body:JSON.stringify(payload),signal:AbortSignal.timeout(100000)});if(!response.ok){const result=await response.json();throw Error(result.error||'문서를 생성하지 못했습니다.');}download(await response.arrayBuffer(),payload.filename,'application/vnd.hancom.hwpx');tell('HWPX 연락망을 저장했습니다. 한글에서 부서별 연락처 표를 편집할 수 있습니다.');}catch(e){tell('한글문서 저장 실패: '+(e.name==='TimeoutError'?'생성 시간이 초과되었습니다. 부서나 검색 조건으로 범위를 줄여 주세요.':e.message));}finally{button.disabled=false;}
}
