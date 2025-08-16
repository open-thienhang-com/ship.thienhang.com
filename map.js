// Ship Journey Demo - thienhang.com
// Global variables
var map, marker, polyline, animationInterval;
var currentStep = 0;
var animationSpeed = 800;

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

// Initialize Google Maps
function initMap() {
  console.log("Initializing Google Maps...");
  
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

  // Auto-start animation after map loads
  google.maps.event.addListenerOnce(map, 'idle', function() {
    console.log("Map loaded, starting animation...");
    startJourneyAnimation();
  });
}

// Initialize OpenStreetMap as fallback
function initOSM() {
  console.log("Initializing OpenStreetMap...");
  
  map = L.map('map').setView([-10, 120], 3);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);
  
  // Show static route for OSM
  var currentJourney = shipJourneys[currentJourneyIndex];
  var latlngs = currentJourney.path.map(function(p) { return [p.lat, p.lng]; });
  L.polyline(latlngs, {color: '#00ff99', weight: 3}).addTo(map);
  L.marker(latlngs[0]).addTo(map).bindPopup("Origin: " + currentJourney.path[0].name);
  L.marker(latlngs[latlngs.length-1]).addTo(map).bindPopup("Destination: " + currentJourney.path[latlngs.length-1].name);
  
  updateShipInfo(currentJourney);
}

// Start journey animation
function startJourneyAnimation() {
  var currentJourney = shipJourneys[currentJourneyIndex];
  
  console.log("Starting animation for:", currentJourney.callsign);
  
  // Clear previous elements
  if (polyline) polyline.setMap(null);
  if (marker) marker.setMap(null);
  if (animationInterval) clearInterval(animationInterval);
  
  // Create polyline
  polyline = new google.maps.Polyline({
    path: currentJourney.path,
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
  
  // Create animated marker
  marker = new google.maps.Marker({
    position: currentJourney.path[0],
    map: map,
    icon: {
      url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
      scaledSize: new google.maps.Size(32, 32)
    },
    title: currentJourney.callsign
  });
  
  currentStep = 0;
  updateShipInfo(currentJourney);
  
  // Start animation
  animationInterval = setInterval(function() {
    currentStep++;
    if (currentStep >= currentJourney.path.length) {
      clearInterval(animationInterval);
      
      // Auto-start next journey after 2 seconds
      setTimeout(function() {
        currentJourneyIndex = (currentJourneyIndex + 1) % shipJourneys.length;
        startJourneyAnimation();
      }, 2000);
      return;
    }
    
    // Move marker
    marker.setPosition(currentJourney.path[currentStep]);
    
    // Update polyline animation
    var icons = polyline.get('icons');
    if (icons && icons.length > 0) {
      icons[0].offset = (currentStep / (currentJourney.path.length - 1) * 100) + '%';
      polyline.set('icons', icons);
    }
    
    // Update info
    var currentLocation = currentJourney.path[currentStep];
    document.getElementById('currentShip').innerHTML = 
      currentJourney.callsign + ' → ' + currentLocation.name;
    
  }, animationSpeed);
}

// Update ship information display
function updateShipInfo(journey) {
  var origin = journey.path[0].name;
  var destination = journey.path[journey.path.length - 1].name;
  document.getElementById('currentShip').innerHTML = 
    journey.callsign + ': ' + origin + ' → ' + destination;
}

// Window load event
window.onload = function() {
  console.log("Page loaded, initializing map...");
  
  // Try Google Maps first, fallback to OSM
  setTimeout(function() {
    if (typeof google !== 'undefined' && google.maps) {
      console.log("Google Maps available");
      // initMap will be called by Google Maps callback
    } else {
      console.log("Google Maps not available, using OSM");
      initOSM();
    }
  }, 1000);
};

// Make initMap globally available for Google Maps callback
window.initMap = initMap;
