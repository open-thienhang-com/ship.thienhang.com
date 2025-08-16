async function fetchCSV(url) {
  const res = await fetch(url);
  const text = await res.text();
  const lines = text.split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const values = line.split(',');
    let obj = {};
    headers.forEach((h, i) => obj[h.trim()] = values[i]?.trim());
    return obj;
  });
}

async function main() {
  const map = L.map('map').setView([20, 105], 3);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  // Load data
  const countryCodes = await fetchCSV('data/countrycode.csv');
  const ships = await fetchCSV('data/raw.csv');

  // Animation loop for ship markers
  let markers = [];
  let idx = 0;
  function animateMarkers() {
    markers.forEach(m => map.removeLayer(m));
    markers = [];
    for (let i = 0; i <= idx && i < ships.length; i++) {
      const ship = ships[i];
      if (ship.latitude && ship.longitude) {
        const marker = L.marker([parseFloat(ship.latitude), parseFloat(ship.longitude)])
          .addTo(map)
          .bindPopup(`<b>${ship.name}</b><br>${ship.code}`);
        markers.push(marker);
      }
    }
    idx = (idx + 1) % ships.length;
    setTimeout(animateMarkers, 500);
  }
  animateMarkers();
}

main();
