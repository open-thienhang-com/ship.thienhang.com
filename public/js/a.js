var express = require('express');
const bodyParser = require('body-parser')
var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
const csv = require('csv-parser');
const fs = require('fs');
var path = require('path');
app.use(bodyParser.json());
// Read file csv
let results = [];
let timeline  = [];
let mySet = new Set();
// Database
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const adapter = new FileSync('db.json')
const db = low(adapter)
// Write CSV to Database
fs.createReadStream(__dirname + '/data.csv')
.pipe(csv())
.on('data', function (data) {
  results.push(
    data
  );
  mySet.add(data.month + "/" + data.year);
})
.on('end', () => {
  timeline = Array.from(mySet);
  //Database
  db.set('ships', [results])
  .write()
});

let a = db.get('ships')
  .find({ year: '2015' }).value();
  console.log(a)

//
app.get('/', function(req, res) {
  
  res.sendFile(__dirname + '/index.html');
});

app.get('/map', function(req, res){
    res.sendFile(__dirname + '/map.html');
});

app.get('/test', function(req, res){
    res.sendFile(__dirname + '/test.html');
});
app.use(express.static(path.join(__dirname, 'public')));

var visitors = {};
io.on('connection', function(socket){
    io.emit('connected', { pos: 1, users_count: Object.keys(visitors).length });
    console.log('a user connected');
    socket.on('chat message', function(msg){
        console.log('message: ' + msg);
    });
    socket.emit('news', { hello: 'world' });
    socket.on('my other event', function (data) {
    console.log(data);
    });

    socket.emit('timeline', { data: timeline });
    socket.on('disconnect', function(){
        console.log('user disconnected');
    });
    
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});

