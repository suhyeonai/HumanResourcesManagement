// Use CSS tracks for the common leadership / bureau / department layout.
// Employee cards determine row height; connector positions do not depend on measured pixels.
function renderStableDirectoryChart(org,members){
 const byName=new Map(org.nodes.map(n=>[n.name,n])),leaders=['부위원장','상임위원','사무처장'];
 if(!leaders.every(name=>byName.has(name)))return null;
 const bureaus=org.nodes.filter(n=>n.parent==='사무처장');
 if(!bureaus.length||!bureaus.every(n=>n.name.endsWith('국')))return null;
 const visited=new Set(leaders);
 const card=(node,kind)=>{visited.add(node.name);const children=org.nodes.filter(n=>n.parent===node.name);return '<section class="stable-unit '+kind+'"><h4>'+esc(node.name)+'</h4>'+members(node)+(children.length?'<div class="stable-contained">'+children.map(child=>card(child,child.name.endsWith('팀')?'stable-team':'stable-subunit')).join('')+'</div>':'')+'</section>';};
 const columns=bureaus.map(bureau=>{visited.add(bureau.name);const departments=org.nodes.filter(n=>n.parent===bureau.name);if(!departments.every(n=>n.name.endsWith('과')))return null;return '<section class="stable-bureau"><div class="stable-unit stable-bureau-head"><h4>'+esc(bureau.name)+'</h4>'+members(bureau)+'</div><div class="stable-departments">'+departments.map(n=>card(n,'stable-department')).join('')+'</div></section>';});
 if(columns.some(c=>c===null)||visited.size!==org.nodes.length)return null;
 return '<div class="org-scroll"><div class="org-chart stable-chart" style="--bureau-count:'+bureaus.length+'" role="group" aria-label="직위, 국, 과, 팀 순서의 조직연락망"><div class="stable-leadership">'+leaders.map(name=>'<section class="stable-unit stable-leader"><h4>'+esc(name)+'</h4>'+members(byName.get(name))+'</section>').join('')+'</div><div class="stable-bureaus">'+columns.join('')+'</div></div></div>';
}
