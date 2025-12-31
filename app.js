// Ρυθμίσεις Τζόκερ
const MAIN_MIN = 1;
const MAIN_MAX = 45;
const JOKER_MIN = 1;
const JOKER_MAX = 20;

// Πόσες προηγούμενες κληρώσεις θα χρησιμοποιούμε
const HISTORY_DRAWS = 50;

let statsReady = false;
let mainFrequency = [];
let mainDelay = [];
let jokerFrequency = [];
let jokerDelay = [];

// Φόρτωση τελευταίας κλήρωσης
async function loadLastDraw() {
  const url =
    "https://eurojackpot-systems.vercel.app/api/proxy?url=https://api.opap.gr/draws/v3.0/5104/last-result-and-active";

  try {
    const response = await fetch(url);
    const data = await response.json();

    document.getElementById("lastNumbers").innerText =
      data.last.winningNumbers.list.join(", ");

    document.getElementById("lastBonus").innerText =
      data.last.winningNumbers.bonus.join(", ");

    document.getElementById("lastDrawId").innerText = data.last.drawId;
    document.getElementById("nextDrawId").innerText = data.active.drawId;

  } catch (error) {
    console.error("Error loading last draw:", error);
    document.getElementById("error").innerText =
      "Σφάλμα φόρτωσης τελευταίας κλήρωσης.";
  }
}

// Φόρτωση ιστορικού κληρώσεων
async function loadHistory() {
  const url =
    "https://eurojackpot-systems.vercel.app/api/proxy?url=https://api.opap.gr/draws/v3.0/5104/last/" +
    HISTORY_DRAWS;

  try {
    const response = await fetch(url);
    const data = await response.json();

    computeStats(data.content);
    statsReady = true;
    document.getElementById("statsStatus").innerText =
      "Στατιστικά έτοιμα από " + HISTORY_DRAWS + " κληρώσεις.";
  } catch (error) {
    console.error("Error loading history:", error);
    document.getElementById("statsStatus").innerText =
      "Αποτυχία φόρτωσης στατιστικών. Θα χρησιμοποιηθεί μόνο τυχαία επιλογή.";
  }
}

// Υπολογισμός συχνότητας & καθυστέρησης
function computeStats(draws) {
  mainFrequency = Array(MAIN_MAX + 1).fill(0);
  mainDelay = Array(MAIN_MAX + 1).fill(0);
  jokerFrequency = Array(JOKER_MAX + 1).fill(0);
  jokerDelay = Array(JOKER_MAX + 1).fill(0);

  // Συχνότητα
  draws.forEach((draw) => {
    const main = draw.winningNumbers.list;
    const bonus = draw.winningNumbers.bonus;

    main.forEach((n) => {
      mainFrequency[n]++;
    });

    bonus.forEach((b) => {
      jokerFrequency[b]++;
    });
  });

  // Καθυστέρηση
  const seenMain = Array(MAIN_MAX + 1).fill(false);
  const seenJoker = Array(JOKER_MAX + 1).fill(false);

  for (let i = 0; i < draws.length; i++) {
    const draw = draws[i];
    const main = draw.winningNumbers.list;
    const bonus = draw.winningNumbers.bonus;

    for (let n = MAIN_MIN; n <= MAIN_MAX; n++) {
      if (!seenMain[n]) {
        mainDelay[n]++;
      }
    }
    for (let j = JOKER_MIN; j <= JOKER_MAX; j++) {
      if (!seenJoker[j]) {
        jokerDelay[j]++;
      }
    }

    main.forEach((n) => {
      seenMain[n] = true;
    });
    bonus.forEach((b) => {
      seenJoker[b] = true;
    });
  }
}

// Τυχαίος ακέραιος
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Μοναδικά νούμερα
function generateUniqueNumbers(count, min, max) {
  const set = new Set();
  while (set.size < count) {
    set.add(randInt(min, max));
  }
  return Array.from(set).sort((a, b) => a - b);
}

// Επιλογή αριθμών με στρατηγική
function pickNumbersByStrategy(count, strategy, freqArr, delayArr, min, max) {
  if (!statsReady || strategy === "random") {
    return generateUniqueNumbers(count, min, max);
  }

  const pool = [];
  for (let n = min; n <= max; n++) {
    pool.push({
      n,
      freq: freqArr[n],
      delay: delayArr[n],
      scoreFreq: freqArr[n],
      scoreDelay: delayArr[n],
      scoreMixed: freqArr[n] + delayArr[n],
    });
  }

  if (strategy === "freq") {
    pool.sort((a, b) => b.scoreFreq - a.scoreFreq);
  } else if (strategy === "delay") {
    pool.sort((a, b) => b.scoreDelay - a.scoreDelay);
  } else if (strategy === "mixed") {
    pool.sort((a, b) => b.scoreMixed - a.scoreMixed);
  }

  const chosen = pool.slice(0, count).map((x) => x.n);
  return chosen.sort((a, b) => a - b);
}

// Επιλογή Τζόκερ με στρατηγική
function pickJokerByStrategy(strategy) {
  if (!statsReady || strategy === "random") {
    return randInt(JOKER_MIN, JOKER_MAX);
  }

  const pool = [];
  for (let j = JOKER_MIN; j <= JOKER_MAX; j++) {
    pool.push({
      n: j,
      freq: jokerFrequency[j],
      delay: jokerDelay[j],
      scoreFreq: jokerFrequency[j],
      scoreDelay: jokerDelay[j],
      scoreMixed: jokerFrequency[j] + jokerDelay[j],
    });
  }

  if (strategy === "freq") {
    pool.sort((a, b) => b.scoreFreq - a.scoreFreq);
  } else if (strategy === "delay") {
    pool.sort((a, b) => b.scoreDelay - a.scoreDelay);
  } else if (strategy === "mixed") {
    pool.sort((a, b) => b.scoreMixed - a.scoreMixed);
  }

  return pool[0].n;
}

// Πλήρης στήλη 5+1
function generateFullLine(strategy) {
  const main = pickNumbersByStrategy(
    5,
    strategy,
    mainFrequency,
    mainDelay,
    MAIN_MIN,
    MAIN_MAX
  );
  const joker = pickJokerByStrategy(strategy);
  return { main, joker };
}

// Πλήρες σύστημα Ν αριθμών + 1 Τζόκερ
function generateFullSystem(n, strategy) {
  const main = pickNumbersByStrategy(
    n,
    strategy,
    mainFrequency,
    mainDelay,
    MAIN_MIN,
    MAIN_MAX
  );
  const joker = pickJokerByStrategy(strategy);
  return { main, joker };
}

// Μεταβλητό σύστημα Ν αριθμών + 1 Τζόκερ
function generateVariableSystem(n, strategy) {
  const main = pickNumbersByStrategy(
    n,
    strategy,
    mainFrequency,
    mainDelay,
    MAIN_MIN,
    MAIN_MAX
  );
  const joker = pickJokerByStrategy(strategy);
  return { main, joker };
}

// Δημιουργία προβλέψεων
function generatePredictions() {
  const strategy = document.getElementById("strategy").value;
  const fullCount = parseInt(
    document.getElementById("fullCount").value || "3",
    10
  );
  const lineCount = parseInt(
    document.getElementById("lineCount").value || "5",
    10
  );

  const linesContainer = document.getElementById("fullLines");
  const fullContainer = document.getElementById("fullSystems");
  const varContainer = document.getElementById("variableSystems");

  linesContainer.innerHTML = "";
  fullContainer.innerHTML = "";
  varContainer.innerHTML = "";

  // Στήλες 5+1
  for (let i = 0; i < lineCount; i++) {
    const line = generateFullLine(strategy);
    const p = document.createElement("p");
    p.textContent = `Στήλη ${i + 1}: ${line.main.join(
      ", "
    )} + Τζόκερ ${line.joker}`;
    linesContainer.appendChild(p);
  }

  // Πλήρη συστήματα 6/7/8/9
  const sizesFull = [6, 7, 8, 9];
  sizesFull.forEach((size) => {
    const div = document.createElement("div");
    div.innerHTML = `<strong>Πλήρες σύστημα ${size} αριθμών:</strong>`;
    for (let i = 0; i < fullCount; i++) {
      const sys = generateFullSystem(size, strategy);
      const p = document.createElement("p");
      p.textContent = `Στήλη ${i + 1}: ${sys.main.join(
        ", "
      )} + Τζόκερ ${sys.joker}`;
      div.appendChild(p);
    }
    fullContainer.appendChild(div);
  });

  // Μεταβλητά συστήματα 7/8/9
  const sizesVar = [7, 8, 9];
  sizesVar.forEach((size) => {
    const sys = generateVariableSystem(size, strategy);
    const p = document.createElement("p");
    p.textContent = `Μεταβλητό σύστημα ${size} αριθμών: ${sys.main.join(
      ", "
    )} + Τζόκερ ${sys.joker}`;
    varContainer.appendChild(p);
  });
}

// Εκκίνηση
window.addEventListener("load", () => {
  loadLastDraw();
  loadHistory();
});
