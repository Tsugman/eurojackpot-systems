/* ΟΛΟΚΛΗΡ// ======================================================
// Eurojackpot Systems – Ενιαίο app.js (2025+)
// Γρήγορο, ελαφρύ, χωρίς ανάπτυξη σε 5άδες
// Πολλαπλές 5άδες & πολλαπλές 7/8/9άδες
// ======================================================

// ---------------- Βοηθητικές συναρτήσεις ----------------

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseNumbers(text) {
  if (!text) return [];
  return text
    .split(/[,\s]+/)
    .map(n => parseInt(n, 10))
    .filter(n => Number.isInteger(n) && n >= 1 && n <= 50);
}

function pickRandomDistinct(arr, count) {
  const pool = [...arr];
  const out = [];
  while (out.length < count && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return out;
}

// ---------------- Αποθήκευση / Φόρτωση ----------------

const STORAGE_KEY = "ej_draws_2025plus";

function loadDraws() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveDraws(draws) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(draws));
}

// ---------------- Fetch από OPAP ----------------

async function fetchDraws(fromDate, toDate) {
  const url = `https://api.opap.gr/draws/v3.0/5108/draw-date/${fromDate}/${toDate}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("API error");
  const data = await res.json();
  if (!Array.isArray(data.content)) return [];

  return data.content.map(d => ({
    id: d.drawId,
    date: d.drawTime,
    main: d.winningNumbers.list.slice(0, 5),
    euro: d.winningNumbers.list.slice(5)
  }));
}

// ---------------- Στατιστικά ----------------

function computeStats(draws) {
  const mainFreq = Array(51).fill(0);
  const euroFreq = Array(13).fill(0);
  const mainDelay = Array(51).fill(0);
  const euroDelay = Array(13).fill(0);

  for (const d of draws) {
    d.main.forEach(n => mainFreq[n]++);
    d.euro.forEach(n => euroFreq[n]++);
  }

  if (draws.length > 0) {
    for (let n = 1; n <= 50; n++) {
      let delay = 0;
      for (let i = draws.length - 1; i >= 0; i--) {
        if (draws[i].main.includes(n)) break;
        delay++;
      }
      mainDelay[n] = delay;
    }

    for (let n = 1; n <= 12; n++) {
      let delay = 0;
      for (let i = draws.length - 1; i >= 0; i--) {
        if (draws[i].euro.includes(n)) break;
        delay++;
      }
      euroDelay[n] = delay;
    }
  }

  return { mainFreq, euroFreq, mainDelay, euroDelay };
}

function rankNumbers(freqArr, delayArr, mode) {
  const out = [];
  const max = freqArr.length - 1;

  for (let n = 1; n <= max; n++) {
    const f = freqArr[n];
    const d = delayArr[n];
    let score = 0;

    if (mode === "freq") score = f;
    else if (mode === "delay") score = d;
    else if (mode === "mixed") score = f * 0.6 + d * 0.4;
    else score = Math.random() * 0.5 + f * 0.25 + d * 0.25;

    out.push({ n, score });
  }

  out.sort((a, b) => b.score - a.score);
  return out.map(o => o.n);
}

// ---------------- Παραγωγή 5άδων ----------------

function generateFiveSets(stats, mode, count) {
  const ranked = rankNumbers(stats.mainFreq, stats.mainDelay, mode);
  const sets = [];

  for (let i = 0; i < count; i++) {
    const picked = pickRandomDistinct(ranked, 5).sort((a, b) => a - b);
    sets.push(picked);
  }

  return sets;
}

// ---------------- Παραγωγή 7/8/9άδων ----------------

function generateSystemSets(stats, size, mode, count) {
  const ranked = rankNumbers(stats.mainFreq, stats.mainDelay, mode);
  const sets = [];

  for (let i = 0; i < count; i++) {
    const picked = pickRandomDistinct(ranked, size).sort((a, b) => a - b);
    sets.push(picked);
  }

  return sets;
}

// ---------------- DOM ----------------

document.addEventListener("DOMContentLoaded", () => {
  const fromDate = document.getElementById("from-date");
  const toDate = document.getElementById("to-date");
  const fetchBtn = document.getElementById("fetch-btn");
  const clearBtn = document.getElementById("clear-data-btn");
  const fetchStatus = document.getElementById("fetch-status");

  const recalcBtn = document.getElementById("recalc-stats-btn");
  const mainStatsEl = document.getElementById("main-stats");
  const euroStatsEl = document.getElementById("euro-stats");

  const fiveModeSelect = document.getElementById("five-mode-select");
  const fiveCountInput = document.getElementById("five-count-input");
  const fiveBtn = document.getElementById("generate-five-btn");
  const fiveOutput = document.getElementById("five-output");

  const systemSizeSelect = document.getElementById("system-size-select");
  const systemAutoMethodSelect = document.getElementById("system-auto-method-select");
  const systemAutoBtn = document.getElementById("system-auto-btn");
  const systemMainInput = document.getElementById("system-main-input");
  const systemTypeSelect = document.getElementById("system-type-select");
  const partialCountInput = document.getElementById("partial-count-input");
  const generateSystemBtn = document.getElementById("generate-system-btn");
  const systemInfo = document.getElementById("system-info");
  const systemOutput = document.getElementById("system-output");

  fromDate.value = "2025-01-01";
  toDate.value = todayISO();

  let draws = loadDraws();
  let stats = computeStats(draws);

  function renderStats() {
    mainStatsEl.innerHTML = "";
    euroStatsEl.innerHTML = "";

    for (let i = 1; i <= 50; i++) {
      const li = document.createElement("li");
      li.textContent = `${i}: συχνότητα ${stats.mainFreq[i]}, καθυστέρηση ${stats.mainDelay[i]}`;
      mainStatsEl.appendChild(li);
    }

    for (let i = 1; i <= 12; i++) {
      const li = document.createElement("li");
      li.textContent = `${i}: συχνότητα ${stats.euroFreq[i]}, καθυστέρηση ${stats.euroDelay[i]}`;
      euroStatsEl.appendChild(li);
    }
  }

  if (draws.length) renderStats();

  // -------- Fetch από OPAP --------

  fetchBtn.addEventListener("click", async () => {
    fetchStatus.textContent = "Λήψη δεδομένων...";
    fetchBtn.disabled = true;

    try {
      const newDraws = await fetchDraws(fromDate.value, toDate.value);
      const existing = loadDraws();
      const ids = new Set(existing.map(d => d.id));

      const merged = [...existing];
      for (const d of newDraws) {
        if (!ids.has(d.id)) merged.push(d);
      }

      merged.sort((a, b) => new Date(a.date) - new Date(b.date));
      saveDraws(merged);

      draws = merged;
      stats = computeStats(draws);
      renderStats();

      fetchStatus.textContent = `Ολοκληρώθηκε. Κληρώσεις: ${merged.length}`;
    } catch {
      fetchStatus.textContent = "Σφάλμα κατά τη λήψη.";
    }

    fetchBtn.disabled = false;
  });

  clearBtn.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    draws = [];
    stats = computeStats(draws);
    mainStatsEl.innerHTML = "";
    euroStatsEl.innerHTML = "";
    fiveOutput.innerHTML = "";
    systemOutput.innerHTML = "";
    systemInfo.textContent = "";
    fetchStatus.textContent = "Τα δεδομένα διαγράφηκαν.";
  });

  recalcBtn.addEventListener("click", () => {
    stats = computeStats(draws);
    renderStats();
  });

  // -------- Πολλαπλές 5άδες --------

  fiveBtn.addEventListener("click", () => {
    const mode = fiveModeSelect.value;
    let count = parseInt(fiveCountInput.value, 10);
    if (!Number.isInteger(count) || count < 1) count = 1;

    const sets = generateFiveSets(stats, mode, count);

    fiveOutput.innerHTML = "";
    sets.forEach((s, i) => {
      const li = document.createElement("li");
      li.textContent = `5άδα ${i + 1}: ${s.join(", ")}`;
      fiveOutput.appendChild(li);
    });
  });

  // -------- Συστήματα 7/8/9 --------

  systemAutoBtn.addEventListener("click", () => {
    const size = parseInt(systemSizeSelect.value, 10);
    const mode = systemAutoMethodSelect.value;
    const nums = pickRandomDistinct(rankNumbers(stats.mainFreq, stats.mainDelay, mode), size);
    systemMainInput.value = nums.sort((a, b) => a - b).join(", ");
  });

  generateSystemBtn.addEventListener("click", () => {
    const size = parseInt(systemSizeSelect.value, 10);
    const type = systemTypeSelect.value;
    const base = parseNumbers(systemMainInput.value);

    if (base.length !== size) {
      alert(`Πρέπει να δώσεις ακριβώς ${size} αριθμούς.`);
      return;
    }

    let count = 1;
    if (type === "partial") {
      count = parseInt(partialCountInput.value, 10);
      if (!Number.isInteger(count) || count < 1) count = 1;
    }

    const sets = generateSystemSets(stats, size, "mixed", count);

    systemInfo.textContent = `Σύστημα ${size} αριθμών – ${sets.length} σετ`;
    systemOutput.innerHTML = "";

    sets.forEach((s, i) => {
      const li = document.createElement("li");
      li.textContent = `Σετ ${i + 1}: ${s.join(", ")}`;
      systemOutput.appendChild(li);
    });
  });
});Ο ΤΟ app.js ΕΙΝΑΙ ΕΔΩ — ΔΕΝ ΤΟ ΚΟΒΩ */

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
