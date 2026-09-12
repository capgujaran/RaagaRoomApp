
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const songs={
    kalyani:{title:'Kalyani',heading:'ಕಲ್ಯಾಣಿ',lang:'kn',language:'Kannada lyrics',subtitle:'Scroll at your own pace.',versions:{
      karaoke:{audio:$('audio-karaoke'),label:'Karaoke',duration:228.624,offset:0},
      original:{audio:$('audio-original'),label:'Original',duration:234.527347,offset:-0.127846}
    }},
    'mere-sapno':{title:'Mere Sapno Ki Rani',heading:'मेरे सपनों की रानी',lang:'hi',language:'Hindi lyrics',subtitle:'Scroll at your own pace.',versions:{
      karaoke:{audio:$('audio-mere-karaoke'),label:'Karaoke',duration:330.96,offset:0}
    }},
    'o-jane-jana':{title:'O Jane Jana',heading:'ओ ओ जाने जाना',lang:'hi',language:'Hindi lyrics',subtitle:'Scroll at your own pace.',versions:{
      karaoke:{audio:$('audio-jane-karaoke'),label:'Karaoke',duration:343.464,offset:0}
    }},
    'aa-aa-aye':{title:'Aa Aa Aye',heading:'Aa Aa Aye',lang:'hi-Latn',language:'Hindi · Roman letters',subtitle:'Mera Dil Na Todo',versions:{
      karaoke:{audio:$('audio-aa-karaoke'),label:'Karaoke',duration:295.944,offset:0}
    }},
    manasilayo:{title:'Manasilayo',heading:'ಮನಸ್ಸಿಲಾಯೋ',lang:'kn',language:'Kannada lyrics',subtitle:'Scroll at your own pace.',versions:{
      karaoke:{audio:$('audio-manasilayo-karaoke'),label:'Karaoke',duration:233.88,offset:0},
      original:{audio:$('audio-manasilayo-original'),label:'Original',duration:235.676735,offset:-0.062086}
    }}
  };
  const allTracks=Object.values(songs).flatMap(song=>Object.values(song.versions));
  const versions=Object.fromEntries(Object.keys(songs).map(id=>[id,'karaoke']));
  const radios=Array.from(document.querySelectorAll('input[name="version"]'));
  const seek=$('seek'),play=$('play'),error=$('error');
  const pendingPositions=new Map(),playedSongs=new Set();
  let selectedSong=null,currentView='home',currentRoute=null,seeking=false,wakeLock=null;
  let playIntent=false,loading=false,switching=false,requestId=0;
  let lyricSize=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--lyric-size'))||20;
  const track=()=>selectedSong?songs[selectedSong].versions[versions[selectedSong]]:null;
  const active=()=>track()?.audio||null;
  const durationOf=media=>Number.isFinite(media.duration)&&media.duration>0?media.duration:allTracks.find(t=>t.audio===media).duration;
  const positionOf=media=>pendingPositions.has(media)?pendingPositions.get(media):(media.currentTime||0);
  const finished=media=>media.ended||positionOf(media)>=durationOf(media)-0.025;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const format=seconds=>`${Math.floor(Math.max(0,seconds)/60)}:${String(Math.floor(Math.max(0,seconds)%60)).padStart(2,'0')}`;
  const playIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 4 12 8-12 8z" fill="currentColor" stroke="none"/></svg>';
  const pauseIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14" stroke-width="4"/></svg>';

  function setSize(value){
    lyricSize=clamp(value,18,30);
    document.documentElement.style.setProperty('--lyric-size',lyricSize+'px');
    $('smaller').disabled=lyricSize<=18;$('larger').disabled=lyricSize>=30;
  }
  $('smaller').addEventListener('click',()=>setSize(lyricSize-2));
  $('larger').addEventListener('click',()=>setSize(lyricSize+2));
  function setPosition(media,value){
    const target=clamp(value,0,durationOf(media));
    if(media.readyState===0)pendingPositions.set(media,target);else pendingPositions.delete(media);
    try{media.currentTime=target;}catch(_){pendingPositions.set(media,target);}
  }
  function updateTime(){
    const media=active();if(!media)return;
    const duration=durationOf(media);seek.max=duration;
    if(!seeking)seek.value=positionOf(media);
    const time=seeking?Number(seek.value):positionOf(media);
    $('current-time').textContent=format(time);$('total-time').textContent=format(Math.ceil(duration));
    seek.style.setProperty('--progress',`${clamp(time/duration*100,0,100)}%`);
    seek.setAttribute('aria-valuetext',`${Math.floor(time/60)} minutes, ${Math.floor(time%60)} seconds`);
  }
  async function keepAwake(){
    if('wakeLock' in navigator&&active()&&!active().paused&&document.visibilityState==='visible'&&!wakeLock){
      try{wakeLock=await navigator.wakeLock.request('screen');wakeLock.addEventListener('release',()=>{wakeLock=null;});}catch(_){}
    }
  }
  function updatePlayback(){
    const media=active();if(!media)return;
    const playing=playIntent&&(loading||!media.paused)&&!finished(media);
    play.innerHTML=playing?pauseIcon:playIcon;
    play.setAttribute('aria-label',playing?'Pause music':finished(media)?'Replay music':'Play music');
    $('song-title').textContent=`${songs[selectedSong].title} · ${track().label}`;
    $('now-playing-open').setAttribute('aria-label',`Open ${songs[selectedSong].title} lyrics`);
    $('play-state').textContent=loading?'Starting music…':playing?'Playing · your music stays with you':finished(media)?'Song finished · tap to replay':positionOf(media)>0?'Paused · tap to continue':'Tap play to sing along';
    document.querySelectorAll('[data-song]').forEach(card=>{
      const chosen=card.dataset.song===selectedSong;
      card.classList.toggle('is-current',chosen);
      if(chosen)card.setAttribute('aria-current','true');else card.removeAttribute('aria-current');
    });
    if('mediaSession' in navigator)navigator.mediaSession.playbackState=playing?'playing':'paused';
    if(playing)keepAwake();else if(wakeLock){wakeLock.release().catch(()=>{});wakeLock=null;}
  }
  async function startMusic(){
    const media=active();if(!media)return;
    const id=++requestId;playIntent=true;loading=true;error.hidden=true;
    // Invoke play directly in the user gesture, without rebuilding the player.
    try{
      const promise=media.play();updatePlayback();await promise;
      if(media!==active()||!playIntent)media.pause();
      if(id===requestId){loading=false;updatePlayback();}
    }catch(_){
      if(id!==requestId)return;
      playIntent=false;loading=false;updatePlayback();
      error.textContent='Tap Play to continue. If you are viewing this inside another app, open Raaga Room in your browser.';error.hidden=false;
    }
  }
  function pauseMusic(){
    ++requestId;playIntent=false;loading=false;active()?.pause();updatePlayback();
  }
  function updateVersionControls(){
    if(!selectedSong)return;
    const hasOriginal=Boolean(songs[selectedSong].versions.original);
    $('version-options').hidden=currentView!=='song'||!hasOriginal;
    $('version-note').hidden=currentView!=='song'||hasOriginal;
    radios.forEach(radio=>{
      radio.disabled=!songs[selectedSong].versions[radio.value];
      radio.checked=radio.value===versions[selectedSong];
      radio.closest('label').classList.toggle('is-selected',radio.checked);
    });
  }
  function selectVersion(value){
    if(!selectedSong||!songs[selectedSong].versions[value]||value===versions[selectedSong])return;
    const source=track(),from=source.audio,destination=songs[selectedSong].versions[value];
    const resume=(playIntent||!from.paused)&&!finished(from),time=positionOf(from);
    const target=!playedSongs.has(selectedSong)&&time===0?0:time+destination.offset-source.offset;
    ++requestId;switching=true;loading=false;from.pause();versions[selectedSong]=value;seeking=false;
    destination.audio.pause();setPosition(destination.audio,target);
    error.hidden=true;playIntent=resume&&!finished(destination.audio);switching=false;
    updateVersionControls();updateTime();updatePlayback();updateMediaMetadata();
    if(playIntent)startMusic();
  }
  function selectSong(id){
    if(!songs[id]||id===selectedSong)return;
    const from=active(),resume=Boolean(from&&(playIntent||!from.paused)&&!finished(from));
    ++requestId;switching=true;loading=false;allTracks.forEach(t=>t.audio.pause());
    selectedSong=id;seeking=false;playIntent=resume;error.hidden=true;
    // Each song retains its own music and lyric positions when revisited.
    if(resume&&finished(active()))setPosition(active(),0);
    switching=false;$('player').hidden=false;
    const song=songs[id];
    $('song-heading').textContent=song.heading;$('song-heading').setAttribute('lang',song.lang);
    $('song-language').textContent=song.language;$('song-subtitle').textContent=song.subtitle;
    Object.keys(songs).forEach(key=>$('reader-'+key).hidden=key!==id);
    updateVersionControls();updateTime();updatePlayback();updateMediaMetadata();
    if(resume)startMusic();
  }
  function normalizedRoute(value){
    return ['home','playlist',...Object.keys(songs).map(id=>'song/'+id)].includes(value)?value:'home';
  }
  function renderRoute(value){
    const route=normalizedRoute(value),view=route.startsWith('song/')?'song':route;
    const moveFocus=currentRoute!==null&&currentRoute!==route;
    currentRoute=route;
    currentView=view;
    if(view==='song')selectSong(route.slice(5));
    ['home','playlist','song'].forEach(key=>$(key+'-view').hidden=key!==view);
    document.body.dataset.view=view;
    document.querySelectorAll('[data-route]').forEach(link=>{
      if(link.dataset.route===view)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
    });
    updateVersionControls();
    document.title=view==='song'?`${songs[selectedSong].title} · Raaga Room`:view==='playlist'?'Your playlist · Raaga Room':'Raaga Room · A little room for your voice';
    if(moveFocus)$(view+'-heading').focus({preventScroll:true});
  }
  function navigate(route){
    renderRoute(route);
    if(window.location.hash.slice(1)!==route)window.location.hash=route;
  }
  document.querySelectorAll('[data-route]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();navigate(link.dataset.route);}));
  document.querySelectorAll('[data-song]').forEach(card=>card.addEventListener('click',event=>{event.preventDefault();navigate('song/'+card.dataset.song);}));
  $('now-playing-open').addEventListener('click',()=>{if(selectedSong)navigate('song/'+selectedSong);});
  window.addEventListener('hashchange',()=>renderRoute(window.location.hash.slice(1)));
  radios.forEach(radio=>radio.addEventListener('change',()=>{if(radio.checked)selectVersion(radio.value);}));
  play.addEventListener('click',()=>{
    if(!active())return;
    if(playIntent&&(loading||!active().paused)){pauseMusic();return;}
    if(finished(active()))setPosition(active(),0);startMusic();
  });
  $('restart').addEventListener('click',()=>{if(active()){setPosition(active(),0);startMusic();}});
  seek.addEventListener('input',()=>{if(active()){seeking=true;updateTime();}});
  seek.addEventListener('change',()=>{if(active()){setPosition(active(),Number(seek.value));seeking=false;updateTime();updatePlayback();}});
  allTracks.forEach(({audio:media})=>{
    media.addEventListener('loadedmetadata',()=>{
      if(pendingPositions.has(media))setPosition(media,pendingPositions.get(media));
      if(media===active())updateTime();
    });
    ['timeupdate','durationchange','seeked'].forEach(event=>media.addEventListener(event,()=>{if(media===active())updateTime();}));
    media.addEventListener('play',()=>{
      if(media!==active()||!playIntent){media.pause();return;}
      playedSongs.add(selectedSong);updatePlayback();
    });
    media.addEventListener('pause',()=>{
      if(media!==active())return;
      if(media.paused&&!switching&&!loading)playIntent=false;
      updatePlayback();
    });
    media.addEventListener('ended',()=>{
      if(media!==active()||!finished(media))return;
      playIntent=false;loading=false;updateTime();updatePlayback();
    });
    media.addEventListener('error',()=>{
      if(media!==active())return;
      ++requestId;playIntent=false;loading=false;updatePlayback();
      error.textContent='This track could not play. Check your connection and try Play again.';error.hidden=false;
    });
  });
  document.addEventListener('visibilitychange',()=>{if(active()&&!active().paused)keepAwake();});
  function updateMediaMetadata(){
    if(selectedSong&&'mediaSession' in navigator&&'MediaMetadata' in window){
      navigator.mediaSession.metadata=new MediaMetadata({title:`${songs[selectedSong].title} · ${track().label}`,artist:'Raaga Room',album:songs[selectedSong].language});
    }
  }
  if('mediaSession' in navigator){
    try{
      navigator.mediaSession.setActionHandler('play',()=>{if(active()){if(finished(active()))setPosition(active(),0);startMusic();}});
      navigator.mediaSession.setActionHandler('pause',pauseMusic);
    }catch(_){}
  }
  // Reading and page navigation leave every persistent audio source intact.
  setSize(lyricSize);renderRoute(window.location.hash.slice(1));
})();

