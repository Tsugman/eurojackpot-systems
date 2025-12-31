async function loadEurojackpotData() {
  const url =
    "https://eurojackpot-systems.vercel.app/api/proxy?url=https://api.opap.gr/draws/v3.0/5104/last-result-and-active";

  try {
    const response = await fetch(url);
    const data = await response.json();

    console.log("Eurojackpot data:", data);

    // Εμφάνιση τελευταίων αριθμών
    document.getElementById("lastNumbers").innerText =
      data.last.winningNumbers.list.join(", ");

    // Εμφάνιση bonus αριθμού
    document.getElementById("lastBonus").innerText =
      data.last.winningNumbers.bonus.join(", ");

    // ID τελευταίας κλήρωσης
    document.getElementById("lastDrawId").innerText = data.last.drawId;

    // ID επόμενης κλήρωσης
    document.getElementById("nextDrawId").innerText = data.active.drawId;

  } catch (error) {
    console.error("Error loading data:", error);
    document.getElementById("error").innerText =
      "Σφάλμα φόρτωσης δεδομένων.";
  }
}

// Εκκίνηση όταν φορτώνει η σελίδα
loadEurojackpotData();
