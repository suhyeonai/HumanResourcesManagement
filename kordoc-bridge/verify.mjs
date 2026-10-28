import assert from 'node:assert/strict';
import sharp from 'sharp';
import JSZip from 'jszip';
const base='http://127.0.0.1:8765';
const page=await(await fetch(base)).text();const config=JSON.parse(page.match(/globalThis.KORDOC_BRIDGE=(\{[^<]+\});/)[1]);
assert.equal((await fetch(base+'/health')).status,200);
const denied=await fetch(base+'/api/kordoc/parse',{method:'POST',body:'x'});assert.equal(denied.status,403);
async function upload(name,body){const response=await fetch(base+'/api/kordoc/parse',{method:'POST',headers:{Origin:base,'X-Kordoc-Token':config.token,'X-File-Name':encodeURIComponent(name)},body});const result=await response.json();assert.equal(response.status,200,JSON.stringify(result));return result;}
const zip=new JSZip();zip.file('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');zip.file('_rels/.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');zip.file('word/document.xml','<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+['예시위원회','기획총괄국','인사팀'].map(t=>'<w:p><w:r><w:t>'+t+'</w:t></w:r></w:p>').join('')+'</w:body></w:document>');
const doc=await upload('test.docx',await zip.generateAsync({type:'nodebuffer'}));assert(doc.text.includes('인사팀'));assert(doc.nodes.some(n=>n.name==='인사팀'));
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="500"><rect width="100%" height="100%" fill="white"/><g fill="black" font-family="Malgun Gothic" font-size="50"><text x="60" y="100">예시위원회</text><text x="60" y="240">기획총괄국</text><text x="60" y="380">인사팀</text></g></svg>';
const image=await sharp(Buffer.from(svg)).png().toBuffer();const ocr=await upload('organization.png',image);assert(ocr.text.trim(),'OCR produced no text');assert(ocr.nodes.length,'OCR produced no organization candidates');
console.log('PASS: local health, request authorization, real DOCX extraction, real Korean image OCR and organization candidates.');
