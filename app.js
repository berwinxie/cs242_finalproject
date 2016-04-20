var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
// $http.defaults.headers.post["Content-Type"] = "application/x-www-form-urlencoded";

app.use(express.static(__dirname + '/public'));

// var user_id = 0;

io.on('connection', function(socket) {
  socket.emit('foundUser', { hello: 'Hey there browser!' });

  socket.on('respond', function(data) {
    console.log(data);
  });


  socket.on('playNote', function(data) {
    console.log(data);
    io.sockets.emit('getNote', { playedNote: data.note, duration:data.duration, username: data.username, instrument: data.instrument, drumType: data.drumType });
  });

  socket.on('disconnect', function() {
    console.log('Socket disconnected');
  });
});

var port = process.env.PORT || 3000;
console.log("Express server running on " + port);
server.listen(process.env.PORT || port);
