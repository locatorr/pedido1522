document.addEventListener("DOMContentLoaded", () => {

  const SENHA_ACESSO = "GO2026";

  const COORDS = {
    start: [-60.0217, -3.1190], // Manaus
    end: [-53.6068646, -23.3919306] // Icaraíma PR
  };

  // COORDENADA DE VILHENA
  const VILHENA = [-12.7405, -60.1458];

  const CHAVE_INICIO = "inicio_viagem";

  let map;
  let polyline;
  let vehicleMarker;
  let fullRoute = [];
  let indiceVilhena = null;

  const btnLogin = document.getElementById("btn-login");

  if (btnLogin) {

    btnLogin.addEventListener("click", () => {

      const input = document.getElementById("access-code");
      const errorMsg = document.getElementById("error-msg");

      if (input.value.toUpperCase() === SENHA_ACESSO) {

        localStorage.setItem("viagem_ativa", "true");

        btnLogin.innerText = "Carregando rota...";
        btnLogin.disabled = true;
        errorMsg.style.display = "none";

        iniciarSistema();

      } else {

        errorMsg.style.display = "block";

      }

    });

  }

  if (localStorage.getItem("viagem_ativa") === "true") {
    document.getElementById("access-code").value = SENHA_ACESSO;
    iniciarSistema();
  }

  async function iniciarSistema() {

    try {

      await buscarRotaReal();

      document.getElementById("login-overlay").style.display = "none";
      document.getElementById("info-card").style.display = "flex";

      criarMapa();

      posicionarMoto();

    } catch (err) {

      console.error(err);
      alert("Erro ao calcular rota.");

    }

  }

  async function buscarRotaReal() {

    const url =
      `https://router.project-osrm.org/route/v1/driving/${COORDS.start[0]},${COORDS.start[1]};${COORDS.end[0]},${COORDS.end[1]}?overview=full&geometries=geojson`;

    const resp = await fetch(url);
    const data = await resp.json();

    if (data.routes && data.routes.length > 0) {

      fullRoute = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);

      let menorDist = Infinity;

      fullRoute.forEach((coord, index) => {

        const dist =
          Math.abs(coord[0] - VILHENA[0]) +
          Math.abs(coord[1] - VILHENA[1]);

        if (dist < menorDist) {
          menorDist = dist;
          indiceVilhena = index;
        }

      });

    } else {

      throw new Error("Rota não encontrada.");

    }

  }

  function criarMapa() {

    map = L.map("map", { zoomControl: false }).setView(fullRoute[0], 5);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19
    }).addTo(map);

    polyline = L.polyline(fullRoute, {
      color: "#2563eb",
      weight: 5
    }).addTo(map);

    map.fitBounds(polyline.getBounds(), { padding: [50, 50] });

    L.marker(fullRoute[0])
      .addTo(map)
      .bindPopup("<b>Origem:</b> Manaus - AM");

    L.marker(fullRoute[fullRoute.length - 1])
      .addTo(map)
      .bindPopup("<b>Destino:</b> Icaraíma - PR");

    L.marker(VILHENA)
      .addTo(map)
      .bindPopup("<b>Local atual:</b> Vilhena - RO");

    const motoIcon = L.divIcon({
      html: '<div style="font-size:34px">🏍️</div>',
      iconSize: [34,34],
      iconAnchor: [17,17]
    });

    vehicleMarker = L.marker(fullRoute[0], { icon: motoIcon }).addTo(map);

  }

  function posicionarMoto() {

    const coord = fullRoute[indiceVilhena];

    vehicleMarker.setLatLng(coord);

    const badge = document.getElementById("time-badge");

    if (badge) {
      badge.innerText = "RETIDO EM VILHENA — AGUARDANDO LIBERAÇÃO";
      badge.style.background = "#ef4444";
    }

    const bar = document.getElementById("progress-bar");

    if (bar) {
      bar.style.width = "45%";
    }

  }

});

