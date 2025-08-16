//---------------------------------------------------------------------------------------------
// CÁC BIẾN DÙNG TRONG MAP
var map;
let timeline = [];      // Mảng thời gian theo tháng và năm 
let lstPolyline = [];   // Mảng các đường tàu di chuyển
let indexTimeline = 0;  // Index của mảng thời gian
let countryName = "";   // Tên quốc gia được chọn
let column;             // Cột thống kê khi rê chuột vào một map
let markerFirst;
let lockedCountry;
let isLocked = false;
let page;
const NUM_SHIP = 300;
let forF = 0;
//---------------------------------------------------------------------------------------------
var socket = io();
google.load('visualization', '1');

//---------------------------------------------------------------------------------------------
// Xóa các đường di chuyển
function removeLine() {
    forF = 0;
    lstPolyline.map(polyline=> {
      if(polyline) polyline.setMap(null);
    })
    if(column) {
      column.setMap(null);
    }
    if(markerFirst) {
      markerFirst.setMap(null);
    }
}

//---------------------------------------------------------------------------------------------
// Vẽ timeline phái trên   
function drawChart(dataArray, socket) {
      var MAX = dataArray.length;
      var title = 'From ' + dataArray[0].date + ' to ' + dataArray[MAX-1].date;
      var options = {
        isStacked: true,
        height: 100,
        colors: ['#00A0D0', 'blue', '#00A0D0'],
        legend: 'none',
        series: {
            1: {
                // set the color to change to
                color: '3fc26b',
                // don't show this in the legend
                visibleInLegend: false
            }
        },
        hAxis: {title, titleTextStyle: {color: '#333'}, viewWindow: {min:0, max:MAX},textPosition: 'out'},
        vAxis: {textPosition: 'none'}
      };
      var data = new google.visualization.DataTable();
      data.addColumn('string', 'Date');
      data.addColumn('number', 'Ships');
      
      for (var i = 0; i < MAX; ++i) {
        data.addRow([dataArray[i].year + "/" + dataArray[i].month, dataArray[i].cnt]); //TODO
      }
      
      var chart = new google.visualization.ChartWrapper({
          chartType: 'SteppedAreaChart',
          containerId: 'visualization',
          dataTable: data,
          options
      });
      
      function getIndex(selection) {
          var newSelection = [];
          var rows = [];
              rows.push(selection[0].row);
              // move the selected elements to column 2
              newSelection.push({
                  row: selection[0].row,
                  column: 2
              });                
                // set the view to remove the selected elements from the first series and add them to the second series
                chart.setView({
                    columns: [0, {
                        type: 'number',
                        label: data.getColumnLabel(1),
                        calc: function (dt, row) {
                            return (rows.indexOf(row) >= 0) ? null : {v: dt.getValue(row, 1), f: dt.getFormattedValue(row, 1)};
                        }
                    }, {
                        type: 'number',
                        label: data.getColumnLabel(1),
                        calc: function (dt, row) {
                            return (rows.indexOf(row) >= 0) ? {v: dt.getValue(row, 1), f: dt.getFormattedValue(row, 1)} : null;
                        }
                    }]
                });  
      }
      // Các hàm xử lí cho map
      function autoMove() {
        getIndex([{row: indexTimeline , column: 1}]);
          chart.draw();
          if(indexTimeline <  timeline.length -1) {
            removeLine();
            socket.emit('filterTimeLine', timeline[indexTimeline].date, countryName);
          } else {
            indexTimeline = -1;
          }
          indexTimeline++;
      }

      function draw() {
        google.visualization.events.addListener(chart, 'select', function () {
          indexTimeline = chart.getChart().getSelection()[0].row;
          getIndex([{row: indexTimeline , column: 1}]);
          chart.draw();
          socket.emit('filterTimeLine', timeline[indexTimeline].date, null);
        });
        chart.draw();
        autoMove();
        //Time for timeline change
        setInterval(function(){ 
          autoMove(); 
        }, 15000);
      }
      draw();
}

//---------------------------------------------------------------------------------------------
// Các sự kiện realtime và sự kiện click
window.onload = function(){ 
  socket.emit('timeline', {from: "2014-08-17", to: '2014-12-17'});

  // Chọn khoảng thời gian cho timeline
  document.getElementById('btnTimeline').onclick = function() {
    let from = document.getElementById('from').value;
    let to = document.getElementById('to').value;
    if(!from || !to) {
      alert("Please choose from date or to date");
    } else {
      document.getElementById("loadingText").innerHTML  = "Loading ... Please wait!";
      socket.emit('timeline', {from, to});
    }
  }

  // Yêu cầu mảng thời gian trong vùng chọn from date to date từ sever
  socket.on('timeline/result', function (data) {
    document.getElementById("loadingText").innerHTML  = "Drawing ... Please wait!";
    timeline = data;
    indexTimeline = 0;
    drawChart(data, socket);
  });

  // Lọc lại thông tin 
  socket.on('filterTimeline/result', async function(data){
    if(data.length> 1) {
      document.getElementById("loadingText").innerHTML  = "";
      removeLine();
      lstPolyline = await data.map(dt => {
          let lstLine = [];
          //if(dt.name != dt.lastName) { //TODO
            line1 = {lat: parseFloat(dt.latitude), lng: parseFloat(dt.longitude)};
            line2 = {lat: parseFloat(dt.lastLat), lng: parseFloat(dt.lastLong)};  
            lstLine.push(line1)
            lstLine.push(line2)
            var polyline = new google.maps.Polyline({
                path: lstLine,
                geodesic: true,
                    strokeColor: '#FF0000',
                    strokeOpacity: 1.0,
                    strokeWeight: 0,
                    icons: [{
                      icon:  {
                        path: 'M -0.3,0 0,-0.3 0.3,0 0,0.3 z',
                        scale: 1,
                        strokeColor: '#fff'
                      },
                      offset: '100%'
                    },
                    {
                      icon:  {
                        path: 'M -0.5,0 0,-0.5 0.5,0 0,0.5 z',
                        scale: 1,
                        strokeColor: '#fff'
                      },
                      offset: '100%'
                    },
                    {
                      icon:  {
                        path: 'M -2,0 0,-2 2,0 0,2 z',
                        scale: 1,
                        strokeColor: '#fff'
                      },
                      offset: '100%'
                    }
                  ]      
                  });
    
          return polyline;
      }) 

      let dt = data.find(dt => {
        if(dt.name == countryName) {
            return dt;              
        }
      })
      if(dt) {
        var triangleCoords = [
          {lat: parseFloat(dt.latitude), lng: parseFloat(dt.longitude)},
          {lat: parseFloat(dt.latitude) + (data.length/100), lng: parseFloat(dt.longitude)},
        ];
        column = new google.maps.Polygon({
          paths: triangleCoords,
          strokeColor: '#FFF',
          strokeWeight: 3,
          fillColor: '#FFF',
        });
        column.setMap(map);
        //============================================================================================
        
        // Thêm số dưới mỗi cột
        markerFirst = new google.maps.Marker({
            position: new google.maps.LatLng(parseFloat(dt.latitude),parseFloat(dt.longitude)),
            icon: {
              url: "",
              labelOrigin: new google.maps.Point(32, 32),
              size: new google.maps.Size(64,64),
              anchor: new google.maps.Point(16,32)
            },
            label: {
              text: data.length.toString(),
              color: "#fff",
              fontSize: '20px',
              labelInBackground: true,
            }
        });
      
        markerFirst.setMap(map);
      }

      page =await Paging(lstPolyline, NUM_SHIP);
      await drawShip();
      await animateCircle();
    } else {
      document.getElementById("loadingText").innerHTML  = "No Data";
    }
    
  });
  async function Paging(lstPolyline, numPer) {
    let all = lstPolyline.length;
    let numPerPage = numPer;
    return {
      num: all / numPerPage,
      red: all % numPerPage
    }
  }
  let indexFor = 0;
  async function drawShip() { 
    forF = 0;
    if(indexFor < page.num) {
      forF = indexFor * NUM_SHIP;
      indexFor ++;
    } 
    if(indexFor == page.num) {
      forF = page.red;
    }
    for(i=forF; i< lstPolyline.length; i++) {
      if(lstPolyline[i]) lstPolyline[i].setMap(map);
    }

  }


  // Xử lí sự kiện chuyển động cho trafic
  async function animateCircle() {
    await Promise.all(lstPolyline.map(polyline=> {
      var count = 0;
        window.setInterval(function() {
          count = (count + 1);
          var icons = polyline.get('icons');
          icons[0].offset = count + 6 +'%';
          icons[1].offset = count + 7  + '%';
          icons[2].offset = count + 8 + '%';

          polyline.set('icons', icons);
          if(icons[2].offset === '100%') {
            polyline.setMap(null);
          }
        }, 1);
    }))
    //removeLine();
    await drawShip();
  }
};

function initMap() {
  var styledMapType = new google.maps.StyledMapType(
      [
      {
        "elementType": "geometry",
        "stylers": [
          {
            "color": "#1d2c4d"
          }
        ]
      },
      {
        "elementType": "labels.text.fill",
        "stylers": [
          {
            "color": "#8ec3b9"
          }
        ]
      },
      {
        "elementType": "labels.text.stroke",
        "stylers": [
          {
            "color": "#1a3646"
          }
        ]
      },
      {
        "featureType": "administrative.country",
        "elementType": "geometry.stroke",
        "stylers": [
          {
            "color": "#4b6878"
          }
        ]
      },
      {
        "featureType": "administrative.land_parcel",
        "elementType": "labels.text.fill",
        "stylers": [
          {
            "color": "#64779e"
          }
        ]
      },
      {
        "featureType": "administrative.province",
        "elementType": "geometry.stroke",
        "stylers": [
          {
            "color": "#4b6878"
          }
        ]
      },
      {
        "featureType": "landscape.man_made",
        "elementType": "geometry.stroke",
        "stylers": [
          {
            "color": "#334e87"
          }
        ]
      },
      {
        "featureType": "landscape.natural",
        "elementType": "geometry",
        "stylers": [
          {
            "color": "#023e58"
          }
        ]
      },
      {
        "featureType": "poi",
        "elementType": "geometry",
        "stylers": [
          {
            "color": "#283d6a"
          }
        ]
      },
      {
        "featureType": "poi",
        "elementType": "labels.text.fill",
        "stylers": [
          {
            "color": "#6f9ba5"
          }
        ]
      },
      {
        "featureType": "poi",
        "elementType": "labels.text.stroke",
        "stylers": [
          {
            "color": "#1d2c4d"
          }
        ]
      },
      {
        "featureType": "poi.park",
        "elementType": "geometry.fill",
        "stylers": [
          {
            "color": "#023e58"
          }
        ]
      },
      {
        "featureType": "poi.park",
        "elementType": "labels.text.fill",
        "stylers": [
          {
            "color": "#3C7680"
          }
        ]
      },
      {
        "featureType": "road",
        "elementType": "geometry",
        "stylers": [
          {
            "color": "#304a7d"
          }
        ]
      },
      {
        "featureType": "road",
        "elementType": "labels.text.fill",
        "stylers": [
          {
            "color": "#98a5be"
          }
        ]
      },
      {
        "featureType": "road",
        "elementType": "labels.text.stroke",
        "stylers": [
          {
            "color": "#1d2c4d"
          }
        ]
      },
      {
        "featureType": "road.highway",
        "elementType": "geometry",
        "stylers": [
          {
            "color": "#2c6675"
          }
        ]
      },
      {
        "featureType": "road.highway",
        "elementType": "geometry.stroke",
        "stylers": [
          {
            "color": "#255763"
          }
        ]
      },
      {
        "featureType": "road.highway",
        "elementType": "labels.text.fill",
        "stylers": [
          {
            "color": "#b0d5ce"
          }
        ]
      },
      {
        "featureType": "road.highway",
        "elementType": "labels.text.stroke",
        "stylers": [
          {
            "color": "#023e58"
          }
        ]
      },
      {
        "featureType": "transit",
        "elementType": "labels.text.fill",
        "stylers": [
          {
            "color": "#98a5be"
          }
        ]
      },
      {
        "featureType": "transit",
        "elementType": "labels.text.stroke",
        "stylers": [
          {
            "color": "#1d2c4d"
          }
        ]
      },
      {
        "featureType": "transit.line",
        "elementType": "geometry.fill",
        "stylers": [
          {
            "color": "#283d6a"
          }
        ]
      },
      {
        "featureType": "transit.station",
        "elementType": "geometry",
        "stylers": [
          {
            "color": "#3a4762"
          }
        ]
      },
      {
        "featureType": "water",
        "elementType": "geometry",
        "stylers": [
          {
            "color": "#0e1626"
          }
        ]
      },
      {
        "featureType": "water",
        "elementType": "labels.text.fill",
        "stylers": [
          {
            "color": "#4e6d70"
          }
        ]
      }
    ],
      {name: 'BookOke'});
  map = new google.maps.Map(document.getElementById('map'), {
    zoom: 5,
    center: {lat: 41.87194, lng: 12.56738},
    mapTypeControlOptions: {
      mapTypeIds: ['roadmap', 'satellite', 'hybrid', 'terrain',
              'styled_map']
    },
    disableDefaultUI: true,
    zoomControl: false,
    scaleControl: false,
    gestureHandling: 'cooperative'
  });
  // Associate the styled map with the MapTypeId and set it to display.
  map.mapTypes.set('styled_map', styledMapType);
  map.setMapTypeId('styled_map');

  // Map layer
  // Initialize JSONP request
  var script = document.createElement('script');
  var url = ['https://www.googleapis.com/fusiontables/v1/query?'];
  url.push('sql=');
  var query = 'SELECT name, kml_4326 FROM ' +
      '1foc3xO9DyfSIF6ofvN0kp2bxSfSeKog5FbdWdQ';
  var encodedQuery = encodeURIComponent(query);
  url.push(encodedQuery);
  url.push('&callback=drawMap');
  url.push('&key=AIzaSyAm9yWCV7JPCTHCJut8whOjARd7pwROFDQ');
  script.src = url.join('');
  var body = document.getElementsByTagName('body')[0];
  body.appendChild(script);
}

function drawMap(data) {
  var rows = data['rows'];
  for (var i in rows) {
    if (rows[i][0] != 'Antarctica') {
      var newCoordinates = [];
      var geometries = rows[i][1]['geometries'];
      if (geometries) {
        for (var j in geometries) {
          newCoordinates.push(constructNewCoordinates(geometries[j]));
        }
      } else {
        newCoordinates = constructNewCoordinates(rows[i][1]['geometry']);
      }
      var country = new google.maps.Polygon({
        paths: newCoordinates,
        strokeColor: '#00ff99',
        strokeOpacity: 1,
        strokeWeight: 0.3,
        fillColor: '#00ff99',
        fillOpacity: 0,
        name: rows[i][0]
      });
      country.setMap(map);

      
      google.maps.event.addListener(country, 'click', async function() {
        removeLine();
        if(lockedCountry) {
          lockedCountry.setOptions({fillOpacity: 0}); 
        }
        if(isLocked == true && countryName == this.name) {
          isLocked = false;
          countryName = null;
          lockedCountry = null;
          this.setOptions({fillOpacity: 0}); 
        } else {
          isLocked = true;
          countryName = this.name;
          lockedCountry = this;
          this.setOptions({fillOpacity: 0.3}); 
        }
        socket.emit('filterTimeLine', timeline[indexTimeline].date, countryName);
        
      });
 
      // Xứ lí sự kiện khi rê chuột vào một quốc gia
      google.maps.event.addListener(country, 'mouseover', function() {
         if(isLocked === false) {
          removeLine();
          this.setOptions({fillOpacity: 0.5});  
          if(timeline.length > 0) 
          {
            countryName = this.name;
            socket.emit('filterTimeLine', timeline[indexTimeline].date, countryName);  
          }
         }
      });

      // Xử lí sự kiện khi rê chuột ra khỏi một quốc gia
      google.maps.event.addListener(country, 'mouseout', function() {
        if(isLocked === false) {
          removeLine();
          this.setOptions({fillOpacity: 0});
          if(timeline.length > 0) {
            countryName = null;
            socket.emit('filterTimeLine', timeline[indexTimeline].date, countryName);
          } 
         }
      });
    }
  }
}

function constructNewCoordinates(polygon) {
  var newCoordinates = [];
  var coordinates = polygon['coordinates'][0];
  for (var i in coordinates) {
    newCoordinates.push(
        new google.maps.LatLng(coordinates[i][1], coordinates[i][0]));
  }
  return newCoordinates;
} 
  

