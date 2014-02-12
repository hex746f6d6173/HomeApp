var express = require('express'),
    http = require('http'),
    webhook = require('gitlab-webhook'),
    app = express(),
    sys = require('sys'),
    exec = require('child_process').exec,
    child, server = app.listen(4000),
    io = require('socket.io').listen(server, {
        log: false
    }),
    Connection = require('ssh2'),
    c = new Connection(),
    state = {
        ssh: false
    }, thisConfig = require("./this.json"),
    switches = require("./config.json"),
    speakeasy = require('speakeasy');

app.use(express.bodyParser());
app.use(express.methodOverride());

console.log("WELL, HELLO");

console.log("Still should fix auth-system");

app.use(express.static(__dirname + '/public'));

app.gitlab('/gitlab', {
    exec: 'git pull && npm install && forever restart server.js',
    token: 'uyDNS6DoFZxCzHxf89pj',
    branches: 'master'
});

state.ssh = false;
state.sshPending = false;

function cConnect() {
    console.log("state", state);
    if (state.ssh === false) {
        if (state.sshPending === false) {
            c.connect({
                host: '192.168.0.101',
                port: 22,
                username: 'pi',
                password: "fleismann"
            });
            state.sshPending = true;
        }
    }
}

var flipSwitch = function(q, fn) {

    var switchTo = "on";
    if (q.state === 0) {
        switchTo = "off";
    }
    var query = "cd /var/www/home/node/executables && sudo ./" + q.brand + " " + q.code + " " + q.
    switch +" " + switchTo + "";

    if (thisConfig.use === "ssh") {
        c.exec(query, function(err, stream) {
            if (err) throw err;

            stream.on('data', function(data, extended) {
                //console.log((extended === 'stderr' ? 'STDERR: ' : 'STDOUT: ') + data);
            });
            stream.on('end', function() {
                //console.log('Stream :: EOF');
            });
            stream.on('close', function() {
                //console.log('Stream :: close');
            });
            stream.on('exit', function(code, signal) {
                //console.log('Stream :: exit :: code: ' + code + ', signal: ' + signal);
                fn({
                    success: true
                });
            });

        });

    } else {
        child = exec(query, function(error, stdout, stderr) {
            //sys.print('stdout: ' + stdout);
            //sys.print('stderr: ' + stderr);
            if (error !== null) {
                //console.log('exec error: ' + error);
                fn({
                    success: false
                });
            } else {

                fn({
                    success: true
                });

            }
        });
    }
}

//app.get('/switch/:brand/:code/:switch/:switchTo/', flipSwitch);

app.get('/switches', function(req, res) {

    res.send(JSON.stringify(switches)).end();


});

io.sockets.on('connection', function(socket) {
    cConnect();
    socket.emit('switches', switches);

    socket.on('switch', function(data) {
        if (switches[data.id].state === 1) {
            switches[data.id].state = 0;
        } else {
            switches[data.id].state = 1;
        }
        flipSwitch(switches[data.id], function(res) {
            io.sockets.emit("switched", {
                switch: switches[data.id],
                id: data.id
            });

            localStorage.setItem("light-" + data.id, switches[data.id].state);

            if (res.success) {

            }
        });

    });

    socket.emit('state', state);

});

console.log(thisConfig.use);

if (thisConfig.use === "ssh") {

    c.on('ready', function() {
        //console.log('Connection :: ready');
        state.ssh = true;
        state.sshPending = false;
        io.sockets.emit('state', state);
    });

    c.on('error', function(err) {
        //console.log('Connection :: error :: ' + err);
        state.sshPending = false;
        state.ssh = false;
        io.sockets.emit('state', state);
    });
    c.on('end', function() {
        //console.log('Connection :: end');
        state.sshPending = false;
        state.ssh = false;
        io.sockets.emit('state', state);
    });
    c.on('close', function(had_error) {
        //console.log('Connection :: close');
        state.sshPending = false;
        cConnect();
        state.ssh = false;
        io.sockets.emit('state', state);
    });

    io.sockets.emit('state', state);

    cConnect();

}