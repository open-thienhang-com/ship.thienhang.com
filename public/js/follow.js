// Follow logic: when a ship is selected and follow enabled, animate along its trajectory
window.startFollowing = function() {
  if (!window.App.selectedShip) return;
  const ship = window.App.shipData[window.App.selectedShip];
  if (!ship || !ship.trajectory || ship.trajectory.length === 0) return;

  // Clear existing follow marker and polyline
  if (window.App.followMarker) window.App.map.removeLayer(window.App.followMarker);
  if (window.App.followLine) window.App.map.removeLayer(window.App.followLine);

  const latlngs = ship.trajectory.map(p => [parseFloat(p.latitude), parseFloat(p.longitude)]).filter(a => !isNaN(a[0]) && !isNaN(a[1]));
  if (latlngs.length === 0) return;

  window.App.followLine = L.polyline(latlngs, { color: '#007bff' }).addTo(window.App.map);
  window.App.followIndex = 0;

  function step() {
    if (!window.App.follow) return; // stop if unchecked
    const idx = window.App.followIndex;
    if (idx >= latlngs.length) {
      window.App.followIndex = 0; // loop
    }
    const pos = latlngs[window.App.followIndex];
    if (window.App.followMarker) window.App.map.removeLayer(window.App.followMarker);
    window.App.followMarker = L.circleMarker(pos, { radius: 8, color: '#ff0000' }).addTo(window.App.map);
    window.App.map.setView(pos, Math.max(window.App.map.getZoom(), 5));
    window.App.followIndex++;
    setTimeout(step, window.App.speed || 500);
  }
  step();
};

// Watch for selection and follow toggle
setInterval(() => {
  if (window.App && window.App.follow && typeof window.startFollowing === 'function') {
    // If selection changed or followMarker missing, start/restart
    if (!window.App.followMarker) startFollowing();
  }
}, 500);
