// Simple CSV loader and ship data parser
window.loadShipData = async function(csvPath) {
  async function fetchCSV(url) {
    const res = await fetch(url);
    const text = await res.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
      const values = line.split(',');
      const obj = {};
      headers.forEach((h, i) => obj[h] = values[i] ? values[i].trim() : '');
      return obj;
    });
  }

  const rows = await fetchCSV(csvPath);

  // Normalize columns: expect at least name, code, latitude, longitude, timestamp
  window.App.shipData = rows.map(r => ({
    name: r.name || r.ship || r.vessel || '',
    code: r.code || r.id || r.mmsi || '',
    latitude: r.latitude || r.lat || r.Y || r.lat_deg || '',
    longitude: r.longitude || r.lon || r.X || r.lon_deg || '',
    timestamp: r.timestamp || r.time || r.ts || '' ,
    status: r.status || ''
  }));

  // If the file contains multiple rows per ship (trajectory), group by code
  const grouped = {};
  window.App.shipData.forEach((s) => {
    const key = s.code || s.name || 'unknown';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(s);
  });

  // Convert grouped to an array of ships with trajectories (sorted by timestamp if available)
  window.App.shipDataGrouped = Object.keys(grouped).map(k => {
    const traj = grouped[k].sort((a,b) => (a.timestamp || '').localeCompare(b.timestamp || ''));
    return { key: k, name: traj[0].name || k, trajectory: traj };
  });

  // Flatten for simple animation (one point per ship). Keep both forms available.
  // We'll use one point per ship (latest) for the main list
  window.App.shipData = window.App.shipDataGrouped.map(s => {
    const last = s.trajectory[s.trajectory.length - 1];
    return { name: s.name, code: s.key, latitude: last.latitude, longitude: last.longitude, timestamp: last.timestamp, trajectory: s.trajectory };
  });
};
