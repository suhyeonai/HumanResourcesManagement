import {parse} from 'kordoc';
try{
 const result=await parse(process.argv[2],{ocr:true,ocrLines:true,images:false,plain:true});
 if(!result.success)throw Error(result.error?.message||result.error||'문서를 읽지 못했습니다.');
 process.send({ok:true,text:String(result.markdown||'').slice(0,100000),title:String(result.metadata?.title||'').slice(0,80)});
}catch(error){process.send({ok:false,error:String(error.message||error).slice(0,1000)});}
finally{process.disconnect();}
