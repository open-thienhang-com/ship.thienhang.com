  
    //=======================================================================================================
    //CHART
    google.charts.load('current', {
        packages: ['corechart']
    });

    function drawChart(dataArray, socket, lstPolyline) {
      var options = {
        backgroundColor: '#fff',
        connectSteps: false,
        colors: ['#f36daa', 'blue', '#3fc26b'],
        height: 150,
        animation: {
          duration: 1000,
          easing: 'in'
        },
        hAxis: {title: 'Month/Year', titleTextStyle: {color: '#333'}, viewWindow: {min:0, max:10},textPosition: 'out'},
        vAxis: {textPosition: 'out'}
      };
    
      var chart = new google.visualization.SteppedAreaChart(document.getElementById('visualization'));
      var data = new google.visualization.DataTable();
      data.addColumn('string', 'Date');
      data.addColumn('number', 'Count');
      
      var MAX = dataArray.length;
      for (var i = 0; i < MAX; ++i) {
        data.addRow([dataArray[i].date, dataArray[i].cnt]); //TODO
      }
      // var data = google.visualization.arrayToDataTable([
      //   ['Date', 'Count', {role: 'style'}],
      //   ['0',0,'default']
      // ]);
      // for (var i = 0; i < MAX; ++i) {
      //   data.addRow([dataArray[i].date, dataArray[i].cnt, '#023e58']); //TODO
      // }
      console.log(data)
      var prevButton = document.getElementById('b1');
      var nextButton = document.getElementById('b2');
      var changeZoomButton = document.getElementById('b3');
      
      function drawChart() {
        // Disabling the button while the chart is drawing.
        prevButton.disabled = true;
        nextButton.disabled = true;
        changeZoomButton.disabled = true;
        google.visualization.events.addListener(chart, 'ready',
            function() {
              prevButton.disabled = options.hAxis.viewWindow.min <= 0;
              nextButton.disabled = options.hAxis.viewWindow.max >= MAX;
              //changeZoomButton.disabled = false;
            });
        google.visualization.events.addListener(chart, 'click',
        function() {
          // var formatter = new google.visualization.ColorFormat();
          // formatter.addRange(-20000, 0, 'white', 'orange');
          // formatter.addRange(20000, null, 'red', '#33ff33');
          // formatter.format(data, 1);
        });
        setInterval(function(){ 
          options.hAxis.viewWindow.min += 1;
          options.hAxis.viewWindow.max += 1;
          
          drawChart();
          removeLine(lstPolyline);
          if(indexTimeline < timeline.length) indexTimeline++;
          else indexTimeline = 0;
          socket.emit('filter', {code: "ES", time: timeline[indexTimeline]});
        }, 3000);
        chart.draw(data, options);
      }
    
      prevButton.onclick = function() {
        options.hAxis.viewWindow.min -= 1;
        options.hAxis.viewWindow.max -= 1;
        if(options.hAxis.viewWindow.min <= 0) options.hAxis.viewWindow.min = 0;
        drawChart();
      }
      nextButton.onclick = function() {
        options.hAxis.viewWindow.min += 1;
        options.hAxis.viewWindow.max += 1;
        if(options.hAxis.viewWindow.max <= 0) options.hAxis.viewWindow.max = MAX;
        drawChart();
      }
      
      

      var zoomed = false;
      changeZoomButton.onclick = function() {
        if (zoomed) {
          options.hAxis.viewWindow.min = 0;
          options.hAxis.viewWindow.max = 30;
        } else {
          options.hAxis.viewWindow.min = 0;
          options.hAxis.viewWindow.max = MAX;
        }
        zoomed = !zoomed;
        drawChart();
      }
      drawChart();
    }

    function removeLine(lstPolyline) {
      lstPolyline.map(polyline=> {
        polyline.setMap(null);
      })
    }
    

    





    : {
        // setting the "isStacked" option to true fixes the spacing problem
        isStacked: true,
        height: 300,
        colors: ['#f36daa', 'blue', '#3fc26b'],
        series: {
            1: {
                // set the color to change to
                color: '00A0D0',
                // don't show this in the legend
                visibleInLegend: false
            }
        },
        hAxis: {title: 'Month/Year', titleTextStyle: {color: '#333'}, viewWindow: {min:0, max:10},textPosition: 'out'},
        vAxis: {textPosition: 'out'}
    }


    isStacked: true,
        colors: ['#f36daa', 'blue', '#3fc26b'],
        height: 250,
        animation: {
          duration: 1000,
          easing: 'in'
        },
        series: {
          1: {
              // set the color to change to
              color: '00A0D0',
              // don't show this in the legend
              visibleInLegend: false
          }
      },
        hAxis: {title: 'Month/Year', titleTextStyle: {color: '#333'}, viewWindow: {min:0, max:10},textPosition: 'out'},
        vAxis: {textPosition: 'out'}