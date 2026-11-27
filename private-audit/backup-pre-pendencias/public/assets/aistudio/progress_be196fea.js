const KEY='fervec-course-v2';
export function loadProgress(){
 const base={demo:false,stage:0,done:[],mise:false,miseChecks:[],questionsAnswers:[],questionsFinished:false,questionAttempts:[],examAnswers:[],examCurrent:0,examReview:false,examAttempts:[],examStatus:'intro',questionCurrent:0,voiceVolume:.82,lessonFinished:false};
 try{const v=JSON.parse(localStorage.getItem(KEY)||'null');if(v&&typeof v==='object')return Object.assign(base,v)}catch(e){}
 // Upgrade the previous local demo without dropping lesson progress.
 try{const old=JSON.parse(localStorage.getItem('fervec-demo-v1')||'null');if(old&&typeof old==='object'){const migrated=Object.assign(base,{demo:!!old.demo,stage:Number.isInteger(old.stage)?old.stage:0,done:Array.isArray(old.done)?old.done:[],mise:!!old.mise,miseChecks:Array.isArray(old.miseChecks)?old.miseChecks:[],lessonFinished:!!old.lessonDone,voiceVolume:typeof old.volume==='number'?old.volume:.82});try{localStorage.setItem(KEY,JSON.stringify(migrated))}catch(e){}return migrated}}catch(e){}
 return base;
}
export function saveProgress(state){try{localStorage.setItem(KEY,JSON.stringify(state));return true}catch(e){return false}}
export function clearProgress(){try{localStorage.removeItem(KEY);localStorage.removeItem('fervec-demo-v1');Object.keys(localStorage).filter(k=>k.indexOf('fc-micro-')===0).forEach(k=>localStorage.removeItem(k));return true}catch(e){return false}}
export function isMicroDone(stage,index){try{return localStorage.getItem('fc-micro-'+stage+'-'+index)==='1'}catch(e){return false}}
export function setMicroDone(stage,index,value){try{localStorage.setItem('fc-micro-'+stage+'-'+index,value?'1':'0');return true}catch(e){return false}}
