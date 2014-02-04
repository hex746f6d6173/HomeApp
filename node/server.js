var express = require('express');
var app = express();
var sys = require('sys')
var exec = require('child_process').exec;
var child;
var server = app.listen(4000);
var io = require('socket.io').listen(server);

var Connection = require('ssh2');

var c = new Connection();

var thisConfig = require("./this.json");

var switches = require("./config.json");

app.use(express.static(__dirname + '/public'));

var flipSwitch = function(q, fn){
	console.log(""+q.brand+" "+q.code+" "+q.switch+" "+q.switchTo+"");

	var switchTo = "on";
	if(q.state === 0){switchTo = "off";}
	var query = "cd /var/www/home/rc/ex/lights && sudo ./"+q.brand+" "+q.code+" "+q.switch+" "+switchTo+"";

	console.log(query);
	if(thisConfig.use === "ssh"){
		console.log(query);
		c.exec(query, function(err, stream) {
		 if (err) throw err;

		  stream.on('data', function(data, extended) {
		      console.log((extended === 'stderr' ? 'STDERR: ' : 'STDOUT: ')
		                  + data);
		    });
		    stream.on('end', function() {
		      console.log('Stream :: EOF');
		    });
		    stream.on('close', function() {
		      console.log('Stream :: close');
		    });
			stream.on('exit', function(code, signal) {
		      console.log('Stream :: exit :: code: ' + code + ', signal: ' + signal);
		      fn({success:true});
		    });

		});

	}else{
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
	}
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

console.log(thisConfig.use);

if(thisConfig.use === "ssh"){

	c.on('ready', function() {
		console.log('Connection :: ready');
	});

	c.on('error', function(err) {
	  console.log('Connection :: error :: ' + err);
	  c.connect({
		  host: '192.168.0.101',
		  port: 22,
		  username: 'pi',
		  password:"fleismann"
		});
	});
	c.on('end', function() {
	  console.log('Connection :: end');
	  c.connect({
		  host: '192.168.0.101',
		  port: 22,
		  username: 'pi',
		  password:"fleismann"
		});
	});
	c.on('close', function(had_error) {
	  console.log('Connection :: close');
	  c.connect({
		  host: '192.168.0.101',
		  port: 22,
		  username: 'pi',
		  password:"fleismann"
		});
	});


	
	c.connect({
	  host: '192.168.0.101',
	  port: 22,
	  username: 'pi',
	  password:"fleismann"
	});

}

