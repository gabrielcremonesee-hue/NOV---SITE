let player=null,currentText='',fileUrl='',volume=.82;
export function setChefVolume(value){volume=Math.max(0,Math.min(1,Number(value)));if(player)player.volume=volume}
export function stopChef(){if(player){player.pause();player.currentTime=0}player=null;currentText='';fileUrl=''}
export async function playChef(text,onStatus){
 if(currentText===text&&fileUrl&&player){player.currentTime=0;player.volume=volume;try{await player.play();onStatus('playing');return}catch(e){}}
 stopChef();currentText=text;
 if(!window.websim||typeof window.websim.textToSpeech!=='function'){onStatus('unavailable');return}
 onStatus('loading');
 try{const result=await window.websim.textToSpeech({text,voice:'pt-male',generateFile:true});if(!result||!result.url)throw new Error('Arquivo de voz não retornado.');fileUrl=result.url;player=new Audio(fileUrl);player.volume=volume;player.onended=()=>onStatus('ended');player.onerror=()=>onStatus('unavailable');await player.play();onStatus('playing')}
 catch(error){player=null;fileUrl='';onStatus('unavailable')}
}
export function pauseChef(){if(player&&!player.paused)player.pause()}
export async function resumeChef(){if(player&&player.paused){try{await player.play()}catch(e){}}}
export function chefAudioState(){return player?{paused:player.paused,ended:player.ended}:null}
