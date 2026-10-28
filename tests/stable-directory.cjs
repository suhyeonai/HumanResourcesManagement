const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const c=vm.createContext({esc:v=>String(v).replaceAll('<','&lt;')});vm.runInContext(fs.readFileSync('kordoc-bridge/stable-directory-chart.js','utf8'),c);
const org=JSON.parse(fs.readFileSync('인구전략위원회_조직구성.json','utf8'));
for(const count of [0,1,5,12]){const html=c.renderStableDirectoryChart(org,n=>'<div>'+Array.from({length:count},(_,i)=>n.name+' 직원'+i).join('<br>')+'</div>');assert(html);assert.equal((html.match(/class="stable-bureau"/g)||[]).length,4);assert.equal((html.match(/stable-unit stable-department/g)||[]).length,14);assert.equal((html.match(/stable-unit stable-team/g)||[]).length,1);assert.equal((html.match(/<h4>운영지원팀<\/h4>/g)||[]).length,1);assert(html.indexOf('인구전략총괄과')<html.indexOf('운영지원팀'));assert(html.indexOf('운영지원팀')<html.indexOf('홍보소통과'));}
assert.equal(c.renderStableDirectoryChart({name:'Other',nodes:[{name:'대표',parent:''}]},()=>''),null);
const extended=structuredClone(org);extended.nodes.push({name:'새로운직위',parent:''});assert.equal(c.renderStableDirectoryChart(extended,()=>''),null);
console.log('PASS: fixed bureau columns, department order, contained teams, variable staffing and fallback without data loss');
