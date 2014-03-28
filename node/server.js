var mongojs = require('mongojs'),
    express = require('express'),
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

var db = mongojs("server", ["swiches", "devices", "clients", "misc", "log", "deviceHis"]);

var homeDB = {
    switches: db.collection('swiches'),
    devices: db.collection('devices'),
    clients: db.collection('clients'),
    misc: db.collection('misc'),
    log: db.collection('log'),
    pir: db.collection('pir'),
    light: db.collection('light'),
    temp: db.collection('temp'),
    bed: db.collection('bed'),
    deviceHis: db.collection('deviceHis')
};

homeDB.switches.find(function(err, docs) {
    if (docs.length === 0) {
        console.log("install SWITCHES");
        config.switches.forEach(function(item) {
            homeDB.switches.save(item);
        });
    }
});
homeDB.devices.find(function(err, docs) {
    if (docs.length === 0) {
        console.log("install devices");
        config.devices.forEach(function(item) {
            homeDB.devices.save(item);
        });
    }
});


homeDB.misc.find(function(err, docs) {
    if (docs.length === 0) {
        console.log("install miscs");
        homeDB.misc.save({
            name: 'alarm',
            arm: 0
        });
        homeDB.misc.save({
            name: 'trigger',
            arm: 0
        });
    }
});

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

        homeDB.log.save(element);


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
    set: function(ip, state, fn) {
        homeDB.clients.find({
            name: ip
        }, function(err, docs) {
            if (docs.length > 0) {
                homeDB.clients.update({
                    name: ip
                }, {
                    $set: {
                        state: state,
                        lastSeen: (new Date().getTime())
                    }
                }, fn);
            } else {
                homeDB.clients.save({
                    name: ip,
                    state: state
                }, fn);
            }
        });
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
var offline = require('connect-offline');

app.use(offline({
    manifest_path: "/application.manifest",
    files: [{
        dir: '/public/css/',
        prefix: '/css/'
    }, {
        dir: '/public/js/',
        prefix: '/js/'
    }, {
        dir: '/public/fonts/',
        prefix: '/fonts/'
    }, {
        dir: '/public/img/',
        prefix: '/img/'
    }],
    networks: [
        "*"
    ]
}));


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

    console.log(a, to, fn, typeof a);
    var id = 0;
    if (typeof a === "number") {
        id = a;
    }

    if (typeof a === "object") {
        id = a.id;
    }

    console.log(id);

    homeDB.switches.find({
        id: id
    }, function(err, docs) {
        if (docs.length > 0) {
            q = docs[0];
            var newState = 1;
            if (to === false) {
                var switchTo = "on";
                newState = 1;
                if (q.state === 1) {
                    switchTo = "off";
                    newState = 0;
                }
            } else {
                q.state = to;
                var switchTo = "on";
                newState = 1;
                if (to === 0) {
                    switchTo = "off";
                    newState = 0;
                }
            }
            var query = "cd /var/www/home/node/executables && sudo ./" + q.brand + " " + q.code + " " + q.
            switch +" " + switchTo + "";

            log.add("FLIP " + q.brand + " " + q.code + " " + q.
                switch +" " + switchTo + "");
            //log.add("Zet " + q.name + " " + switchTo, true);



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



                    console.log("updated", docs, newState);
                    homeDB.switches.update({
                        id: docs[0].id
                    }, {
                        $set: {
                            state: newState
                        }
                    }, function(err, updated) {
                        docs[0].state = newState;
                        io.sockets.emit("switched", {
                            switch: docs[0],
                            id: id
                        });
                    });









                    log.add("EXEC COMMAND SUCCESS");
                });

            });
        }
    });
}

//app.get('/switch/:brand/:code/:switch/:switchTo/', flipSwitch);

app.get('/switches', function(req, res) {

    res.send(JSON.stringify(switches)).end();


});
app.get('/api/temps', function(req, res) {

    var temps = JSON.parse(localStorage.getItem("temp"));

    var parseTemps = [];

    var prevHour = -1;

    var hourArray = [];



    temps.forEach(function(item) {
        var thisTemp = parseFloat(item[1]);
        var thisHour = new Date(item[0]).getHours();
        if (item[0] > (new Date().getTime() - (1000 * 60 * 60 * 24))) {
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
        }
    });

    res.send(JSON.stringify(parseTemps)).end();

});
app.get('/api/lights', function(req, res) {

    homeDB.light.find({}, function(err, docs) {


        var parseLights = [];

        var prevHour = -1;

        var hourArray = [];

        docs.forEach(function(item) {
            var thisLight = item.light;
            var thisHour = new Date(item.time).getHours();

            if (item[0] > (new Date().getTime() - (1000 * 60 * 60 * 24))) {

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
                        parseLights.push([adjDate, sum / teller]);

                        hourArray = [];

                    } else {
                        hourArray.push(thisLight);

                    }

                } else {
                    hourArray.push(thisLight);

                }
            }

        });

        res.send(parseLights).end();



    });


});
app.get('/deviceHis', function(req, res) {
    res.send(localStorage.getItem("deviceHis")).end();
});
app.get('/api/totalGraph', function(req, res) {
    var ret = [];
    var deviceHisArray = [];
    homeDB.deviceHis.find(function(err, docs) {
        docs.forEach(function(doc) {

            if (deviceHisArray[doc.name] === undefined) {
                deviceHisArray[doc.name] = {
                    name: doc.name,
                    data: []
                }
            }
            deviceHisArray[doc.name].data.push([doc.time, doc.state]);
        });
        console.log(deviceHisArray);

        deviceHisArray.forEach(function(item) {
            console.log(item);
            ret.push({
                label: "Device History " + key,
                data: devicePlot
            });
        });


    });



    var pir = JSON.parse(localStorage.getItem("pir"));
    var pirData = [];
    pir.forEach(function(item) {
        if (item[0] > (new Date().getTime() - (1000 * 60 * 60 * 24)))
            pirData.push(item);

    });

    ret.push({
        label: "PIR history",
        data: pirData,
        color: "#FFFFFF"
    });

    localStorage.getItem("lightsLumen")

    res.send(ret).end();
});
app.get('/light/:l', function(req, res) {
    var time = new Date().getTime();
    var newLight = parseFloat(req.params.l);
    console.log("LIGHTS: ", newLight);
    res.send(JSON.stringify(newLight)).end();

    homeDB.light.save({
        time: time,
        light: newLight
    });

    lightsLume = newLight;

    io.sockets.emit("lightsLume", lightsLume);

});

setInterval(function() {
    if (lightsLume === 0) {
        var time = new Date().getTime();
        homeDB.light.save({
            time: time,
            light: 0
        });
    }
}, 10 * 60 * 1000);

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

        homeDB.temp.save({
            time: time,
            temp: newTemp
        });
    } else {
        log.add("TEMPRATUUR NO UPDATE: " + newTemp + ", DIFF " + Dtemp);
    }
});
var persistState = 0;
var timeSwitch = 0;
var timeOutFunction = "a";
var lastOffTime = 0;
app.get('/pir/:a/:b', function(req, res) {

    //log.add("PIR! " + req.params.b);

    var time = new Date().getTime();

    var pirs = JSON.parse(localStorage.getItem("pir"));

    if (req.params.b == 1) {
        homeDB.pir.save({
            time: time,
            pir: "1"
        });
    } else if (req.params.b == 0) {

        //log.add("PIR 0, diffTime:" + ((lastOffTime + (1000 * 60 * 5)) - time));
        if ((lastOffTime + (1000 * 60 * 5)) < time) {
            lastOffTime = time;

            homeDB.pir.save({
                time: time,
                pir: "0"
            });
        }

    }


    if (req.params.b == 1 && persistState === 0) {
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

                if (item.light === true) {
                    log.add("CHECK FOR LIGHT: " + lightsLume + " < " + item.less + "");
                    check = false;
                    if (lightsLume < item.less) {
                        check = true;
                    }
                }
                if (check) {
                    if (item.type === "switch" && triggerArm === 1) {

                        log.add("AUTO COMMAND DELAY" + item.delay);

                        if (timeOutFunction != "a") {
                            clearTimeout(timeOutFunction);
                        }



                        timeOutFunction = setTimeout(function() {

                            if (triggerArm === 1) {
                                console.log("ITEM", item);
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

    } else if (req.params.b == 0 && persistState === 1) {
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

                if (item.light === true) {
                    log.add("CHECK FOR LIGHT: " + lightsLume + " < " + item.less + "");
                    check = false;
                    if (lightsLume < item.less) {
                        check = true;
                    }
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

    res.send(JSON.stringify(req.params.b)).end();

});

io.sockets.on('connection', function(socket) {
    cConnect();
    networkDiscovery();

    homeDB.switches.find(function(err, docs) {

        socket.emit('switches', docs);

    });

    homeDB.devices.find(function(err, docs) {

        socket.emit('devices', docs);

    });
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
    homeDB.log.find().limit(100, function(err, docs) {
        socket.emit('log', docs);
    });

    log.add("NEW CLIENT");

    var ip = "";
    socket.on('me', function(data) {
        ip = data;
        if (ip != "null") {
            client.set(ip, true, function() {
                homeDB.clients.find().sort({
                    lastSeen: -1
                }, function(err, docs) {
                    io.sockets.emit('clients', JSON.stringify(docs));
                });
            });

            log.add("NEW CLIENT WITH NAME: " + ip);
        } else {
            homeDB.clients.find().sort({
                lastSeen: -1
            }, function(err, docs) {
                io.sockets.emit('clients', JSON.stringify(docs));
            });
        }
    });

    socket.on('switch', function(data) {
        console.log(data);

        flipSwitch(data, false, function(res) {});

    });

    socket.on('bed', function(data) {
        log.add("Bed is inits!", true);
        var time = new Date().getTime();

        homeDB.bed.save({
            time: time,
            bed: data
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
            c.exec("cd /var/www/home/node && sudo git pull", function(err, stream) {
                if (err) throw err;
                log.add("PI GIT PULL");

                stream.on('data', function(data, extended) {
                    log.add("PI GIT PULL DATA: " + data);
                });
                stream.on('end', function() {
                    //console.log('Stream :: EOF');
                });
                stream.on('close', function() {
                    //console.log('Stream :: close');
                });
                stream.on('exit', function(code, signal) {
                    //console.log('Stream :: exit :: code: ' + code + ', signal: ' + signal);

                });

            });
            exec("git pull && npm install", function(error, stdout, stderr) {
                log.add("stdout: " + stdout);
                console.log("GIT PULL", error, stdout, stderr);
                io.sockets.emit("refreshE", {
                    event: "refreshdata",
                    data: stdout
                });
                state.sshPending = false;
                cConnect();
            }).on('close', function() {
                pulling = false;
                c.end();
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
                        setTimeout(function() {
                            childd = exec("forever restartall", function(error, stdout, stderr) {});
                        }, 10000);
                    }

                });


            });
        } else {
            log.add("ALREADY PULLING");
        }

    });

    socket.emit('state', state);

    socket.on('disconnect', function() {
        client.set(ip, false, function() {
            //console.log("emit clients ", clients);
            homeDB.clients.find().sort({
                lastSeen: -1
            }, function(err, docs) {
                io.sockets.emit('clients', JSON.stringify(docs));
            });
            log.add("CLIENT BYE BYE" + ip);
        });
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
        log.add("SSH ERROR " + err);
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
        }, 10000);
        state.ssh = false;
        io.sockets.emit('state', state);
        log.add("SSH CLOSE");
    });

    io.sockets.emit('state', state);

    cConnect();

}


var itemDisc = {};

function networkDiscovery() {
    var i = 0;
    log.add("NETWORKDISC EXEC");
    var pingSession = ping.createSession();

    homeDB.devices.find(function(err, docs) {

        docs.forEach(function(item) {

            var self = this;

            //console.log(item);
            var time = new Date().getTime();

            pingSession.pingHost(item.ip, function(error, target) {
                if (error) {
                    var thisState = 0;
                } else {
                    var thisState = 1;
                }

                if (itemDisc[item.name] === undefined)
                    itemDisc[item.name] = -1;

                if (thisState != item.state) {

                    var evalExecute = true;

                    if (itemDisc[item.name])
                        evalExecute = false

                    itemDisc[item.name] = thisState;

                    homeDB.devices.update({
                        id: item.id
                    }, {
                        $set: {
                            state: thisState
                        }
                    }, function(err, docs) {
                        console.log("update DEVICE", err, docs);
                    });

                    item.state = thisState;

                    io.sockets.emit('deviceChange', item);

                    if (item.state === 1) {
                        log.add("NETWORKDISC " + item.name + " came online");

                        homeDB.deviceHis.save({
                            name: item.name,
                            time: time,
                            state: "1"
                        });

                        if (item.onSwitchOn !== undefined) {
                            if (evalExecute)
                                eval(item.onSwitchOn);
                            log.add("AUTOCOMMAND ON " + item.name, true);
                        }
                    }
                    if (item.state === 0) {
                        log.add("NETWORKDISC " + item.name + " went offline");

                        homeDB.deviceHis.save({
                            name: item.name,
                            time: time,
                            state: "0"
                        });

                        if (item.onSwitchOff !== undefined) {
                            if (evalExecute)
                                eval(item.onSwitchOff);
                            log.add("AUTOCOMMAND OFF " + item.name, true);
                        }
                    }

                }

            });

            i++;
        });
    });
}

app.get('/bigdata', function(req, res) {

    var returnn = {};

    var pir = JSON.parse(localStorage.getItem("pir"));

    var teller = 0;

    var thisItem = {
        begin: "",
        end: ""
    };

    var times = [];

    pir.forEach(function(item) {


        if (item[1] == 1) {

            if (thisItem.begin === "") {
                thisItem.begin = item[0];
            }
        }

        if (item[1] == 0) {
            if (thisItem.begin !== "") {
                thisItem.end = item[0];
                thisItem.leng = thisItem.end - thisItem.begin;

                thisItem.lengSec = thisItem.leng / 1000;
                thisItem.lengMin = thisItem.leng / 1000 / 60;
                thisItem.lengHour = thisItem.leng / 1000 / 60 / 60;
                thisItem.beginHuman = new Date(thisItem.begin);
                thisItem.endHuman = new Date(thisItem.end);

                times.push(thisItem);
                thisItem = {
                    begin: "",
                    end: ""
                };
            }

        }


    });

    var previousDay = 0;
    var secs = 0;
    var dayLists = [];
    times.forEach(function(item) {

        if (previousDay === 0) {
            previousDay = new Date(item.begin).getDay();
        }

        if (previousDay == new Date(item.begin).getDay()) {
            secs = secs + item.lengSec;
        } else {

            dayLists.push({
                day: new Date(item.begin),
                secs: secs
            });

            previousDay = new Date(item.begin).getDay();

        }


    });

    returnn.dayList = dayLists;
    returnn.list = times;

    res.send(returnn).end();

});


networkDiscovery();

setTimeout(function() {
    log.add("NETWORKDISC FROM TIMEOUT");
    networkDiscovery();

}, 60 * 1000);