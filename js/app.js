const searchInput = document.querySelector("#search-input");
const genreFilter = document.querySelector("#genre-filter");
const resetFiltersButton = document.querySelector("#reset-filters");
const emptyResetButton = document.querySelector("#empty-reset");
const showCards = [...document.querySelectorAll(".show-card")];
const resultsCount = document.querySelector("#results-count");
const emptyState = document.querySelector("#empty-state");

function filterShows() {
  const searchTerm = searchInput.value.trim().toLocaleLowerCase("es");
  const selectedGenre = genreFilter.value;
  let visibleCount = 0;

  showCards.forEach((card) => {
    const matchesTitle = card.dataset.title.includes(searchTerm);
    const matchesGenre = selectedGenre === "all" || card.dataset.genre === selectedGenre;
    const isVisible = matchesTitle && matchesGenre;

    card.hidden = !isVisible;
    visibleCount += Number(isVisible);
  });

  resultsCount.textContent = `${visibleCount} ${visibleCount === 1 ? "obra disponible" : "obras disponibles"}`;
  emptyState.hidden = visibleCount > 0;
}

function clearFilters() {
  searchInput.value = "";
  genreFilter.value = "all";
  filterShows();
  searchInput.focus();
}

searchInput.addEventListener("input", filterShows);
genreFilter.addEventListener("change", filterShows);
resetFiltersButton.addEventListener("click", clearFilters);
emptyResetButton.addEventListener("click", clearFilters);
filterShows();

const navigationToggle = document.querySelector(".nav-toggle");
const primaryNavigation = document.querySelector("#primary-navigation");

navigationToggle.addEventListener("click", () => {
  const isExpanded = navigationToggle.getAttribute("aria-expanded") === "true";
  navigationToggle.setAttribute("aria-expanded", String(!isExpanded));
  navigationToggle.setAttribute("aria-label", isExpanded ? "Abrir menú" : "Cerrar menú");
  primaryNavigation.classList.toggle("is-open", !isExpanded);
});

primaryNavigation.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    navigationToggle.setAttribute("aria-expanded", "false");
    navigationToggle.setAttribute("aria-label", "Abrir menú");
    primaryNavigation.classList.remove("is-open");
  });
});

const trailerDialog = document.querySelector("#trailer-dialog");
const trailerTitle = document.querySelector("#trailer-title");
const trailerPreview = document.querySelector("#trailer-preview");
const trailerPlayButton = document.querySelector("#trailer-play");
const trailerCaption = document.querySelector("#trailer-caption");

document.querySelectorAll(".trailer-trigger").forEach((button) => {
  button.addEventListener("click", () => {
    trailerTitle.textContent = button.dataset.trailer;
    trailerPreview.classList.remove("is-playing");
    trailerPlayButton.setAttribute("aria-label", "Reproducir avance visual");
    trailerPlayButton.innerHTML = '<span aria-hidden="true">▶</span>';
    trailerCaption.textContent = "Avance visual de Teatro UCB";
    trailerDialog.showModal();
  });
});

trailerPlayButton.addEventListener("click", () => {
  const isPlaying = trailerPreview.classList.toggle("is-playing");
  trailerPlayButton.setAttribute(
    "aria-label",
    isPlaying ? "Pausar avance visual" : "Reproducir avance visual",
  );
  trailerPlayButton.innerHTML = isPlaying
    ? '<span aria-hidden="true">Ⅱ</span>'
    : '<span aria-hidden="true">▶</span>';
  trailerCaption.textContent = isPlaying
    ? "Vista previa visual en reproducción"
    : "Avance visual de Teatro UCB";
});

const bookingDialog = document.querySelector("#booking-dialog");
const bookingShow = document.querySelector("#booking-show");
const seatMap = document.querySelector("#seat-map");
const seatCount = document.querySelector("#seat-count");
const selectedSeatsOutput = document.querySelector("#selected-seats");
const bookingTotal = document.querySelector("#booking-total");
const bookingFeedback = document.querySelector("#booking-feedback");
const continueBookingButton = document.querySelector("#continue-booking");
const confirmationDialog = document.querySelector("#confirmation-dialog");
const confirmationMessage = document.querySelector("#confirmation-message");
const ticketPrice = 45;
const seatLimit = 4;
const occupiedSeats = new Set(["A3", "A4", "B7", "C2", "C8", "D5", "E1", "E6", "F4"]);
const selectedSeats = new Set();
let activeShow = "";

function renderSeats() {
  seatMap.replaceChildren();

  ["A", "B", "C", "D", "E", "F"].forEach((row) => {
    const rowLabel = document.createElement("span");
    rowLabel.className = "seat-row-label";
    rowLabel.setAttribute("aria-hidden", "true");
    rowLabel.textContent = row;
    seatMap.append(rowLabel);

    for (let number = 1; number <= 8; number += 1) {
      const seatName = `${row}${number}`;
      const seatButton = document.createElement("button");
      const isOccupied = occupiedSeats.has(seatName);

      seatButton.className = "seat";
      seatButton.type = "button";
      seatButton.textContent = number;
      seatButton.disabled = isOccupied;
      seatButton.setAttribute("aria-pressed", String(selectedSeats.has(seatName)));
      seatButton.setAttribute(
        "aria-label",
        `Fila ${row}, butaca ${number}: ${isOccupied ? "ocupada" : selectedSeats.has(seatName) ? "seleccionada" : "disponible"}`,
      );
      seatButton.dataset.seat = seatName;
      seatMap.append(seatButton);
    }
  });
}

function updateBookingSummary() {
  const selectedNames = [...selectedSeats].sort();
  const count = selectedNames.length;
  seatCount.textContent = `(${count})`;
  selectedSeatsOutput.textContent = count > 0
    ? selectedNames.join(", ")
    : `Selecciona hasta ${seatLimit} butacas`;
  bookingTotal.textContent = `Bs ${count * ticketPrice}`;
  continueBookingButton.disabled = count === 0;
  renderSeats();
}

seatMap.addEventListener("click", (event) => {
  const seatButton = event.target.closest("button[data-seat]");
  if (!seatButton || seatButton.disabled) {
    return;
  }

  const seatName = seatButton.dataset.seat;
  if (selectedSeats.has(seatName)) {
    selectedSeats.delete(seatName);
    bookingFeedback.textContent = "";
  } else if (selectedSeats.size >= seatLimit) {
    bookingFeedback.textContent = `Puedes seleccionar hasta ${seatLimit} butacas por reserva.`;
    return;
  } else {
    selectedSeats.add(seatName);
    bookingFeedback.textContent = "";
  }

  updateBookingSummary();
});

document.querySelectorAll(".reserve-trigger").forEach((button) => {
  button.addEventListener("click", () => {
    activeShow = button.dataset.show;
    bookingShow.textContent = activeShow;
    bookingFeedback.textContent = "";
    updateBookingSummary();
    bookingDialog.showModal();
  });
});

continueBookingButton.addEventListener("click", () => {
  if (selectedSeats.size === 0 || selectedSeats.size > seatLimit) {
    bookingFeedback.textContent = `Selecciona entre 1 y ${seatLimit} butacas disponibles para continuar.`;
    return;
  }

  const seats = [...selectedSeats].sort().join(", ");
  const total = selectedSeats.size * ticketPrice;
  bookingDialog.close();
  confirmationMessage.textContent = `${activeShow} · Butacas ${seats} · Total de demostración: Bs ${total}.`;
  confirmationDialog.showModal();
  selectedSeats.clear();
  updateBookingSummary();
});

document.querySelectorAll(".dialog__close").forEach((button) => {
  button.addEventListener("click", () => button.closest("dialog").close());
});

document.querySelectorAll("dialog").forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });
});

document.querySelector(".confirmation-close").addEventListener("click", () => {
  confirmationDialog.close();
});

renderSeats();
updateBookingSummary();
