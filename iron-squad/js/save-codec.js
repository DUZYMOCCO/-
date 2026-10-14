// Lossless UTF-8 LZW storage envelope. Game snapshots and slot rules are unchanged.
export const SAVE_ENCODING='iron-squad-lzw-utf8-v1';
const RESET=65535,alphabet=()=>Array.from({length:256},(_,i)=>String.fromCharCode(i));
const dictionary=()=>new Map(alphabet().map((char,i)=>[char,i]));
const checksum=text=>{let hash=2166136261;for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619);return hash>>>0;};
export function packSave(json){
  let dict=dictionary(),next=256,word='';const codes=[];
  for(const byte of new TextEncoder().encode(json)){
    const char=String.fromCharCode(byte),combined=word+char;
    if(dict.has(combined)){word=combined;continue;}
    codes.push(dict.get(word));
    if(next<RESET)dict.set(combined,next++);
    else{codes.push(RESET);dict=dictionary();next=256;}
    word=char;
  }
  if(word)codes.push(dict.get(word));
  const bytes=new Uint8Array(codes.length*2);
  for(let i=0;i<codes.length;i++){bytes[i*2]=codes[i]&255;bytes[i*2+1]=codes[i]>>>8;}
  const chunks=[];for(let i=0;i<bytes.length;i+=8192)chunks.push(String.fromCharCode(...bytes.subarray(i,i+8192)));
  return {encoding:SAVE_ENCODING,chars:json.length,checksum:checksum(json),data:btoa(chunks.join(''))};
}
export function unpackSave(envelope){
  if(envelope?.encoding!==SAVE_ENCODING||!Number.isSafeInteger(envelope.chars)||envelope.chars<0||envelope.chars>100_000_000||typeof envelope.data!=='string')throw new Error('Invalid save envelope');
  const binary=atob(envelope.data);if(binary.length%2)throw new Error('Truncated save envelope');
  let dict=alphabet(),next=256,previous='',bytes=0;const chunks=[];
  for(let i=0;i<binary.length;i+=2){
    const code=binary.charCodeAt(i)|(binary.charCodeAt(i+1)<<8);
    if(code===RESET){dict=alphabet();next=256;previous='';continue;}
    const word=dict[code]??(code===next&&previous?previous+previous[0]:null);
    if(word===null)throw new Error('Invalid save dictionary');
    bytes+=word.length;if(bytes>envelope.chars*4)throw new Error('Invalid expanded save size');
    chunks.push(word);
    if(previous&&next<RESET)dict[next++]=previous+word[0];
    previous=word;
  }
  const json=new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(chunks.join(''),char=>char.charCodeAt(0)));
  if(json.length!==envelope.chars||checksum(json)!==envelope.checksum)throw new Error('Save integrity check failed');
  return json;
}
