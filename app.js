/* ΟΛΟΚΛΗΡΟ ΤΟ app.js ΕΙΝΑΙ ΕΔΩ — ΔΕΝ ΤΟ ΚΟΒΩ */

const STORAGE_KEY_DRAWS = "ej_draws";
let draws = [];

/* ---------------- ΑΠΟΘΗΚΕΥΣΗ ---------------- */

function loadDrawsFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEY_DRAWS);
  if (!raw) return [];
  try { return JSON.parse(raw); }
  catch { return []; }
}

function saveDrawsToStorage(data) {
  localStorage.setItem(STORAGE_KEY_DRAWS, JSON.stringify(data));
}

/* ---------------- FETCH OPAP ---------------- */

async function fetchEurojackpot(fromDate, toDate) {
  const url = `https://api.opap.gr/draws/v3.0/5108/draw-date/${fromDate}/${toDate}`;
  const res = await fetch(url);
  const data = await res.json();

  return data.content.map(draw => ({
    date: new Date(draw.drawTime).toISOString().split("T")[0],
    main: draw.winningNumbers.list.sort((a,b)=>a-b),
    euro: draw.winningNumbers.bonus.sort((a,b)=>a-b)
  }));
}

/* ---------------- ΣΤΑΤΙΣΤΙΚΑ ---------------- */

function calcFrequencies(draws) {
  const mainFreq = Array(51).fill(0);
  const euroFreq = Array(13).fill(0);

  draws.forEach(d => {
    d.main.forEach(n => mainFreq[n]++);
    d.euro.forEach(n => euroFreq[n]++);
  });

  return { mainFreq, euroFreq };
}

function calcDelays(draws) {
  const lastMain = Array(51).fill(-1);
  const lastEuro = Array(13).fill(-1);

  draws.forEach((d,i)=>{
    d.main.forEach(n=>lastMain[n]=i);
    d.euro.forEach(n=>lastEuro[n]=i);
  });

  const total = draws.length;
  const mainDelay = lastMain.map(x => x === -1 ? total : total - 1 - x);
  const euroDelay = lastEuro.map(x => x === -1 ? total : total - 1 - x);

  return { mainDelay, euroDelay };
}

function sortDescPairs(arr) {
  return arr.map((v,i)=>[i,v]).slice(1).sort((a,b)=>b[1]-a[1]);
}

/* ---------------- ΑΠΛΕΣ ΠΡΟΒΛΕΨΕΙΣ ---------------- */

function generateSimpleSuggestion(mode, draws) {
  if (!draws.length) return null;

  const { mainFreq, euroFreq } = calcFrequencies(draws);
  const { mainDelay, euroDelay } = calcDelays(draws);

  const mainFreqSorted = sortDescPairs(mainFreq);
  const euroFreqSorted = sortDescPairs(euroFreq);
  const mainDelaySorted = sortDescPairs(mainDelay);
  const euroDelaySorted = sortDescPairs(euroDelay);

  function pickFrom(sorted, count) {
    const pool = sorted.slice(0,15).map(x=>x[0]);
    const out = [];
    while (out.length < count) {
      const n = pool.splice(Math.floor(Math.random()*pool.length),1)[0];
      if (!out.includes(n)) out.push(n);
    }
    return out.sort((a,b)=>a-b);
  }

  function pickRandom(max,count) {
    const pool = Array.from({length:max},(_,i)=>i+1);
    const out = [];
    while (out.length < count) {
      out.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]);
    }
    return out.sort((a,b)=>a-b);
  }

  let main, euro;

  if (mode==="freq") {
    main = pickFrom(mainFreqSorted,5);
    euro = pickFrom(euroFreqSorted,2);
  }
  else if (mode==="delay") {
    main = pickFrom(mainDelaySorted,5);
    euro = pickFrom(euroDelaySorted,2);
  }
  else if (mode==="mixed") {
    main = [
      ...pickFrom(mainFreqSorted,3),
      ...pickFrom(mainDelaySorted,2)
    ].sort((a,b)=>a-b);

    euro = [
      ...pickFrom(euroFreqSorted,1),
      ...pickFrom(euroDelaySorted,1)
    ].sort((a,b)=>a-b);
  }
  else {
    main = pickRandom(50,5);
    euro = pickRandom(12,2);
  }

  return { mainNumbers: main, euroNumbers: euro };
}

/* ---------------- ΣΥΣΤΗΜΑΤΑ ---------------- */

function combinations(arr,k){
  const out=[];
  const comb=[];
  function backtrack(start,depth){
    if(depth===k){ out.push(comb.slice()); return; }
    for(let i=start;i<arr.length;i++){
      comb[depth]=arr[i];
      backtrack(i+1,depth+1);
    }
  }
  backtrack(0,0);
  return out;
}

function nCk(n,k){
  let num=1,den=1;
  for(let i=1;i<=k;i++){
    num*=n-i+1;
    den*=i;
  }
  return num/den;
}

function autoPickSystemMain(draws,size,method){
  const { mainFreq } = calcFrequencies(draws);
  const { mainDelay } = calcDelays(draws);

  const freqSorted = sortDescPairs(mainFreq);
  const delaySorted = sortDescPairs(mainDelay);

  if(method==="freq"){
    return freqSorted.slice(0,size).map(x=>x[0]).sort((a,b)=>a-b);
  }

  const half = Math.ceil(size/2);
  const chosen = [];

  function pick(pool,count){
    const p = pool.slice();
    while(chosen.length<count){
      const n = p.splice(Math.floor(Math.random()*p.length),1)[0];
      if(!chosen.includes(n)) chosen.push(n);
    }
  }

  pick(freqSorted.map(x=>x[0]),half);
  pick(delaySorted.map(x=>x[0]),size);

  return Array.from(new Set(chosen)).slice(0,size).sort((a,b)=>a-b);
}

function generateSystem(nums,type,partial){
  nums = Array.from(new Set(nums)).sort((a,b)=>a-b);
  const all = combinations(nums,5);

  if(type==="full"){
    return { tickets: all, total: all.length };
  }

  const desired = Math.min(partial,all.length);
  const pool = all.slice();
  const out = [];

  while(out.length < desired){
    out.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]);
  }

  return { tickets: out, total: all.length, selected: out.length };
}

/* ---------------- UI ---------------- */

document.addEventListener("DOMContentLoaded",()=>{

  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("sw.js");
  }

  draws = loadDrawsFromStorage();

  const fetchBtn = document.getElementById("fetch-btn");
  const clearBtn = document.getElementById("clear-data-btn");
  const fetchStatus = document.getElementById("fetch-status");
  const fromInput = document.getElementById("from-date");
  const toInput = document.getElementById("to-date");

  const recalcStatsBtn = document.getElementById("recalc-stats-btn");
  const mainStatsEl = document.getElementById("main-stats");
  const euroStatsEl = document.getElementById("euro-stats");

  const simpleBtns = document.querySelectorAll(".simple-suggest-btn");
  const simpleOut = document.getElementById("simple-suggestion-output");

  const systemSize = document.getElementById("system-size-select");
  const systemAutoMethod = document.getElementById("system-auto-method-select");
  const systemAutoBtn = document.getElementById("system-auto-btn");
  const systemMainInput = document.getElementById("system-main-input");
  const systemType = document.getElementById("system-type-select");
  const partialWrap = document.getElementById("partial-count-wrapper");
  const partialInput = document.getElementById("partial-count-input");
  const generateSystemBtn = document.getElementById("generate-system-btn");
  const systemInfo = document.getElementById("system-info");
  const systemOutput = document.getElementById("system-output");
  const systemCombInfo = document.getElementById("system-comb-info");

  function updateStats(){
    if(!draws.length){
      mainStatsEl.innerHTML="<li>Δεν υπάρχουν δεδομένα.</li>";
      euroStatsEl.innerHTML="<li>Δεν υπάρχουν δεδομένα.</li>";
      return;
    }

    const { mainFreq, euroFreq } = calcFrequencies(draws);

    mainStatsEl.innerHTML="";
    for(let i=1;i<=50;i++){
      mainStatsEl.innerHTML+=`<li>${i}: ${mainFreq[i]} φορές</li>`;
    }

    euroStatsEl.innerHTML="";
    for(let i=1;i<=12;i++){
      euroStatsEl.innerHTML+=`<li>${i}: ${euro
