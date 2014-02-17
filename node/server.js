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
    request = require("request"),
    state = {
        ssh: false
    }, thisConfig = require("./this.json"),
    config = require("./config.json"),
    //speakeasy = require('speakeasy'),
    ping = require("net-ping"),
    switches = config.switches,
    ACCESS_KEY = "62f4c66393234ddaebd40f657698c7cd47ed4f89a9ff4c0b4061a8958e58",
    SECRET_KEY = "11acaec93bdf45ebc11fb0e51340cc6a79cc4f83aa475ec6e8ff2b608cf3a3f6",
    ENDPOINT = "https://api.push.co/1.0/",
    alarmArm = 0,
    triggerArm = 0,
    temp = 19,
    pulling = false,
    lightsLume = 0;

if (typeof localStorage === "undefined" || localStorage === null) {
    var LocalStorage = require('node-localstorage').LocalStorage;
    localStorage = new LocalStorage('./scratch');
}

if (localStorage.getItem("clients") === null) {
    localStorage.setItem("clients", JSON.stringify({}));
}

if (localStorage.getItem("log") === null || localStorage.getItem("log") == "")
    localStorage.setItem("log", "[]");

var log = {
    log: JSON.parse(localStorage.getItem("log")),
    add: function(action, not) {
        var time = new Date().getTime();

        var element = {
            time: time,
            action: action
        };

        log.log.push(element);

        localStorage.setItem("log", JSON.stringify(log.log));

        io.sockets.emit("logAdd", element);

        //console.log(action);
        if (not === true) {
            request({
                uri: "https://api.push.co/1.0/push/",
                method: "POST",
                form: {
                    "message": action,
                    "api_key": ACCESS_KEY,
                    "api_secret": SECRET_KEY,
                    "url": "http://home.tomasharkema.nl/push/" + time,
                    "view_type": '1'
                }
            }, function(error, response, body) {
                log.add("NOTIFICATION SEND");
            });
        }
    }
};

log.add("---HELLO HELLO---");
var version = "";
exec("git describe", function(error, stdout, stderr) {
    version = stdout;
    log.add(version);
    console.log("VERSION: " + version);
});



var clients = JSON.parse(localStorage.getItem("clients"));
//var clients = {};
var client = {
    set: function(ip, state) {
        clients[ip] = state;
        localStorage.setItem("clients", JSON.stringify(clients));
    },
    get: function(ip) {
        return clients[ip];
    }
};


var i = 0;
switches.forEach(function(item) {


    var lState = localStorage.getItem("light-" + i);

    if (lState !== null) {

        switches[i].state = parseInt(lState);

    }

    i++;
});

app.use(express.bodyParser());
app.use(express.methodOverride());

console.log("Still should fix auth - system");

app.use(express.static(__dirname + '/public'));

app.gitlab('/gitlab', {
    exec: 'git pull && npm install && forever restart server.js',
    token: 'uyDNS6DoFZxCzHxf89pj',
    branches: 'master'
});

state.ssh = false;
state.sshPending = false;

function cConnect() {
    log.add("SSH CONNECT");
    if (state.ssh === false) {
        if (state.sshPending === false) {
            c.connect(thisConfig.sshCred);
            state.sshPending = true;
            log.add("SSH PENDING");
        } else {
            log.add("SSH ALREADY PENDING");
        }
    } else {
        log.add("SSH ALREADY CONNECTED");
    }
}

var flipSwitch = function(a, to, fn) {

    var q = switches[a];
    if (to === false) {
        var switchTo = "on";
        if (q.state === 0) {
            switchTo = "off";
        }
    } else {
        q.state = to;
        var switchTo = "on";
        if (to === 0) {
            switchTo = "off";
        }
    }
    var query = "cd /var/www/home/node/executables && sudo ./" + q.brand + " " + q.code + " " + q.
    switch +" " + switchTo + "";

    log.add("FLIP " + q.brand + " " + q.code + " " + q.
        switch +" " + switchTo + "");
    //log.add("Zet " + q.name + " " + switchTo, true);
    var fn = function() {
        io.sockets.emit("switched", {
            switch: switches[a],
            id: a
        });

        localStorage.setItem("light-" + a, switches[a].state);
    }

    if (thisConfig.use === "ssh") {
        c.exec(query, function(err, stream) {
            if (err) throw err;
            log.add("EXEC COMMAND");
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
                log.add("EXEC COMMAND SUCCESS");
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
app.get('/temps', function(req, res) {

    var temps = JSON.parse(localStorage.getItem("temp"));

    var parseTemps = [];

    var prevHour = -1;

    var hourArray = [];

    temps.forEach(function(item) {
        var thisTemp = parseFloat(item[1]);
        var thisHour = new Date(item[0]).getHours();

        if (thisHour != prevHour) {

            prevHour = thisHour;


            if (hourArray.length > 0) {
                var teller = 0;
                var sum = 0;
                hourArray.forEach(function(itemm) {
                    sum = sum + itemm;
                    teller++;
                });

                var adjDate = new Date(item[0]).setMinutes(0);

                adjDate = new Date(adjDate).setSeconds(0);

                var h = new Date(adjDate).getHours();

                adjDate = new Date(adjDate).setHours(h);

                parseTemps.push([adjDate, sum / teller]);

                hourArray = [];

            } else {
                if (thisTemp < 45) {
                    hourArray.push(thisTemp);
                }
            }

        } else {
            if (thisTemp < 45) {
                hourArray.push(thisTemp);
            }
        }

    });

    res.send(JSON.stringify(parseTemps)).end();

});
app.get('/lights', function(req, res) {
    res.send(localStorage.getItem("lightsLumen")).end();
});
app.get('/light/:l', function(req, res) {
    var time = new Date().getTime();
    var newLight = parseFloat(req.params.l);
    console.log("LIGHTS: ", newLight);
    res.send(JSON.stringify(newLight)).end();

    if (localStorage.getItem("lightsLumen") === null || localStorage.getItem("lightsLumen") == "")
        localStorage.setItem("lightsLumen", "[]");

    var lights = JSON.parse(localStorage.getItem("lightsLumen"));

    lights.push([time, newLight]);

    lightsLume = newLight;

    io.sockets.emit("lightsLume", lightsLume);
    log.add("LIGHT UPDATE: " + lightsLume);
    localStorage.setItem("lightsLumen", JSON.stringify(lights));

});

app.get('/temp/:t', function(req, res) {
    var time = new Date().getTime();
    var newTemp = parseFloat(req.params.t);

    res.send(JSON.stringify(newTemp)).end();

    var Dtemp = temp - newTemp;

    if (newTemp < 45 && Dtemp < 5 && Dtemp > -5) {

        if (req.params.t != temp) {

            temp = newTemp;

            log.add("TEMPRATUUR UPDATE: " + temp);
            io.sockets.emit('temp', temp);
        }
        if (localStorage.getItem("temp") === null || localStorage.getItem("temp") == "")
            localStorage.setItem("temp", "[]");
        var temps = JSON.parse(localStorage.getItem("temp"));

        temps.push([time, newTemp]);

        localStorage.setItem("temp", JSON.stringify(temps));
    } else {
        log.add("TEMPRATUUR NO UPDATE: " + newTemp + ", DIFF " + Dtemp);
    }
});
var persistState = 0;
var timeSwitch = 0;
var timeOutFunction = "a";

app.get('/pir/:a/:b', function(req, res) {

    log.add("PIR!" + req.params.b);

    if (req.params.b == 1 && persistState === 0 && (timeSwitch + 60000) < new Date().getTime()) {
        persistState = 1;
        timeSwitch = new Date().getTime();

        if (config.PIR.onDetectYes !== undefined) {
            config.PIR.onDetectYes.forEach(function(item) {
                var t = new Date().getHours();
                var check = true;
                if (item.time === true) {
                    check = false;
                    item.between.forEach(function(betweenDiff) {
                        if (t >= betweenDiff[0] && t <= betweenDiff[1])
                            check = true;
                    });
                }
                if (check) {

                    if (item.type === "switch" && triggerArm === 1) {

                        log.add("AUTO COMMAND DELAY" + item.delay);

                        if (timeOutFunction != "a") {
                            clearTimeout(timeOutFunction);
                        }



                        timeOutFunction = setTimeout(function() {

                            if (triggerArm === 1) {

                                flipSwitch(item.
                                    switch, item.to, function(a) {
                                        console.log("JAJAJAJA", a);
                                    });
                            }
                        }, item.delay);

                    }

                    if (item.type == "alarm" && alarmArm === 1) {

                        log.add(item.message, true);

                    }
                }
            });

        }

    } else if (req.params.b == 0 && persistState === 1 && (timeSwitch + 60000) < new Date().getTime()) {
        persistState = 0;
        timeSwitch = new Date().getTime();
        if (config.PIR.onDetectNo !== undefined) {
            config.PIR.onDetectNo.forEach(function(item) {

                var t = new Date().getHours();
                var check = true;
                if (item.time === true) {
                    check = false;
                    item.between.forEach(function(betweenDiff) {
                        if (t >= betweenDiff[0] && t <= betweenDiff[1])
                            check = true;
                    });
                }
                if (check) {

                    if (item.type == "switch" && triggerArm === 1) {

                        log.add("AUTO COMMAND DELAY" + item.delay);

                        if (timeOutFunction != "a") {
                            clearTimeout(timeOutFunction);
                        }

                        timeOutFunction = setTimeout(function() {

                            if (triggerArm === 1) {
                                flipSwitch(item.
                                    switch, item.to, function(a) {

                                        console.log("JAJAJAJA", a);

                                    });
                            }
                        }, item.delay);

                    }

                    if (item.type == "alarm" && alarmArm === 1) {

                        console.log("ITEM, ALARM", item);

                        log.add(item.message, true);

                    }
                }
            });
        }
    }

    res.send(JSON.stringify(req.params.a)).end();

});

io.sockets.on('connection', function(socket) {
    cConnect();
    networkDiscovery();
    socket.emit('switches', switches);
    socket.emit('devices', config.devices);
    socket.emit('temp', temp);
    socket.emit("lightsLume", lightsLume);

    socket.emit('alarmArm', alarmArm);
    socket.emit('triggerArm', triggerArm);

    var sendLog = [];

    var i = 0;
    var max = log.log.length;
    var min = max - 100;
    log.log.forEach(function(item) {
        if (i > min && i < max) {
            sendLog.push(item);
        }
        i++;
    });

    socket.emit('log', sendLog);

    log.add("NEW CLIENT");

    var ip = "";
    socket.on('me', function(data) {
        ip = data;
        if (ip != "null") {
            client.set(ip, true);

            log.add("NEW CLIENT WITH NAME: " + ip);
        }
        io.sockets.emit('clients', JSON.stringify(clients));
    });

    socket.on('switch', function(data) {
        if (switches[data.id].state === 1) {
            switches[data.id].state = 0;
        } else {
            switches[data.id].state = 1;
        }
        flipSwitch(data.id, false, function(res) {

        });

    });

    socket.on('setAlarm', function(data) {
        alarmArm = data;
        io.sockets.emit("alarmArm", alarmArm);

        if (alarmArm === 1) {
            log.add("Alarm is armed!", true);
        } else {
            log.add("Alarm is dearmed!", true);
        }

    });

    socket.on('setTrigger', function(data) {
        triggerArm = data;
        io.sockets.emit("triggerArm", triggerArm);

        if (triggerArm === 1) {
            log.add("Trigger is armed!", true);
        } else {
            log.add("Trigger is dearmed!", true);
        }

    });

    socket.on("refresh", function() {
        if (!pulling) {
            log.add("GIT PULL");
            // executes `pwd`
            console.log("GIT PULL");
            io.sockets.emit("refreshE", {
                event: "refresh"
            });
            pulling = true;
            exec("git pull", function(error, stdout, stderr) {
                log.add("stdout: " + stdout);
                console.log("GIT PULL", error, stdout, stderr);
                io.sockets.emit("refreshE", {
                    event: "refreshdata",
                    data: stdout
                });
            }).on('close', function() {
                pulling = false;
                cConnect();
                exec("git describe", function(error, stdout, stderr) {
                    var newVersion = stdout;
                    log.add("New version" + version);
                    console.log("VERSION: " + version);

                    if (newVersion != version) {
                        io.sockets.emit("refreshE", {
                            event: "restart"
                        });
                        log.add("Updated to: " + newVersion, true);
                        setTimeout(function() {
                            childd = exec("forever restartall", function(error, stdout, stderr) {});
                        }, 10000);
                    } else {
                        log.add("No updated to: " + newVersion + ", same version");
                    }

                });


            });
        } else {
            log.add("ALREADY PULLING");
        }

    });

    socket.emit('state', state);

    socket.on('disconnect', function() {
        client.set(ip, false);
        //console.log("emit clients ", clients);
        io.sockets.emit('clients', JSON.stringify(clients));
        log.add("CLIENT BYE BYE" + ip);
    });

});

//console.log(thisConfig.use);

if (thisConfig.use === "ssh") {

    c.on('ready', function() {
        //console.log('Connection :: ready');
        state.ssh = true;
        state.sshPending = false;
        io.sockets.emit('state', state);
        log.add("SSH CONNECTED");
    });

    c.on('error', function(err) {
        //console.log('Connection :: error :: ' + err);
        state.sshPending = false;
        state.ssh = false;
        io.sockets.emit('state', state);
        log.add("SSH ERROR");
    });
    c.on('end', function() {
        //console.log('Connection :: end');
        state.sshPending = false;
        state.ssh = false;
        io.sockets.emit('state', state);
        log.add("SSH END");
    });
    c.on('close', function(had_error) {
        //console.log('Connection :: close');
        state.sshPending = false;
        setTimeout(function() {
            cConnect();
        }, 5000);
        state.ssh = false;
        io.sockets.emit('state', state);
        log.add("SSH CLOSE");
    });

    io.sockets.emit('state', state);

    cConnect();

}



function networkDiscovery() {
    var i = 0;
    log.add("NETWORKDISC EXEC");
    var pingSession = ping.createSession();

    config.devices.forEach(function(item) {

        var self = this;

        //console.log(item);
        var time = new Date().getTime();
        if (localStorage.getItem("deviceHis") === null || localStorage.getItem("deviceHis") == "")
            localStorage.setItem("deviceHis", "{}");

        pingSession.pingHost(item.ip, function(error, target) {
            if (error) {
                var thisState = 0;
            } else {
                var thisState = 1;
            }
            //console.log(error);
            if (thisState != item.state) {

                item.state = thisState;

                io.sockets.emit('deviceChange', item);

                if (item.state === 1) {
                    log.add("NETWORKDISC " + item.name + " came online");

                    var deviceHis = JSON.parse(localStorage.getItem("deviceHis"));
                    if (deviceHis[item.ip] === undefined)
                        deviceHis[item.ip] = {};
                    if (deviceHis[item.ip].graph === undefined)
                        deviceHis[item.ip].graph = [];

                    deviceHis[item.ip].graph.push([time, 1]);

                    localStorage.setItem("deviceHis", JSON.stringify(deviceHis));

                    if (item.onSwitchOn !== undefined) {
                        eval(item.onSwitchOn);
                        log.add("AUTOCOMMAND ON " + item.onSwitchOn, true);
                    }
                }
                if (item.state === 0) {
                    log.add("NETWORKDISC " + item.name + " went offline");

                    var deviceHis = JSON.parse(localStorage.getItem("deviceHis"));

                    if (deviceHis[item.ip] === undefined)
                        deviceHis[item.ip] = {};

                    if (deviceHis[item.ip].graph === undefined)
                        deviceHis[item.ip].graph = [];

                    deviceHis[item.ip].graph.push([time, 0]);

                    localStorage.setItem("deviceHis", JSON.stringify(deviceHis));

                    if (item.onSwitchOff !== undefined) {
                        eval(item.onSwitchOff);
                        log.add("AUTOCOMMAND OFF " + item.onSwitchOff, true);
                    }
                }

            }

        });

        i++;
    });

}

function checkRunningProcesses() {

    var cCheck = new Connection();
    cCheck.connect(thisConfig.sshCred);
    cCheck.exec("pstree | grep py", function(err, stream) {
        stream.on('data', function(data, extended) {
            var str = "" + data + "";
            var match = str.match(/pir.py|try.py|light.py/g);
            console.log("match", match, data);
            if (match.indexOf("pir.py") === -1) {
                log.add("checkRunningProcesses start pir");
                var pirExec = cCheck.exec("cd /var/www/home/node/executables/DHT && ./pir.py >> pir.log");

            }
            if (match.indexOf("try.py") === -1) {
                log.add("checkRunningProcesses start try");
                var tryExec = cCheck.exec("cd /var/www/home/node/executables/DHT && ./try.py >> try.log");
            }
            if (match.indexOf("light.py") === -1) {
                log.add("checkRunningProcesses start lights");
                var lightExec = cCheck.exec("cd /var/www/home/node/executables/DHT && ./light.py >> light.log");
            }
        });
    });

}
setInterval(function() {
    checkRunningProcesses();
}, 60000);
networkDiscovery();

setTimeout(function() {
    log.add("NETWORKDISC FROM TIMEOUT");
    networkDiscovery();

}, 10 * 1000);