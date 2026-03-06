document.addEventListener("DOMContentLoaded", () => {
  // --- CONFIG DA VIAGEM ---
  const TEMPO_TOTAL_HORAS = 72; // 3 Dias
  const SENHA_ACESSO = "GO2026";

  // Coordenadas:
  // Origem: Manaus‑AM (centro aproximado)
  // Destino: CEP 83218‑508 (Rua Ayro Carvalho Cruz, Paranaguá‑PR)
  const COORDS = {
    start: [-59.9777, -3.08448],   // [LONG, LAT] Manaus — centro aproximado :contentReference[oaicite:1]{index=1}
    end:   [-48.5766783, -25.5770063] // [LONG, LAT] Paranaguá‑PR CEP 83218‑508 :contentReference[oaicite:2]{index=2}
  };

  let map, polyline, vehicleMarker;
  let fullRoute = [];

  // --- LOGIN SIMPLES ---
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
        btnLogin.innerText = "Carregando Rota...";
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

  // --- FUNÇÕES PRINCIPAIS ---
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
    } else {
      throw new Error("Rota OSRM não encontrada.");
    }
  }

  function criarMapa() {
    map = L.map("map", { zoomControl: false }).setView(fullRoute[0], 6);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19
    }).addTo(map);

    polyline = L.polyline(fullRoute, {
      color: "#1d4ed8",
      weight: 4
    }).addTo(map);

    map.fitBounds(polyline.getBounds(), { padding: [50, 50] });

    L.marker(fullRoute[0]).addTo(map).bindPopup("<b>Origem:</b> Manaus‑AM");
    L.marker(fullRoute[fullRoute.length - 1]).addTo(map).bindPopup("<b>Destino:</b> Paranaguá‑PR (CEP 83218‑508)");

    const motoIcon = L.divIcon({
      className: "vehicle-marker",
      html: '<div class="moto-icon">🏍️</div>',
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

    atualizarUI(progresso, totalMs, decorrido);

    const coordAtual = getPontoNaRota(progresso);
    vehicleMarker.setLatLng(coordAtual);
  }

  function getPontoNaRota(p) {
    const maxI = fullRoute.length - 1;
    const idx = p * maxI;
    const i0 = Math.floor(idx);
    const i1 = Math.min(Math.ceil(idx), maxI);

    const a = fullRoute[i0];
    const b = fullRoute[i1];
    const t = idx - i0;

    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  }

  function atualizarUI(progress, totalMs, elapsed) {
    const badge = document.getElementById("time-badge");
    const bar = document.getElementById("progress-bar");

    bar.style.width = `${(progress * 100).toFixed(1)}%`;

    if (progress >= 1) {
      badge.innerText = "ENTREGA COMPLETA!";
      badge.style.background = "#10b981";
    } else {
      const hoursLeft = ((totalMs - elapsed) / (1000 * 60 * 60)).toFixed(1);
      badge.innerText = `EM TRÂNSITO — FALTAM ${hoursLeft}h`;
    }
  }
});

