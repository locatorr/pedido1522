document.addEventListener("DOMContentLoaded", () => {

  // --- CONFIG DA VIAGEM ---
  const TEMPO_TOTAL_HORAS = 72;
  const SENHA_ACESSO = "GO2026";

  // Coordenadas
  const COORDS = {
    start: [-59.9777, -3.08448],   // Manaus
    end: [-48.5766783, -25.5770063] // Paranaguá
  };

  // PRF Campo Grande
  const PRF = {
    lat: -20.4697,
    lng: -54.6201,
    mensagem: "RETIDO NA PRF — FALTA DE DOCUMENTAÇÃO"
  };

  let map, polyline, vehicleMarker, prfMarker;
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

        if (!localStorage.getItem("inicio_viagem_manaus_pr")) {
          localStorage.setItem("inicio_viagem_manaus_pr", Date.now());
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
  }

  // --- SISTEMA ---
  async function iniciarSistema() {

    try {

      await buscarRotaReal();

      document.getElementById("login-overlay").style.display = "none";
      document.getElementById("info-card").style.display = "flex";

      criarMapa();

      setInterval(atualizarPosicao, 1000);

      atualizarPosicao();

    } catch (err) {

      console.error(err);
      alert("Erro ao calcular rota.");

    }

  }

  async function buscarRotaReal() {

    const url = `https://router.project-osrm.org/route/v1/driving/${COORDS.start[0]},${COORDS.start[1]};${COORDS.end[0]},${COORDS.end[1]}?overview=full&geometries=geojson`;

    const resp = await fetch(url);
    const data = await resp.json();

    if (data.routes && data.routes.length > 0) {

      fullRoute = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);

      calcularIndicePRF();

    } else {

      throw new Error("Rota não encontrada.");

    }

  }

  function calcularIndicePRF() {

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

    L.marker(fullRoute[0]).addTo(map).bindPopup("<b>Origem:</b> Manaus-AM");

    L.marker(fullRoute[fullRoute.length - 1]).addTo(map)
      .bindPopup("<b>Destino:</b> Paranaguá-PR");

    // PRF
    const prfIcon = L.divIcon({
      className: "prf-marker",
      html: '<div style="font-size:28px">🚓</div>',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    prfMarker = L.marker([PRF.lat, PRF.lng], { icon: prfIcon })
      .addTo(map)
      .bindPopup("<b>PRF Campo Grande</b><br>Veículo retido");

    // Moto
    const motoIcon = L.divIcon({
      className: "vehicle-marker",
      html: '<div style="font-size:28px">🏍️</div>',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    vehicleMarker = L.marker(fullRoute[0], { icon: motoIcon }).addTo(map);

  }

  function atualizarPosicao() {

    if (!fullRoute.length) return;

    const inicio = parseInt(localStorage.getItem("inicio_viagem_manaus_pr"));
    const agora = Date.now();

    const decorrido = agora - inicio;

    const totalMs = TEMPO_TOTAL_HORAS * 60 * 60 * 1000;

    let progresso = decorrido / totalMs;

    progresso = Math.min(Math.max(progresso, 0), 1);

    const maxI = fullRoute.length - 1;

    let idx = progresso * maxI;

    // PARADA NA PRF
    if (idx >= indicePRF) {

      idx = indicePRF;

      mostrarRetencao();

    }

    const coord = fullRoute[Math.floor(idx)];

    vehicleMarker.setLatLng(coord);

    atualizarUI(progresso);

  }

  function mostrarRetencao() {

    const badge = document.getElementById("time-badge");

    badge.innerText = "RETIDO NA PRF — FALTA DE DOCUMENTAÇÃO";
    badge.style.background = "#dc2626";

  }

  function atualizarUI(progress) {

    const bar = document.getElementById("progress-bar");

    bar.style.width = `${(progress * 100).toFixed(1)}%`;

  }

});

