// Presentation grouping only: employee classifications and staffing rules stay detailed.
function mergeDispatchWorkforceRows(rows){
 const isDispatch=row=>row.category==='파견직'||['dispatch','public','local'].includes(row.id)||/파견/.test(row.name);
 const dispatched=rows.filter(isDispatch);if(!dispatched.length)return rows;
 const sum=key=>dispatched.reduce((total,row)=>total+(Number(row[key])||0),0);
 const complete=key=>dispatched.every(row=>row[key]!==null&&row[key]!==undefined);
 const scopes=[...new Set(dispatched.map(row=>row.scope))];
 const merged={name:'파견직',category:'파견직',scope:scopes.length===1?scopes[0]:'mixed',quota:complete('quota')?sum('quota'):null,count:sum('count'),vacancy:complete('vacancy')?sum('vacancy'):null,excess:complete('excess')?sum('excess'):null,working:sum('working'),leave:sum('leave'),sick:sum('sick')};
 let inserted=false;return rows.flatMap(row=>{if(!isDispatch(row))return [row];if(inserted)return [];inserted=true;return [merged];});
}
(function(){
 const generic=typeof workforceStats==='function';
 const labels={inside:'정원 내',outside:'정원 외',unspecified:'미지정',mixed:'정원 내·외 합산'};
 function detailedRows(){
  const active=employees.filter(e=>state(e)==='active');
  return TYPES.map(t=>{const people=active.filter(e=>e.category===t.id);return {id:t.id,name:t.name,scope:t.inside?'inside':'outside',quota:t.quota,count:people.length,vacancy:Math.max(0,t.quota-people.length),excess:Math.max(0,people.length-t.quota),working:people.filter(e=>employment(e)==='working').length,leave:people.filter(e=>employment(e)==='leave').length,sick:people.filter(e=>employment(e)==='sick').length};});
 }
 if(generic){
  const detailedStats=workforceStats;
  workforceStats=function(value){const stats=detailedStats(value);return {...stats,rows:mergeDispatchWorkforceRows(stats.rows)};};
  renderWorkforceSummary=function(){
   const stats=workforceStats(store),summary=(item,label)=>item.quota===null?label+' 미설정 또는 일부 미설정':label+' '+item.quota+'명 · 미충원 '+item.vacancy+'명 · 초과 '+item.excess+'명';
   $('summaryDate').textContent='기준일 '+today;$('summaryBasis').textContent='현재 소속 인원 = 정원 내 + 정원 외 + 미지정 · 미지정 '+stats.unassigned+'명'+(store.employees.some(e=>reportingGroup(e)==='파견직(구분 필요)')?' · 기존 미분류 파견직은 직원 수정에서 인력 구분을 선택하세요.':'');
   $('insideCount').textContent=stats.inside.count+'명';$('outsideCount').textContent=stats.outside.count+'명';$('insideQuota').textContent=summary(stats.inside,'정원');$('outsideQuota').textContent=summary(stats.outside,'기준');
   $('workforceCards').innerHTML=stats.rows.map(r=>'<div class="workforce-card"><b>'+esc(r.name)+'</b><span>'+labels[r.scope]+'</span><strong>'+r.count+'명 <small>/ '+(r.quota===null?'기준 미설정':r.quota+'명')+'</small></strong>'+(r.quota===null?'':'<progress value="'+Math.min(r.count,r.quota)+'" max="'+Math.max(1,r.quota)+'" aria-label="'+esc(r.name)+' '+r.count+'명 / '+r.quota+'명"></progress>')+'</div>').join('');
   const allSet=stats.rows.every(r=>r.quota!==null),totals=['합계','전체',allSet?stats.rows.reduce((s,r)=>s+r.quota,0):'일부 미설정',stats.active,allSet?stats.rows.reduce((s,r)=>s+r.vacancy,0):null,allSet?stats.rows.reduce((s,r)=>s+r.excess,0):null,stats.rows.reduce((s,r)=>s+r.working,0),stats.rows.reduce((s,r)=>s+r.leave,0),stats.rows.reduce((s,r)=>s+r.sick,0)];
   $('workforceRows').innerHTML=[...stats.rows.map(r=>[r.name,labels[r.scope],r.quota===null?'미설정':r.quota,r.count,r.vacancy,r.excess,r.working,r.leave,r.sick]),totals].map((row,i)=>'<tr'+(i===stats.rows.length?' class="total-row"':'')+'>'+row.map(v=>'<td>'+esc(v===null?'—':v)+'</td>').join('')+'</tr>').join('');
  };
  renderWorkforceSummary();
 }else{
  function renderMergedCards(){$('capacity').innerHTML=mergeDispatchWorkforceRows(detailedRows()).map(r=>'<div class="capacity-item"><b>'+escapeHTML(r.name)+'</b><p>'+r.count+' / '+r.quota+'명 · '+labels[r.scope]+'</p><progress value="'+Math.min(r.count,r.quota)+'" max="'+Math.max(1,r.quota)+'" aria-label="'+escapeHTML(r.name)+' '+r.count+'명 / '+r.quota+'명"></progress></div>').join('');}
  const originalRender=render;render=function(){originalRender();renderMergedCards();};renderMergedCards();
 }
 // The generated HWPX report uses the same presentation grouping as the screen.
 const originalBuild=buildHwpxDocument;
 buildHwpxDocument=function(kind){const doc=originalBuild(kind);if(kind!=='summary')return doc;const rows=generic?workforceStats(store).rows:mergeDispatchWorkforceRows(detailedRows());const allSet=rows.every(r=>r.quota!==null),total=['합계','전체',allSet?rows.reduce((s,r)=>s+r.quota,0):'일부 미설정',rows.reduce((s,r)=>s+r.count,0),allSet?rows.reduce((s,r)=>s+r.vacancy,0):null,allSet?rows.reduce((s,r)=>s+r.excess,0):null,rows.reduce((s,r)=>s+r.working,0),rows.reduce((s,r)=>s+r.leave,0),rows.reduce((s,r)=>s+r.sick,0)];const table=hwpxTable(['인력 구분','정원 구분','정원 / 기준','현원','미충원','초과','재직','휴직','병가'],[...rows.map(r=>[r.name,labels[r.scope],r.quota===null?'미설정':r.quota,r.count,r.vacancy,r.excess,r.working,r.leave,r.sick]),total]);const marker='## 인력 구분별 현황\n\n',start=doc.markdown.indexOf(marker);if(start>=0){const tableStart=start+marker.length,end=doc.markdown.indexOf('\n\n',tableStart);if(end>=0)doc.markdown=doc.markdown.slice(0,tableStart)+table+doc.markdown.slice(end);}return doc;};
})();
