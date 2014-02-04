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

var flipSwitch = function(q, fn){
	console.log(""+q.brand+" "+q.code+" "+q.switch+" "+q.switchTo+"");

	var switchTo = "on";
	if(q.state === 0){switchTo = "off";}
	var query = "cd /var/www/home/rc/ex/lights && sudo ./"+q.brand+" "+q.code+" "+q.switch+" "+switchTo+"";

	console.log(query);

	child = exec(query, function (error, stdout, stderr) {
	  sys.print('stdout: ' + stdout);
	  sys.print('stderr: ' + stderr);
	  if (error !== null) {
	    console.log('exec error: ' + error);
	    fn({success:false});
	  }else{

	  	fn({success:true});

	  }
	});

	console.log(q);
	

}

app.get('/switch/:brand/:code/:switch/:switchTo/', flipSwitch);

io.sockets.on('connection', function (socket) {

  socket.emit('switches', switches);

  socket.on('switch', function (data) {
	  if(switches[data.id].state === 1){
	  	switches[data.id].state = 0;
	  }else{
	  	switches[data.id].state = 1;
	  }
	flipSwitch(switches[data.id], function(res){
		io.sockets.emit("switched", {switch:switches[data.id], id:data.id});
		if(res.success){
			
		}
	});
    
  });
});