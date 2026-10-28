process.once('message',async payload=>{
 try{
  const {markdownToHwpx,validateHwpx}=await import('kordoc');
  const content=Buffer.from(await markdownToHwpx(payload.markdown,{page:{size:'A4',orientation:'landscape'},theme:{tableHeaderBold:true,headingColors:{1:'#244D50',2:'#356367'}},totalRow:'keep'}));
  const validation=await validateHwpx(content);
  if(!validation.ok)throw Error('생성한 HWPX 구조 검증에 실패했습니다.');
  if(content.length>20*1024*1024)throw Error('생성 문서가 20MB를 초과했습니다. 직원 범위를 줄여 주세요.');
  process.send({ok:true,base64:content.toString('base64')});
 }catch(e){process.send({ok:false,error:String(e.message||e).slice(0,1000)});}
 finally{process.disconnect();}
});
