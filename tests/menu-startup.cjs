const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
for(const file of ['조직연락망_범용양식.html','인구전략위원회_조직연락망.html']){
 const h=fs.readFileSync(file,'utf8'),nodes=new Map();let opened=0;
 const element=()=>({value:'',innerHTML:'',textContent:'',options:[],hidden:false,style:{},dataset:{},classList:{add(){},remove(){}},addEventListener(){},setAttribute(){},replaceChildren(...v){this.options=v;},add(v){this.options.push(v);},showModal(){opened++;},close(){},querySelector(){return null;},querySelectorAll(){return [];}});
 const c=vm.createContext({console,Option:function(t,v){this.text=t;this.value=v;},localStorage:{getItem(){return null;}},window:{addEventListener(){}},requestAnimationFrame:()=>1,cancelAnimationFrame(){},document:{body:element(),getElementById:id=>nodes.get(id)||null,querySelector:()=>element(),querySelectorAll:()=>[]}});
 // Parse incrementally, like the browser: later elements cannot be used by earlier scripts.
 const events=/<script\b([^>]*)>([\s\S]*?)<\/script>|\sid="([^"]+)"/g;for(const m of h.matchAll(events)){if(m[3]){nodes.set(m[3],element());continue;}const attrs=m[1],code=m[2];if(attrs.includes('directoryData')){const el=element();el.textContent=code;nodes.set('directoryData',el);}else if(!attrs.trim())vm.runInContext(code,c);}
 assert.equal(typeof nodes.get('organizationButton').onclick,'function');nodes.get('organizationButton').onclick();assert(opened>0);assert(nodes.get('organizationRows').innerHTML.includes('data-parent'));
 assert.equal(typeof nodes.get('importButton').onclick,'function');assert.equal(typeof nodes.get('peopleEntryButton').onclick,'function');assert.equal(typeof nodes.get('syncButton').onclick,'function');
 vm.runInContext("data.organization=defaultOrganization();renderCustomOrganization([]);",c);
 const chart=nodes.get('orgBody').innerHTML;
 assert(chart.includes('stable-departments'));
 assert(chart.includes('stable-team'));
 assert(chart.indexOf('<h4>부위원장</h4>')<chart.indexOf('<h4>상임위원</h4>'));
 assert(chart.indexOf('<h4>상임위원</h4>')<chart.indexOf('<h4>사무처장</h4>'));
 assert(chart.includes('stable-commissioner'));
 assert(chart.includes('stable-main-link'));
 assert(chart.indexOf('인구전략총괄과')<chart.indexOf('운영지원팀'));
 assert(chart.indexOf('운영지원팀')<chart.indexOf('홍보소통과'));
 assert(!h.includes('(194*96/25.4)/Math.max(1,height)'));
}
console.log('PASS: incremental DOM startup and organization editor handlers in both directories');
