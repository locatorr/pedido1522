document.addEventListener("DOMContentLoaded", () => {

  // --- CONFIG ---
  const SENHA_ACESSO = "GO2026";

  const TEMPO_TOTAL_HORAS = 72; // 3 dias

  const COORDS = {
    start: [-59.9777, -3.08448], // Manaus
    end: [-48.5766783, -25.5770063] // Paranaguá
  };

  const CHAVE_INICIO = "inicio_viagem";

  let map;
  let polyline;
  let vehicleMarker;
  let fullRoute = [];
  let loop;

  // --- LOGIN ---
  const btnLogin = document.getElementById("btn-login");

  if (btnLogin) {

    btnLogin.addEventListener("click", () => {

      const input = document.getElementById("access-code");
      const errorMsg = document.getElementById("error-msg");

      if (input.value.toUpperCase() === SENHA_ACESSO) {

        localStorage.setItem("viagem_ativa", "true");

        if (!localStorage.getItem(CHAVE_INICIO)) {
          localStorage.setItem(CHAVE_INICIO, Date.now());
        }

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

      loop = setInterval(atualizarPosicao, 1000);

    } catch (err) {

      console.error(err);
      alert("Erro ao calcular rota.");

    }

  }

  // --- BUSCAR ROTA REAL ---
  async function buscarRotaReal() {

    const url = `https://router.project-osrm.org/route/v1/driving/${COORDS.start[0]},${COORDS.start[1]};${COORDS.end[0]},${COORDS.end[1]}?overview=full&geometries=geojson`;

    const resp = await fetch(url);
    const data = await resp.json();

    if (data.routes && data.routes.length > 0) {

      fullRoute = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);

    } else {

      throw new Error("Rota não encontrada.");

    }

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

    // icone caminhão
    const truckIcon = L.divIcon({
      html: '<div style="font-size:32px">🚛</div>',
      iconSize: [30,30],
      iconAnchor: [15,15]
    });

    vehicleMarker = L.marker(fullRoute[0], { icon: truckIcon }).addTo(map);

  }

  // --- MOVIMENTO EM TEMPO REAL ---
  function atualizarPosicao() {

    const inicio = parseInt(localStorage.getItem(CHAVE_INICIO));
    const agora = Date.now();

    const tempoDecorrido = agora - inicio;
    const tempoTotal = TEMPO_TOTAL_HORAS * 3600000;

    let progresso = tempoDecorrido / tempoTotal;

    progresso = Math.min(Math.max(progresso, 0), 1);

    const indice = Math.floor(progresso * (fullRoute.length - 1));

    const coord = fullRoute[indice];

    vehicleMarker.setLatLng(coord);

    const badge = document.getElementById("time-badge");
    const bar = document.getElementById("progress-bar");

    if (progresso >= 1) {

      badge.innerText = "ENTREGA REALIZADA";
      badge.style.background = "#16a34a";

    } else {

      const horasRestantes = ((tempoTotal - tempoDecorrido) / 3600000).toFixed(1);

      badge.innerText = `EM TRÂNSITO — FALTAM ${horasRestantes}h`;

      badge.style.background = "#2563eb";

    }

    if (bar) {
      bar.style.width = (progresso * 100) + "%";
    }

  }

});
