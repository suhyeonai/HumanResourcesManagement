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
