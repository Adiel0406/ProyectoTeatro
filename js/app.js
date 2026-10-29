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

if (searchInput) {
  searchInput.addEventListener("input", filterShows);
}
if (genreFilter) {
  genreFilter.addEventListener("change", filterShows);
}
if (resetFiltersButton) {
  resetFiltersButton.addEventListener("click", clearFilters);
}
if (emptyResetButton) {
  emptyResetButton.addEventListener("click", clearFilters);
}
if (searchInput && genreFilter) {
  filterShows();
}

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
const bookingTotal = document.querySelector("#booking-total");
const bookingFeedback = document.querySelector("#booking-feedback");
const continueBookingButton = document.querySelector("#continue-booking");
const confirmationDialog = document.querySelector("#confirmation-dialog");
const confirmationMessage = document.querySelector("#confirmation-message");
const selectorRoot = document.querySelector("#booking-function-selector");
const selectionList = document.querySelector("#selection-list");
const clearSelectionButton = document.querySelector("#clear-selection");
const MAX_PLAZAS = 4;

const TIPOS_ASIENTO = {
  silla: { nombre: "silla estándar", plazas: 1, precio: 40, simbolo: "S" },
  preferencial: { nombre: "silla preferencial", plazas: 1, precio: 70, simbolo: "★" },
  cojín: { nombre: "cojín de piso", plazas: 1, precio: 25, simbolo: "◉" },
  sofa: { nombre: "sofá de 3 plazas", plazas: 3, precio: 105, simbolo: "◫" },
};

const FUNCIONES = [
  {
    id: "platea-clasica",
    obra: "La casa de Bernarda Alba",
    espacio: "Sala principal",
    distribucion: "platea",
    fechaHora: "Vie 6 nov · 19:30",
    zonas: [
      {
        nombre: "Platea",
        filas: [
          { fila: "A", butacas: ["1", "2", "3", "4", "5", "6", "7", "8"] },
          { fila: "B", butacas: ["1", "2", "3", "4", "5", "6", "7", "8"] },
          { fila: "C", butacas: ["1", "2", "3", "4", "5", "6", "7", "8"] },
          { fila: "D", butacas: ["1", "2", "3", "4", "5", "6", "7", "8"] },
          { fila: "E", butacas: ["1", "2", "3", "4", "5", "6", "7", "8"] },
          { fila: "F", butacas: ["1", "2", "3", "4", "5", "6", "7", "8"] },
        ],
      },
    ],
    ocupadas: ["A3", "A5", "B2", "C6", "D4", "E8", "F2"],
    tipos: {
      A1: "preferencial",
      A2: "silla",
      A3: "silla",
      A4: "silla",
      A5: "silla",
      A6: "silla",
      A7: "preferencial",
      A8: "silla",
      B1: "silla",
      B2: "silla",
      B3: "preferencial",
      B4: "silla",
      B5: "silla",
      B6: "silla",
      B7: "silla",
      B8: "preferencial",
      C1: "silla",
      C2: "silla",
      C3: "silla",
      C4: "silla",
      C5: "silla",
      C6: "silla",
      C7: "silla",
      C8: "preferencial",
      D1: "preferencial",
      D2: "silla",
      D3: "silla",
      D4: "silla",
      D5: "silla",
      D6: "silla",
      D7: "silla",
      D8: "preferencial",
      E1: "silla",
      E2: "silla",
      E3: "silla",
      E4: "silla",
      E5: "silla",
      E6: "silla",
      E7: "silla",
      E8: "silla",
      F1: "preferencial",
      F2: "silla",
      F3: "silla",
      F4: "silla",
      F5: "silla",
      F6: "silla",
      F7: "silla",
      F8: "preferencial",
    },
  },
  {
    id: "anfiteatro-u",
    obra: "La casa de Bernarda Alba",
    espacio: "Anfiteatro U",
    distribucion: "anfiteatro_u",
    fechaHora: "Sáb 7 nov · 20:00",
    zonas: [
      { nombre: "Ala izquierda", filas: [{ fila: "A", butacas: ["1", "2", "3", "4", "5"] }] },
      { nombre: "Ala derecha", filas: [{ fila: "B", butacas: ["1", "2", "3", "4", "5"] }] },
      { nombre: "Bloque central", filas: [{ fila: "C", butacas: ["1", "2", "3", "4", "5"] }] },
    ],
    ocupadas: ["A2", "B4", "C3"],
    tipos: {
      A1: "silla",
      A2: "cojín",
      A3: "preferencial",
      A4: "silla",
      A5: "cojín",
      B1: "silla",
      B2: "preferencial",
      B3: "silla",
      B4: "cojín",
      B5: "silla",
      C1: "silla",
      C2: "preferencial",
      C3: "cojín",
      C4: "silla",
      C5: "preferencial",
    },
  },
  {
    id: "agora-arco",
    obra: "La casa de Bernarda Alba",
    espacio: "Ágora circular",
    distribucion: "agora",
    fechaHora: "Dom 8 nov · 18:00",
    zonas: [
      { nombre: "Anillo interior", filas: [{ fila: "A", butacas: ["1", "2", "3", "4", "5"] }] },
      { nombre: "Anillo exterior", filas: [{ fila: "B", butacas: ["1", "2", "3", "4", "5"] }] },
    ],
    ocupadas: ["A1", "B3"],
    tipos: {
      A1: "cojín",
      A2: "silla",
      A3: "preferencial",
      A4: "silla",
      A5: "cojín",
      B1: "silla",
      B2: "preferencial",
      B3: "cojín",
      B4: "silla",
      B5: "preferencial",
    },
  },
];

const state = { funcionId: FUNCIONES[0].id, seleccion: new Map(), focusedSeatId: null };

function obtenerInfoAsiento(asientoId) {
  const match = asientoId.match(/^([A-Z]+)(\d+)$/);
  if (!match) {
    return { fila: "A", numero: 1 };
  }

  return {
    fila: match[1],
    numero: Number(match[2]),
  };
}

function obtenerBotonesDeMapa() {
  if (!seatMap) {
    return [];
  }

  return [...seatMap.querySelectorAll("button[data-asiento]")].filter((boton) => !boton.disabled);
}

function sincronizarTabindex() {
  const botones = obtenerBotonesDeMapa();
  if (!botones.length) {
    return;
  }

  const asientoActual = state.focusedSeatId && botones.some((boton) => boton.dataset.asiento === state.focusedSeatId)
    ? state.focusedSeatId
    : botones[0].dataset.asiento;

  state.focusedSeatId = asientoActual;
  botones.forEach((boton) => {
    boton.tabIndex = boton.dataset.asiento === asientoActual ? 0 : -1;
  });
}

function enfocarAsiento(asientoId) {
  const botones = obtenerBotonesDeMapa();
  const botonObjetivo = botones.find((boton) => boton.dataset.asiento === asientoId);
  if (!botonObjetivo) {
    return;
  }

  state.focusedSeatId = asientoId;
  sincronizarTabindex();
  botonObjetivo.focus({ preventScroll: true });
}

function moverFocoTeclado(event) {
  const botones = obtenerBotonesDeMapa();
  if (!botones.length || !state.focusedSeatId) {
    return;
  }

  const asientoActual = state.focusedSeatId;
  const infoActual = obtenerInfoAsiento(asientoActual);
  const filaActual = infoActual.fila;
  const numeroActual = infoActual.numero;

  const filaOrden = [...new Set(botones.map((boton) => obtenerInfoAsiento(boton.dataset.asiento).fila))];
  const filaIndex = filaOrden.indexOf(filaActual);
  const filaBotones = botones.filter((boton) => obtenerInfoAsiento(boton.dataset.asiento).fila === filaActual);
  const actualIndex = filaBotones.findIndex((boton) => boton.dataset.asiento === asientoActual);

  let siguienteId = asientoActual;

  if (event.key === "ArrowRight") {
    const siguiente = filaBotones[Math.min(actualIndex + 1, filaBotones.length - 1)];
    siguienteId = siguiente ? siguiente.dataset.asiento : filaBotones[0].dataset.asiento;
  }

  if (event.key === "ArrowLeft") {
    const anterior = filaBotones[Math.max(actualIndex - 1, 0)];
    siguienteId = anterior ? anterior.dataset.asiento : filaBotones[filaBotones.length - 1].dataset.asiento;
  }

  if (event.key === "ArrowDown") {
    const filaDestino = filaOrden[Math.min(filaIndex + 1, filaOrden.length - 1)];
    const filaDestinoBotones = botones.filter((boton) => obtenerInfoAsiento(boton.dataset.asiento).fila === filaDestino);
    const cercano = filaDestinoBotones.reduce((masCercano, boton) => {
      const info = obtenerInfoAsiento(boton.dataset.asiento);
      const diferencia = Math.abs(info.numero - numeroActual);
      if (!masCercano) {
        return boton;
      }
      const infoMasCercano = obtenerInfoAsiento(masCercano.dataset.asiento);
      const diferenciaAnterior = Math.abs(infoMasCercano.numero - numeroActual);
      return diferencia < diferenciaAnterior ? boton : masCercano;
    }, filaDestinoBotones[0]);
    siguienteId = cercano ? cercano.dataset.asiento : asientoActual;
  }

  if (event.key === "ArrowUp") {
    const filaDestino = filaOrden[Math.max(filaIndex - 1, 0)];
    const filaDestinoBotones = botones.filter((boton) => obtenerInfoAsiento(boton.dataset.asiento).fila === filaDestino);
    const cercano = filaDestinoBotones.reduce((masCercano, boton) => {
      const info = obtenerInfoAsiento(boton.dataset.asiento);
      const diferencia = Math.abs(info.numero - numeroActual);
      if (!masCercano) {
        return boton;
      }
      const infoMasCercano = obtenerInfoAsiento(masCercano.dataset.asiento);
      const diferenciaAnterior = Math.abs(infoMasCercano.numero - numeroActual);
      return diferencia < diferenciaAnterior ? boton : masCercano;
    }, filaDestinoBotones[0]);
    siguienteId = cercano ? cercano.dataset.asiento : asientoActual;
  }

  if (event.key === "Home") {
    const inicio = filaBotones[0];
    siguienteId = inicio ? inicio.dataset.asiento : asientoActual;
  }

  if (event.key === "End") {
    const fin = filaBotones[filaBotones.length - 1];
    siguienteId = fin ? fin.dataset.asiento : asientoActual;
  }

  if (siguienteId !== asientoActual) {
    event.preventDefault();
    state.focusedSeatId = siguienteId;
    sincronizarTabindex();
    const botonSiguiente = botones.find((boton) => boton.dataset.asiento === siguienteId);
    if (botonSiguiente) {
      botonSiguiente.focus({ preventScroll: true });
    }
  }
}

function formatearBs(valor) {
  return `Bs ${valor}`;
}

function anunciar(mensaje) {
  if (bookingFeedback) {
    bookingFeedback.textContent = mensaje;
  }
}

function getFuncionActual() {
  return FUNCIONES.find((funcion) => funcion.id === state.funcionId) ?? FUNCIONES[0];
}

function getDetalleAsiento(asientoId) {
  const funcion = getFuncionActual();
  const tipo = funcion.tipos[asientoId] || "silla";
  const [fila, numero] = asientoId.match(/[A-Z]+|\d+/g) || ["", ""];

  return {
    id: asientoId,
    fila,
    numero: Number(numero),
    tipo,
    estado: funcion.ocupadas.includes(asientoId) ? "ocupada" : "disponible",
    precio: TIPOS_ASIENTO[tipo]?.precio ?? TIPOS_ASIENTO.silla.precio,
    plazas: TIPOS_ASIENTO[tipo]?.plazas ?? TIPOS_ASIENTO.silla.plazas,
  };
}

function calcularTotal() {
  return [...state.seleccion.values()].reduce((total, asiento) => total + (asiento.precio ?? 0), 0);
}

function getPlazasSeleccionadas() {
  return [...state.seleccion.values()].reduce((total, asiento) => total + (asiento.plazas ?? 1), 0);
}

function crearRadioFuncion(funcion) {
  const item = document.createElement("li");
  item.className = "function-option";

  const input = document.createElement("input");
  input.type = "radio";
  input.name = "funcion";
  input.id = `funcion-${funcion.id}`;
  input.value = funcion.id;
  input.checked = funcion.id === state.funcionId;
  input.setAttribute("aria-label", `${funcion.espacio} · ${funcion.fechaHora}`);

  const label = document.createElement("label");
  label.setAttribute("for", input.id);
  label.textContent = `${funcion.espacio} · ${funcion.fechaHora}`;

  item.append(input, label);
  return item;
}

function construirSelectorFunciones() {
  if (!selectorRoot) {
    return;
  }

  const fieldset = document.createElement("fieldset");
  const legend = document.createElement("legend");
  legend.textContent = "Función";
  const list = document.createElement("ul");
  list.className = "function-option-list";

  FUNCIONES.forEach((funcion) => {
    list.appendChild(crearRadioFuncion(funcion));
  });

  fieldset.append(legend, list);
  selectorRoot.replaceChildren(fieldset);

  selectorRoot.addEventListener("change", (event) => {
    const radio = event.target.closest("input[name='funcion']");
    if (!radio) {
      return;
    }

    cambiarFuncion(radio.value);
  });
}

function actualizarResumen() {
  if (!seatCount || !bookingTotal || !selectionList || !clearSelectionButton || !continueBookingButton) {
    return;
  }

  const seleccion = [...state.seleccion.values()];
  const total = calcularTotal();
  const count = seleccion.length;

  seatCount.textContent = `(${count})`;
  bookingTotal.textContent = formatearBs(total);
  continueBookingButton.disabled = count === 0;

  selectionList.replaceChildren();
  if (count === 0) {
    const empty = document.createElement("li");
    empty.className = "selection-list__empty";
    empty.textContent = "Aún no eliges butacas.";
    selectionList.append(empty);
    clearSelectionButton.disabled = true;
    return;
  }

  clearSelectionButton.disabled = false;
  seleccion.forEach((asiento) => {
    const item = document.createElement("li");
    item.textContent = asiento.id;
    selectionList.append(item);
  });
}

function crearButaca(asiento) {
  const item = document.createElement("li");
  item.className = "seat-item";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "seat";
  button.dataset.asiento = asiento.id;
  button.dataset.tipo = asiento.tipo;
  button.dataset.estado = asiento.estado;
  button.style.setProperty("--seat-span", asiento.plazas > 1 ? 3 : 1);
  button.setAttribute("aria-pressed", "false");
  button.setAttribute("aria-label", `Fila ${asiento.fila}, butaca ${asiento.numero}, ${TIPOS_ASIENTO[asiento.tipo]?.nombre || "silla estándar"}, ${formatearBs(asiento.precio)}, ${asiento.estado}`);

  if (asiento.estado === "ocupada") {
    button.disabled = true;
    button.setAttribute("aria-disabled", "true");
    button.dataset.estado = "ocupada";
  }

  const label = document.createElement("span");
  label.className = "seat__label";
  label.textContent = `${asiento.fila}${asiento.numero}`;
  button.append(label);
  item.appendChild(button);
  return item;
}

function actualizarMapaVisual() {
  if (!seatMap) {
    return;
  }

  const buttons = seatMap.querySelectorAll("button[data-asiento]");
  buttons.forEach((button) => {
    const asientoId = button.dataset.asiento;
    const detalle = getDetalleAsiento(asientoId);
    const estaSeleccionada = state.seleccion.has(asientoId);
    const estaOcupada = detalle.estado === "ocupada";

    button.dataset.estado = estaOcupada ? "ocupada" : estaSeleccionada ? "seleccionada" : "disponible";
    button.dataset.tipo = detalle.tipo;
    button.setAttribute("aria-pressed", String(estaSeleccionada));
    button.setAttribute("aria-disabled", String(estaOcupada));
    button.disabled = estaOcupada;
    button.setAttribute(
      "aria-label",
      `Fila ${detalle.fila}, butaca ${detalle.numero}, ${TIPOS_ASIENTO[detalle.tipo]?.nombre || "silla estándar"}, ${formatearBs(detalle.precio)}, ${estaSeleccionada ? "seleccionada" : estaOcupada ? "ocupada" : "disponible"}`,
    );

    const label = button.querySelector("span");
    if (label) {
      label.textContent = `${detalle.fila}${detalle.numero}`;
    }
  });

  sincronizarTabindex();
}

function construirMapa(funcion) {
  if (!seatMap) {
    return;
  }

  seatMap.replaceChildren();
  seatMap.dataset.distribucion = funcion.distribucion;
  seatMap.setAttribute("aria-label", `Mapa de butacas para ${funcion.espacio}`);
  seatMap.style.setProperty("--columnas", 8);

  funcion.zonas.forEach((zona, index) => {
    const zoneList = document.createElement("ol");
    zoneList.className = "seat-zone";
    zoneList.setAttribute("aria-label", zona.nombre);
    zoneList.dataset.zona = zona.nombre.toLowerCase().replace(/\s+/g, "-");
    zoneList.style.setProperty("--columnas", zona.filas[0]?.butacas.length ?? 8);

    if (funcion.distribucion === "anfiteatro_u") {
      if (index === 0) {
        zoneList.style.gridArea = "left";
      } else if (index === 1) {
        zoneList.style.gridArea = "right";
      } else {
        zoneList.style.gridArea = "center";
      }
    }

    if (funcion.distribucion === "agora") {
      zoneList.style.gridArea = "1 / 1";
      zoneList.classList.add("seat-zone--agora");
    }

    zona.filas.forEach((fila) => {
      fila.butacas.forEach((numero, numeroIndex) => {
        const asientoId = `${fila.fila}${numero}`;
        const detalle = getDetalleAsiento(asientoId);
        const butaca = crearButaca({
          ...detalle,
          estado: funcion.ocupadas.includes(asientoId) ? "ocupada" : "disponible",
        });

        if (funcion.distribucion === "agora") {
          const totalButacas = fila.butacas.length;
          const angulo = ((numeroIndex + 1) * 360) / totalButacas - 90;
          const radio = fila.fila === "A" ? 104 : 160;
          const boton = butaca.querySelector("button");
          boton.classList.add("seat--agora");
          boton.style.setProperty("--angulo", `${angulo}deg`);
          boton.style.setProperty("--radio", `${radio}px`);
        }

        zoneList.appendChild(butaca);
      });
    });

    seatMap.appendChild(zoneList);
  });

  actualizarMapaVisual();
}

function alternarSeleccion(boton) {
  if (!boton || boton.disabled) {
    return;
  }

  const asientoId = boton.dataset.asiento;
  const detalle = getDetalleAsiento(asientoId);
  const yaSeleccionada = state.seleccion.has(asientoId);
  const plazasUsadas = getPlazasSeleccionadas();

  if (yaSeleccionada) {
    state.seleccion.delete(asientoId);
    anunciar("");
    actualizarResumen();
    actualizarMapaVisual();
    return;
  }

  const espaciosDisponibles = MAX_PLAZAS - plazasUsadas;
  if (detalle.plazas > espaciosDisponibles) {
    anunciar(`Solo puedes reservar ${MAX_PLAZAS} plazas por función. Te faltan ${espaciosDisponibles}.`);
    return;
  }

  state.seleccion.set(asientoId, detalle);
  anunciar("");
  actualizarResumen();
  actualizarMapaVisual();

  seatMap.dispatchEvent(new CustomEvent("butacas:cambio", {
    bubbles: true,
    detail: {
      funcionId: state.funcionId,
      seleccion: [...state.seleccion.keys()],
      plazas: getPlazasSeleccionadas(),
      total: calcularTotal(),
    },
  }));
}

function cambiarFuncion(id) {
  state.funcionId = id;
  state.seleccion.clear();
  if (bookingShow) {
    bookingShow.textContent = getFuncionActual().obra;
  }
  anunciar("Selección limpiada al cambiar de función.");
  if (seatMap) {
    construirMapa(getFuncionActual());
  }
  actualizarResumen();
}

function limpiarSeleccion() {
  state.seleccion.clear();
  anunciar("Selección limpiada.");
  actualizarResumen();
  actualizarMapaVisual();
}

if (selectorRoot) {
  construirSelectorFunciones();
  selectorRoot.addEventListener("change", (event) => {
    const radio = event.target.closest("input[name='funcion']");
    if (!radio) {
      return;
    }
    cambiarFuncion(radio.value);
  });
}

if (seatMap) {
  seatMap.addEventListener("click", (event) => {
    const boton = event.target.closest("button[data-asiento]");
    if (!boton) {
      return;
    }
    state.focusedSeatId = boton.dataset.asiento;
    sincronizarTabindex();
    alternarSeleccion(boton);
  });

  seatMap.addEventListener("keydown", (event) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) {
      moverFocoTeclado(event);
    }
  });
}

if (clearSelectionButton) {
  clearSelectionButton.addEventListener("click", limpiarSeleccion);
}

if (continueBookingButton) {
  continueBookingButton.addEventListener("click", () => {
    const totalSeleccion = getPlazasSeleccionadas();
    if (totalSeleccion === 0 || totalSeleccion > MAX_PLAZAS) {
      anunciar(`Selecciona entre 1 y ${MAX_PLAZAS} butacas disponibles para continuar.`);
      return;
    }

    const seleccion = [...state.seleccion.keys()].sort();
    const total = calcularTotal();
    if (confirmationDialog && confirmationMessage) {
      confirmationMessage.textContent = `${bookingShow.textContent} · Butacas ${seleccion.join(", ")} · Total de demostración: ${formatearBs(total)}.`;
      bookingDialog.close();
      confirmationDialog.showModal();
    }

    state.seleccion.clear();
    actualizarResumen();
    actualizarMapaVisual();
  });
}

document.querySelectorAll(".reserve-trigger").forEach((button) => {
  button.addEventListener("click", () => {
    const funcion = FUNCIONES.find((item) => item.obra === button.dataset.show) ?? FUNCIONES[0];
    state.funcionId = funcion.id;
    state.seleccion.clear();
    if (bookingShow) {
      bookingShow.textContent = funcion.obra;
    }
    if (seatMap) {
      construirMapa(funcion);
    }
    actualizarResumen();
    anunciar("Selecciona hasta 4 butacas");
    if (bookingDialog) {
      bookingDialog.showModal();
    }
  });
});

if (bookingShow) {
  bookingShow.textContent = getFuncionActual().obra;
}
if (seatMap) {
  construirMapa(getFuncionActual());
}
actualizarResumen();
anunciar("Selecciona hasta 4 butacas");

if (document.querySelector(".confirmation-close")) {
  document.querySelector(".confirmation-close").addEventListener("click", () => {
    confirmationDialog.close();
  });
}

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
