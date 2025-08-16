// Ship Journey Demo - thienhang.com
// Global variables
var map, marker, polyline, animationInterval;
var currentStep = 0;
var animationSpeed = 800; // legacy variable (ms between waypoint steps) - still kept for compatibility

// Animation helpers
var isPlaying = false;
var animationRequestId = null;
var segmentStartTime = null;
var segmentDuration = 2000; // base ms for a segment; scaled by speed control
var currentSegmentProgress = 0; // fraction [0,1] when paused

// Sample ship journey data (like old version)
var shipJourneys = [
  {
    callsign: "DEMO_SHIP_001",
    path: [
      {lat: 10.8007089, lng: 106.6880843, name: "Ho Chi Minh City, Vietnam"},
      {lat: 1.352083, lng: 103.819839, name: "Singapore"},
      {lat: -6.208763, lng: 106.845599, name: "Jakarta, Indonesia"},
      {lat: -33.868820, lng: 151.209296, name: "Sydney, Australia"}
    ]
  },
  {
    callsign: "DEMO_SHIP_002", 
    path: [
      {lat: 10.8007089, lng: 106.6880843, name: "Ho Chi Minh City, Vietnam"},
      {lat: -35.0004451, lng: 138.3309698, name: "Adelaide, Australia"}
    ]
  }
];

var currentJourneyIndex = 0;

// UI elements (populated at runtime)
var playPauseBtn, stepForwardBtn, stepBackBtn, speedSlider, speedValueLabel;
var shipSelect, providerSelect, themeSelect, showAllJourneysCheckbox;

// Map provider state
var currentProvider = 'google'; // or 'osm'
var leafletElements = { markers: [], polylines: [] };

// Utility: linear interpolation between two points
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function interpolatePoint(p1, p2, t) {
  return { lat: lerp(p1.lat, p2.lat, t), lng: lerp(p1.lng, p2.lng, t) };
}

// Initialize Google Maps
function initMap() {
  console.log("Initializing Google Maps...");
  currentProvider = 'google';
  map = new google.maps.Map(document.getElementById('map'), {
    zoom: 3,
    center: {lat: -10, lng: 120},
    mapTypeId: 'roadmap',
    styles: [
      {"elementType": "geometry", "stylers": [{"color": "#1d2c4d"}]},
      {"elementType": "labels.text.fill", "stylers": [{"color": "#8ec3b9"}]},
      {"elementType": "labels.text.stroke", "stylers": [{"color": "#1a3646"}]},
      {"featureType": "water", "elementType": "geometry", "stylers": [{"color": "#0e1626"}]},
      {"featureType": "administrative.country", "elementType": "geometry.stroke", "stylers": [{"color": "#4b6878"}]}
    ]
  });

  // Populate UI and start controls
  setupControlsAndSummary();

  // Auto-start animation after map loads
  google.maps.event.addListenerOnce(map, 'idle', function() {
    console.log("Map loaded (Google), ready.");
    // Start animation only if provider is google
    if (currentProvider === 'google') {
      prepareAndStartJourney();
    }
  });
}

// Initialize OpenStreetMap as fallback
function initOSM() {
  console.log("Initializing OpenStreetMap...");
  currentProvider = 'osm';

  // Clean up any existing leaflet elements
  clearLeafletElements();

  map = L.map('map').setView([-10, 120], 3);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  setupControlsAndSummary();

  // Draw current journey statically, and create leaflet marker for animation
  if (shipJourneys.length > 0) {
    drawLeafletJourney(shipJourneys[currentJourneyIndex]);
    updateShipInfo(shipJourneys[currentJourneyIndex]);
  }
}

function clearLeafletElements() {
  try {
    for (var i=0;i<leafletElements.markers.length;i++) {
      map.removeLayer(leafletElements.markers[i]);
    }
    for (var j=0;j<leafletElements.polylines.length;j++) {
      map.removeLayer(leafletElements.polylines[j]);
    }
  } catch(e) {}
  leafletElements = { markers: [], polylines: [] };
}

function drawLeafletJourney(journey) {
  clearLeafletElements();
  var latlngs = journey.path.map(function(p) { return [p.lat, p.lng]; });
  var pl = L.polyline(latlngs, {color: '#00ff99', weight: 3}).addTo(map);
  leafletElements.polylines.push(pl);

  var start = L.marker(latlngs[0]).addTo(map).bindPopup("Origin: " + journey.path[0].name);
  var end = L.marker(latlngs[latlngs.length-1]).addTo(map).bindPopup("Destination: " + journey.path[latlngs.length-1].name);
  leafletElements.markers.push(start, end);

  // Animated marker (divIcon so we can update position easily)
  var shipIcon = L.divIcon({className: 'leaflet-ship-icon', html: '<div class="ship-arrow">🚢</div>'});
  var animated = L.marker(latlngs[0], {icon: shipIcon}).addTo(map);
  leafletElements.markers.push(animated);
  // store reference for animation
  leafletAnimatedMarker = animated;
}

// Prepare and start the journey animation for the selected provider
function prepareAndStartJourney() {
  stopAnimation();
  var journey = shipJourneys[currentJourneyIndex];
  if (!journey) return;

  // Google-specific polyline and marker
  if (currentProvider === 'google' && typeof google !== 'undefined' && google.maps) {
    // Clear previous
    if (polyline) polyline.setMap(null);
    if (marker) marker.setMap(null);

    polyline = new google.maps.Polyline({
      path: journey.path,
      geodesic: true,
      strokeColor: '#00ff99',
      strokeOpacity: 1.0,
      strokeWeight: 3,
      map: map,
      icons: [{
        icon: {
          path: 'M -2,0 0,-2 2,0 0,2 z',
          scale: 3,
          strokeColor: '#00ff99',
          fillColor: '#00ff99',
          fillOpacity: 1
        },
        offset: '0%'
      }]
    });

    // Marker using a Symbol so we can rotate
    marker = new google.maps.Marker({
      position: journey.path[0],
      map: map,
      icon: {
        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        scale: 5,
        rotation: 0,
        fillColor: '#00ff99',
        strokeColor: '#00ff99'
      },
      title: journey.callsign
    });

    // Center map to first point
    map.panTo(journey.path[0]);

    // Start smooth animation
    animateJourneyGoogle(journey);
  }
  else if (currentProvider === 'osm') {
    // Ensure map and leaflet animated marker exist
    drawLeafletJourney(journey);
    map.panTo([journey.path[0].lat, journey.path[0].lng]);
    animateJourneyLeaflet(journey);
  }
}

// Stop and clear any animation
function stopAnimation() {
  isPlaying = false;
  if (animationRequestId) {
    cancelAnimationFrame(animationRequestId);
    animationRequestId = null;
  }
  if (animationInterval) {
    clearInterval(animationInterval);
    animationInterval = null;
  }
}

// Play / Pause toggles
function play() {
  if (isPlaying) return;
  isPlaying = true;
  playPauseBtn.innerText = 'Pause';
  playPauseBtn.setAttribute('aria-pressed', 'true');
  // resume from current position
  var journey = shipJourneys[currentJourneyIndex];
  if (!journey) return;
  // If at end, restart
  if (currentStep >= journey.path.length-1) {
    currentStep = 0;
  }
  if (currentProvider === 'google') {
    animateJourneyGoogle(journey, true);
  } else {
    animateJourneyLeaflet(journey, true);
  }
}
function pause() {
  isPlaying = false;
  playPauseBtn.innerText = 'Play';
  playPauseBtn.setAttribute('aria-pressed', 'false');
  if (animationRequestId) {
    cancelAnimationFrame(animationRequestId);
    animationRequestId = null;
  }
}

function togglePlayPause() {
  if (isPlaying) pause(); else play();
}

// Animation for Google Maps using requestAnimationFrame and interpolation
function animateJourneyGoogle(journey, resume) {
  // If not resume, reset to start
  if (!resume) {
    currentStep = 0;
  }

  var path = journey.path;
  function animateSegment(startIdx, startProgress) {
    if (startIdx >= path.length - 1) {
      // finished
      updateShipInfo(journey);
      // Auto-start next journey after delay
      setTimeout(function() {
        currentJourneyIndex = (currentJourneyIndex + 1) % shipJourneys.length;
        prepareAndStartJourney();
      }, 2000);
      return;
    }

    var p1 = path[startIdx];
    var p2 = path[startIdx + 1];
    var speedMultiplier = parseFloat(speedSlider.value) || 1;
    var duration = segmentDuration / speedMultiplier;
    var startTime = null;

    function step(timestamp) {
      if (!isPlaying) {
        // store progress so resume continues
        currentSegmentProgress = startTime ? Math.min((timestamp - startTime) / duration, 1) : 0;
        return; // paused
      }
      if (!startTime) startTime = timestamp - (startProgress || 0) * duration;
      var t = (timestamp - startTime) / duration;
      if (t >= 1) t = 1;

      var pt = interpolatePoint(p1, p2, t);
      marker.setPosition(pt);

      // rotate marker
      var angle = Math.atan2(p2.lng - p1.lng, p2.lat - p1.lat) * 180 / Math.PI; // approximate
      var icon = marker.getIcon();
      if (icon && icon.rotation !== undefined) {
        icon.rotation = angle;
        marker.setIcon(icon);
      }

      // update polyline icon offset
      if (polyline) {
        var icons = polyline.get('icons');
        if (icons && icons.length > 0) {
          icons[0].offset = ((startIdx + t) / (path.length - 1) * 100) + '%';
          polyline.set('icons', icons);
        }
      }

      // update info
      var locIdx = (t < 0.5) ? startIdx : startIdx + 1;
      document.getElementById('currentShip').innerHTML = 
        journey.callsign + ' → ' + path[locIdx].name;

      if (t < 1) {
        animationRequestId = requestAnimationFrame(step);
      } else {
        // proceed to next segment
        currentStep = startIdx + 1;
        animationRequestId = null;
        // small pause between segments then continue
        setTimeout(function() {
          if (isPlaying) animateSegment(currentStep, 0);
        }, 100);
      }
    }

    animationRequestId = requestAnimationFrame(step);
  }

  // If resuming with stored progress
  var resumeProgress = currentSegmentProgress || 0;
  animateSegment(currentStep, resumeProgress);
}

// Leaflet animation (OSM) - smooth movement by updating marker latlng
var leafletAnimatedMarker = null;
function animateJourneyLeaflet(journey, resume) {
  if (!resume) currentStep = 0;
  var path = journey.path;
  if (!leafletAnimatedMarker) {
    // find last created divIcon marker
    for (var i=0;i<leafletElements.markers.length;i++) {
      var m = leafletElements.markers[i];
      if (m && m._icon && m._icon.querySelector && m._icon.querySelector('.ship-arrow')) {
        leafletAnimatedMarker = m;
        break;
      }
    }
  }
  if (!leafletAnimatedMarker) return;

  function animateSegment(startIdx, startProgress) {
    if (startIdx >= path.length - 1) {
      updateShipInfo(journey);
      setTimeout(function() {
        currentJourneyIndex = (currentJourneyIndex + 1) % shipJourneys.length;
        prepareAndStartJourney();
      }, 2000);
      return;
    }
    var p1 = path[startIdx];
    var p2 = path[startIdx+1];
    var speedMultiplier = parseFloat(speedSlider.value) || 1;
    var duration = segmentDuration / speedMultiplier;
    var startTime = null;

    function step(timestamp) {
      if (!isPlaying) {
        currentSegmentProgress = startTime ? Math.min((timestamp - startTime) / duration, 1) : 0;
        return;
      }
      if (!startTime) startTime = timestamp - (startProgress || 0) * duration;
      var t = (timestamp - startTime) / duration;
      if (t >= 1) t = 1;
      var pt = interpolatePoint(p1, p2, t);
      leafletAnimatedMarker.setLatLng([pt.lat, pt.lng]);

      // update map if needed
      // update info
      var locIdx = (t < 0.5) ? startIdx : startIdx + 1;
      document.getElementById('currentShip').innerHTML = 
        journey.callsign + ' → ' + path[locIdx].name;

      if (t < 1) {
        animationRequestId = requestAnimationFrame(step);
      } else {
        currentStep = startIdx + 1;
        animationRequestId = null;
        setTimeout(function() {
          if (isPlaying) animateSegment(currentStep, 0);
        }, 100);
      }
    }

    animationRequestId = requestAnimationFrame(step);
  }

  var resumeProgress = currentSegmentProgress || 0;
  animateSegment(currentStep, resumeProgress);
}

// Step forward/back helpers
function stepForward() {
  var journey = shipJourneys[currentJourneyIndex];
  if (!journey) return;
  currentStep = Math.min(currentStep + 1, journey.path.length - 1);
  applyImmediateStep(journey);
}
function stepBack() {
  var journey = shipJourneys[currentJourneyIndex];
  if (!journey) return;
  currentStep = Math.max(currentStep - 1, 0);
  applyImmediateStep(journey);
}
function applyImmediateStep(journey) {
  stopAnimation();
  var p = journey.path[currentStep];
  if (currentProvider === 'google' && marker) {
    marker.setPosition(p);
    map.panTo(p);
  } else if (currentProvider === 'osm' && leafletAnimatedMarker) {
    leafletAnimatedMarker.setLatLng([p.lat, p.lng]);
    map.panTo([p.lat, p.lng]);
  }
  document.getElementById('currentShip').innerHTML = journey.callsign + ' → ' + p.name;
}

// Update ship information display
function updateShipInfo(journey) {
  var origin = journey.path[0].name;
  var destination = journey.path[journey.path.length - 1].name;
  document.getElementById('currentShip').innerHTML = 
    journey.callsign + ': ' + origin + ' → ' + destination;
  document.getElementById('currentJourneyLabel').innerText = journey.callsign;
}

// Utility: populate UI elements and attach events
function setupControlsAndSummary() {
  // Get elements lazily
  playPauseBtn = document.getElementById('playPauseBtn');
  stepForwardBtn = document.getElementById('stepForwardBtn');
  stepBackBtn = document.getElementById('stepBackBtn');
  speedSlider = document.getElementById('speedSlider');
  speedValueLabel = document.getElementById('speedValue');
  shipSelect = document.getElementById('shipSelect');
  providerSelect = document.getElementById('providerSelect');
  themeSelect = document.getElementById('themeSelect');
  showAllJourneysCheckbox = document.getElementById('showAllJourneys');

  // Populate ship selector if empty
  if (shipSelect && shipSelect.options.length === 0) {
    shipJourneys.forEach(function(j, idx) {
      var opt = document.createElement('option');
      opt.value = idx;
      opt.text = j.callsign;
      shipSelect.appendChild(opt);
    });
  }

  // Dataset summary
  document.getElementById('totalShips').innerText = shipJourneys.length;
  var totalRecords = shipJourneys.reduce(function(sum, j) { return sum + j.path.length; }, 0);
  document.getElementById('totalRecords').innerText = totalRecords;
  // Sample rows: show first 3 points of current journey
  var sample = '';
  if (shipJourneys.length>0) {
    var s = shipJourneys[0].path.slice(0,3);
    s.forEach(function(r){ sample += r.name + ' ('+r.lat+','+r.lng+')\n'; });
  }
  document.getElementById('sampleRows').innerText = sample;

  // Attach events
  if (playPauseBtn) playPauseBtn.onclick = function() {
    togglePlayPause();
    // Update button icon using the new updatePlayButton function
    updatePlayButton(isPlaying);
  };
  if (stepForwardBtn) stepForwardBtn.onclick = function(){ stopAnimation(); stepForward(); };
  if (stepBackBtn) stepBackBtn.onclick = function(){ stopAnimation(); stepBack(); };
  if (speedSlider) speedSlider.oninput = function() {
    var v = parseFloat(speedSlider.value).toFixed(1);
    if (speedValueLabel) speedValueLabel.innerText = v + 'x';
  };
  if (shipSelect) shipSelect.onchange = function(e) {
    var idx = parseInt(shipSelect.value, 10);
    if (!isNaN(idx)) {
      currentJourneyIndex = idx;
      prepareAndStartJourney();
    }
  };
  if (providerSelect) providerSelect.onchange = function(e) {
    var val = providerSelect.value;
    switchMapProvider(val);
  };
  if (themeSelect) themeSelect.onchange = function(e) {
    document.body.className = 'theme-' + themeSelect.value;
  };
  if (showAllJourneysCheckbox) showAllJourneysCheckbox.onchange = function(e) {
    toggleShowAllJourneys(showAllJourneysCheckbox.checked);
  };
}

function switchMapProvider(provider) {
  // Destroy existing map instance where possible and initialize selected provider
  if (provider === currentProvider) return;
  // Clear previous
  stopAnimation();
  // Remove DOM children inside #map to reset Leaflet/Google containers
  var mapEl = document.getElementById('map');
  if (mapEl) {
    mapEl.innerHTML = '';
  }
  // if switching to osm
  if (provider === 'osm') {
    // Remove google map if exists
    try { if (map && map instanceof google.maps.Map) { /* no direct destroy, just null */ } } catch(e) {}
    initOSM();
  } else if (provider === 'google') {
    // Try to init Google; if google object not available, fallback back to OSM
    if (typeof google !== 'undefined' && google.maps) {
      initMap();
    } else {
      alert('Google Maps not available in this environment. Falling back to OpenStreetMap.');
      providerSelect.value = 'osm';
      initOSM();
    }
  }
}

function toggleShowAllJourneys(show) {
  stopAnimation();
  // Remove any existing overlays
  if (currentProvider === 'google' && typeof google !== 'undefined' && google.maps) {
    // Clear existing map overlays
    // For simplicity, redraw all polylines and markers
    // Remove previous
    if (polyline) { polyline.setMap(null); polyline = null; }
    // Draw all journeys
    if (show) {
      shipJourneys.forEach(function(j) {
        new google.maps.Polyline({ path: j.path, geodesic:true, strokeColor:'#888', strokeWeight:2, map: map });
        new google.maps.Marker({ position: j.path[0], map: map, title: j.callsign + ' origin' });
      });
    } else {
      // just prepare the current journey view
      prepareAndStartJourney();
    }
  } else if (currentProvider === 'osm') {
    clearLeafletElements();
    if (show) {
      shipJourneys.forEach(function(j) {
        var latlngs = j.path.map(function(p){ return [p.lat, p.lng]; });
        var pl = L.polyline(latlngs, {color:'#888', weight:2}).addTo(map);
        leafletElements.polylines.push(pl);
        L.marker(latlngs[0]).addTo(map).bindPopup(j.callsign + ' origin');
      });
    } else {
      drawLeafletJourney(shipJourneys[currentJourneyIndex]);
    }
  }
}

// Window load event
window.onload = function() {
  console.log("Page loaded, initializing map...");
  // Hook provider selector after DOM ready
  setTimeout(function() {
    providerSelect = document.getElementById('providerSelect');
    if (providerSelect) {
      // default to google when available
      if (typeof google !== 'undefined' && google.maps) {
        providerSelect.value = 'google';
      } else {
        providerSelect.value = 'osm';
      }
    }
    // If google maps is available, initMap will be called by Google Maps callback
    if (typeof google !== 'undefined' && google.maps) {
      console.log("Google Maps available; waiting for callback initMap");
      // initMap will call setupControlsAndSummary and prepare animation
    } else {
      console.log("Google Maps not available, using OSM");
      initOSM();
    }
  }, 500);
};

// Make initMap globally available for Google Maps callback
window.initMap = initMap;
