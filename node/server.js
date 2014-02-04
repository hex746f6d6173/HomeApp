var express = require('express');
var app = express();
var sys = require('sys')
var exec = require('child_process').exec;
var child;
var server = app.listen(4000);
var io = require('socket.io').listen(server);

var switches = require("./config.json");

child = exec("whoami", function (error, stdout, stderr) {
	  sys.print('stdout: ' + stdout);
	  sys.print('stderr: ' + stderr);
	  if (error !== null) {
	    
	  }else{

	  }
});

app.use(express.static(__dirname + '/public'));

var flipSwitch = function(req, res){
	console.log(""+req.params.brand+" "+req.params.code+" "+req.params.switch+" "+req.params.switchTo+"");
	child = exec("cd /var/www/home/rc/ex/lights && sudo ./"+req.params.brand+" "+req.params.code+" "+req.params.switch+" "+req.params.switchTo+"", function (error, stdout, stderr) {
	  sys.print('stdout: ' + stdout);
	  sys.print('stderr: ' + stderr);
	  if (error !== null) {
	    console.log('exec error: ' + error);
	    res.send(JSON.stringify({"success":false}));
		res.end();
	  }else{

	  	res.send(JSON.stringify({"success":true}));
		res.end();

	  }
	});

	console.log(req.params);
	

}

app.get('/switch/:brand/:code/:switch/:switchTo/', flipSwitch);

io.sockets.on('connection', function (socket) {

  socket.emit('switches', switches);

  /*socket.on('my other event', function (data) {
    console.log(data);
  });*/
});