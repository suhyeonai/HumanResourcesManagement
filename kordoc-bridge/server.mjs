import http from 'node:http';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes} from 'node:crypto';
import {fork} from 'node:child_process';
const base=path.dirname(fileURLToPath(import.meta.url)),root=path.dirname(base),port=8765,token=randomBytes(24).toString('hex');
const pages=['인구전략위원회_조직연락망.html','조직연락망_범용양식.html','직원현황_범용양식.html','인구전략위원회_직원현황.html'];let busy=false;
function reply(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));}
function candidatesFromText(text){const names=[];for(const line of text.split(/\r?\n/)){const cleaned=line.replace(/<[^>]*>/g,' ').replace(/[\s|*#`]+/g,' ').trim();for(const match of cleaned.matchAll(/[가-힣A-Za-z0-9·]{2,35}(?:위원회|대표이사|부위원장|상임위원|사무처장|기관장|센터장|본부장|국장|팀장|이사장|총장|청장|센터|본부|사업단|위원장|부문|지사|지점|국|과|팀|실|부|처)/g)){const name=match[0];if(name.length<=40&&!names.includes(name))names.push(name);}}return names.slice(0,100).map(name=>({name,parent:''}));}
function parseFile(file){return new Promise((resolve,reject)=>{const child=fork(path.join(base,'parse-worker.mjs'),[file],{stdio:['ignore','ignore','pipe','ipc'],windowsHide:true});let done=false,errorText='';const timer=setTimeout(()=>finish(Error('문서 분석이 3분을 초과했습니다. 페이지 수나 이미지 크기를 줄여 주세요.')),180000);function finish(error,result){if(done)return;done=true;clearTimeout(timer);child.kill();error?reject(error):resolve(result);}child.stderr.on('data',d=>{errorText=(errorText+d).slice(-1000);});child.on('message',m=>m.ok?finish(null,m):finish(Error(m.error)));child.on('error',e=>finish(e));child.on('exit',code=>{if(!done)finish(Error('Kordoc 분석 프로세스 종료 ('+code+'). '+errorText));});});}
function generateHwpx(payload){return new Promise((resolve,reject)=>{const child=fork(path.join(base,'hwpx-worker.mjs'),[],{stdio:['ignore','ignore','ignore','ipc'],windowsHide:true});let done=false;const timer=setTimeout(()=>finish(Error('문서 생성 시간이 초과되었습니다. 직원 범위를 줄여 주세요.')),90000);function finish(error,result){if(done)return;done=true;clearTimeout(timer);child.kill();error?reject(error):resolve(result);}child.on('message',m=>m.ok?finish(null,Buffer.from(m.base64,'base64')):finish(Error(m.error)));child.on('error',e=>finish(e));child.on('exit',code=>{if(!done)finish(Error('문서 생성 프로세스 종료 ('+code+')'));});child.send(payload);});}
const server=http.createServer(async(req,res)=>{
 try{
  if(!['127.0.0.1:'+port,'localhost:'+port].includes(req.headers.host)){reply(res,403,{error:'허용되지 않은 호스트'});return;}
  const url=new URL(req.url,'http://127.0.0.1:'+port);
  if(req.method==='GET'&&url.pathname==='/health'){reply(res,200,{ok:true,service:'kordoc',version:'4.24.14'});return;}
  if(req.method==='GET'){
   const filename=url.pathname==='/'?pages[0]:decodeURIComponent(url.pathname.slice(1));if(!pages.includes(filename)){reply(res,404,{error:'페이지 없음'});return;}
   let html=await readFile(path.join(root,filename),'utf8');html=html.replace('</head>',()=>'<script id="kordocBridgeRuntime">globalThis.KORDOC_BRIDGE='+JSON.stringify({token})+';</script></head>');
   res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(html);return;
  }
  if(req.method!=='POST'||!['/api/kordoc/parse','/api/kordoc/hwpx'].includes(url.pathname)){reply(res,404,{error:'경로 없음'});return;}
  if(req.headers['x-kordoc-token']!==token||!['http://127.0.0.1:'+port,'http://localhost:'+port].includes(req.headers.origin)){reply(res,403,{error:'로컬 연락망 화면에서만 요청할 수 있습니다.'});return;}
  if(busy){reply(res,409,{error:'다른 문서를 분석 중입니다. 완료 후 다시 시도하세요.'});return;}
  if(url.pathname==='/api/kordoc/hwpx'){
   busy=true;
   try{const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>2*1024*1024){reply(res,413,{error:'요청 문서가 너무 큽니다. 직원 범위를 줄여 주세요.'});return;}chunks.push(chunk);}let payload;try{payload=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{reply(res,400,{error:'문서 요청 형식이 올바르지 않습니다.'});return;}if(typeof payload.markdown!=='string'||!payload.markdown.trim()||payload.markdown.length>1000000||typeof payload.filename!=='string'||payload.filename.length>180){reply(res,400,{error:'문서 내용과 파일명을 확인하세요.'});return;}const output=await generateHwpx({markdown:payload.markdown});const filename=payload.filename.replace(/[\\/:*?"<>|\r\n]/g,'_').replace(/\.hwpx$/i,'')+'.hwpx';res.writeHead(200,{'Content-Type':'application/vnd.hancom.hwpx','Content-Disposition':"attachment; filename*=UTF-8''"+encodeURIComponent(filename),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(output);}
   finally{busy=false;}
   return;
  }
  const filename=decodeURIComponent(String(req.headers['x-file-name']||'')),ext=path.extname(filename).toLowerCase();
  if(!['.png','.jpg','.jpeg','.webp','.pdf','.hwp','.hwpx','.docx','.pptx'].includes(ext)){reply(res,400,{error:'지원하지 않는 파일 형식입니다.'});return;}
  busy=true;let temp;
  try{const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>20*1024*1024){reply(res,413,{error:'20MB 이하 파일을 선택하세요.'});return;}chunks.push(chunk);}if(!size)throw Error('빈 파일입니다.');temp=await mkdtemp(path.join(tmpdir(),'kordoc-directory-'));const file=path.join(temp,'document'+ext);await writeFile(file,Buffer.concat(chunks));const result=await parseFile(file);const nodes=candidatesFromText(result.text);reply(res,200,{text:result.text,title:result.title,nodes,message:'OCR로 찾은 조직명 후보입니다. 연결선과 상하 관계는 확정하지 않으므로 상위 조직을 확인하세요.'});}
  finally{busy=false;if(temp)await rm(temp,{recursive:true,force:true});}
 }catch(e){if(!res.headersSent)reply(res,500,{error:String(e.message||e)});else res.end();}
});
server.requestTimeout=240000;
server.listen(port,'127.0.0.1',()=>console.log('Kordoc 연결 준비: http://127.0.0.1:'+port+' (이 PC에서만 접근 가능)'));
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?'8765 포트가 사용 중입니다. 기존 연결 프로그램을 확인하세요.':e.message);process.exitCode=1;});
