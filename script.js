document.addEventListener("DOMContentLoaded", () => {

  // --- CONFIG ---
  const SENHA_ACESSO = "GO2026";

  const COORDS = {
    start: [-59.9777, -3.08448], // Manaus
    end: [-48.5766783, -25.5770063] // Paranaguá
  };

  // PRF Campo Grande
  const PRF = {
    lat: -20.4697,
    lng: -54.6201
  };

  let map;
  let polyline;
  let vehicleMarker;
  let fullRoute = [];
  let indicePRF = 0;

  // --- LOGIN ---
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

  // --- INICIAR ---
  async function iniciarSistema() {

    try {

      await buscarRotaReal();

      document.getElementById("login-overlay").style.display = "none";
      document.getElementById("info-card").style.display = "flex";

      criarMapa();

      atualizarPosicao();

    } catch (err) {

      console.error(err);
      alert("Erro ao calcular rota.");

    }

  }

  // --- BUSCAR ROTA ---
  async function buscarRotaReal() {

    const url = `https://router.project-osrm.org/route/v1/driving/${COORDS.start[0]},${COORDS.start[1]};${COORDS.end[0]},${COORDS.end[1]}?overview=full&geometries=geojson`;

    const resp = await fetch(url);
    const data = await resp.json();

    if (data.routes && data.routes.length > 0) {

      fullRoute = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);

      encontrarPRF();

    } else {

      throw new Error("Rota não encontrada.");

    }

  }

  // --- ENCONTRAR PONTO MAIS PROXIMO DA PRF ---
  function encontrarPRF() {

    let menorDist = Infinity;

    fullRoute.forEach((p, i) => {

      const d = Math.sqrt(
        Math.pow(p[0] - PRF.lat, 2) +
        Math.pow(p[1] - PRF.lng, 2)
      );

      if (d < menorDist) {

        menorDist = d;
        indicePRF = i;

      }

    });

  }

  // --- MAPA ---
  function criarMapa() {

    map = L.map("map", { zoomControl: false }).setView(fullRoute[0], 5);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19
    }).addTo(map);

    polyline = L.polyline(fullRoute, {
      color: "#1d4ed8",
      weight: 4
    }).addTo(map);

    map.fitBounds(polyline.getBounds(), { padding: [50, 50] });

    // origem
    L.marker(fullRoute[0])
      .addTo(map)
      .bindPopup("<b>Origem:</b> Manaus-AM");

    // destino
    L.marker(fullRoute[fullRoute.length - 1])
      .addTo(map)
      .bindPopup("<b>Destino:</b> Paranaguá-PR");

    // icone PRF
    const prfIcon = L.divIcon({
      html: '<div style="font-size:30px">🚓</div>',
      iconSize: [30,30],
      iconAnchor: [15,15]
    });

    L.marker([PRF.lat, PRF.lng], { icon: prfIcon })
      .addTo(map)
      .bindPopup("<b>PRF Campo Grande</b><br>Veículo retido");

    // icone moto
    const motoIcon = L.divIcon({
      html: '<div style="font-size:30px">🏍️</div>',
      iconSize: [30,30],
      iconAnchor: [15,15]
    });

    vehicleMarker = L.marker(fullRoute[indicePRF], { icon: motoIcon }).addTo(map);

  }

  // --- POSIÇÃO (PARADA NA PRF) ---
  function atualizarPosicao() {

    const coord = fullRoute[indicePRF];

    vehicleMarker.setLatLng(coord);

    const badge = document.getElementById("time-badge");
    const bar = document.getElementById("progress-bar");

    badge.innerText = "RETIDO NA PRF DE CAMPO GRANDE — FALTA DE DOCUMENTAÇÃO";
    badge.style.background = "#dc2626";

    const progresso = (indicePRF / (fullRoute.length - 1)) * 100;
    bar.style.width = progresso + "%";

  }

});


