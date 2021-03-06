var mongojs = require('mongojs'),
    express = require('express'),
    os = require('os'),
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
    md5 = require('MD5'),
    c = new Connection(),
    request = require("request"),
    icalendar = require("icalendar"),
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
    lightsLume = 0,
    bedState = 0,
    bedTime = 0,
    cpuLoad = 0,
    memLoad = 0,
    pirLock = 0,
    pirLastOn = 0,
    pirLastOff = 0;

if (typeof localStorage === "undefined" || localStorage === null) {
    var LocalStorage = require('node-localstorage').LocalStorage;
    localStorage = new LocalStorage('./scratch');
}

if (localStorage.getItem("clients") === null) {
    localStorage.setItem("clients", JSON.stringify({}));
}

if (localStorage.getItem("log") === null || localStorage.getItem("log") == "")
    localStorage.setItem("log", "[]");


if (localStorage.getItem("bedTime") === null)
    localStorage.setItem("bedTime", "0");

if (localStorage.getItem("bedState") === null)
    localStorage.setItem("bedState", "0");


Array.prototype.contains = function(k) {
    for (p in this)
        if (this[p] === k)
            return p;
    return -1;
}

function toHHMMSS(string) {
    var sec_num = parseInt(string, 10); // don't forget the second param
    var hours = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours < 10) {
        hours = "0" + hours;
    }
    if (minutes < 10) {
        minutes = "0" + minutes;
    }
    if (seconds < 10) {
        seconds = "0" + seconds;
    }
    var time = hours + ':' + minutes + ':' + seconds;
    return time;
}

var db = mongojs("server", ["swiches", "devices", "clients", "misc", "log", "deviceHis", "pir", "light", "temp", "bed", "sleep", "cpu", "switchHis", "history"]);

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
    sleep: db.collection('sleep'),
    cpu: db.collection('cpu'),
    switchHis: db.collection('switchHis'),
    history: db.collection('history'),
    deviceHis: db.collection('deviceHis')
};

homeDB.history.find(function(err, docs) {

    docs.forEach(function(item) {
        if (typeof item.start == "string" || typeof item.start == "string") {
            homeDB.history.update({
                _id: item._id
            }, {
                start: new Date(item.start).getTime(),
                end: new Date(item.end).getTime(),
                title: item.title,
                color: item.color,
                allDay: item.allDay,
                duration: item.duration
            }, {
                upsert: true
            });
        }
    });

});

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
            c = new Connection();
            c.connect(thisConfig.sshCred);
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
                state.ssh = false;

                io.sockets.emit('state', state);
                log.add("SSH CLOSE");
            });

            io.sockets.emit('state', state);
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

                    if (newState === 1) {
                        if (docs[0].lock === undefined || docs[0].lock === 0) {
                            homeDB.switches.update({
                                id: docs[0].id
                            }, {
                                $set: {
                                    lastOn: new Date().getTime(),
                                    lock: 1
                                }
                            });
                        }
                    } else {
                        homeDB.switches.update({
                            id: docs[0].id
                        }, {
                            $set: {
                                lastOff: new Date().getTime(),
                                lock: 0
                            }
                        });

                        homeDB.switches.findOne({
                            id: docs[0].id
                        }, function(err, s) {
                            console.log("INTO HISTORY", s.lastOn, s.lastOff);
                            if (s.lastOn !== undefined)
                                homeDB.history.save({
                                    title: s.name,
                                    color: "#FF9900",
                                    start: s.lastOn,
                                    end: new Date().getTime(),
                                    allDay: false,
                                    duration: new Date().getTime() - s.lastOn
                                });
                        });

                    }


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
                        homeDB.switchHis.save({
                            time: new Date().getTime(),
                            switchID: id,
                            state: newState,
                            name: docs[0].name
                        });
                    });









                    log.add("EXEC COMMAND SUCCESS");
                });

            });
        }
    });
}


app.get('/switches', function(req, res) {

    res.send(JSON.stringify(switches)).end();


});
app.get('/api/temps/:min/', function(req, res) {



    homeDB.temp.find({
        time: {
            $gt: parseInt(req.params.min)
        }
    }, function(err, temps) {

        var parseTemps = [];

        var prevHour = -1;

        var hourArray = [];
        temps.forEach(function(item) {
            var thisTemp = parseFloat(item.temp);
            var thisHour = new Date(item.time).getHours();
            if (item.time > (new Date().getTime() - (1000 * 60 * 60 * 96))) {
                if (thisHour != prevHour) {

                    prevHour = thisHour;


                    if (hourArray.length > 0) {
                        var teller = 0;
                        var sum = 0;
                        hourArray.forEach(function(itemm) {
                            sum = sum + itemm;
                            teller++;
                        });

                        var adjDate = new Date(item.time).setMinutes(0);

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
});
app.get('/api/sleep', function(req, res) {
    homeDB.sleep.find().sort({
        begin: -1
    }, function(err, docs) {
        res.send(docs).end();


    });
});

app.get('/api/lights/:min/', function(req, res) {

    homeDB.light.find({
        time: {
            $gt: parseInt(req.params.min)
        }
    }, function(err, docs) {


        var parseLights = [];

        var prevHour = -1;

        var hourArray = [];

        docs.forEach(function(item) {
            var thisLight = item.light;
            var thisHour = new Date(item.time).getHours();

            if (item.time > (new Date().getTime() - (1000 * 60 * 60 * 96))) {

                if (thisHour != prevHour) {

                    prevHour = thisHour;


                    if (hourArray.length > 0) {
                        var teller = 0;
                        var sum = 0;
                        hourArray.forEach(function(itemm) {
                            sum = sum + itemm;
                            teller++;
                        });

                        var adjDate = new Date(item.time).setMinutes(0);

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
    homeDB.deviceHis.find().sort({
        time: -1
    }, function(err, docs) {
        docs.forEach(function(doc) {

            if (deviceHisArray[doc.name] === undefined) {
                deviceHisArray[doc.name] = {
                    name: doc.name,
                    data: []
                }
            }
            deviceHisArray[doc.name].data.push([doc.time, doc.state]);
        });
        console.log("deviceHisArray:", deviceHisArray);

        for (key in deviceHisArray) {
            console.log("KEY:", key);
            ret.push({
                label: "Device History " + key,
                data: deviceHisArray[key].data
            });
        }

        deviceHisArray.forEach(function(item) {
            console.log("deviceHisArray:item:", item);

        });

        homeDB.pir.find(function(err, pir) {

            var pirData = [];
            pir.forEach(function(item) {
                if (item.time > (new Date().getTime() - (1000 * 60 * 60 * 96)))
                    pirData.push([item.time, item.pir]);

            });

            ret.push({
                label: "PIR history",
                data: pirData,
                color: "#FFFFFF"
            });

            homeDB.bed.find().sort({
                time: -1
            }, function(err, bed) {

                var bedData = [];
                bed.forEach(function(item) {
                    if (item.time > (new Date().getTime() - (1000 * 60 * 60 * 96)))
                        bedData.push([item.time, item.bed]);

                });

                ret.push({
                    label: "BED history",
                    data: bedData,
                    color: "#FF0000"
                });


                res.send(ret).end();
            });



        });
    });

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


var lastTimeTemp = "a";

app.get('/temp/:t', function(req, res) {
    var time = new Date().getTime();
    var newTemp = parseFloat(req.params.t);
    log.add("SET TEMP WARNING TIMEOUT");
    if (lastTimeTemp != "a") {
        log.add("RESET TEMP WARNING TIMEOUT");
        clearTimeout(lastTimeTemp);
    }
    log.add("INIT TEMP WARNING TIMEOUT");
    lastTimeTemp = setTimeout(function() {
        log.add("ERROR! AL 30 MIN GEEN TEMPRATUUR ONTVANGEN!!!", true);
    }, 1000 * 60 * 30);

    res.send(JSON.stringify(newTemp)).end();

    var Dtemp = temp - newTemp;


    if (req.params.t != temp) {

        temp = newTemp;

        log.add("TEMPRATUUR UPDATE: " + temp);
        io.sockets.emit('temp', temp);
    }

    homeDB.temp.save({
        time: time,
        temp: newTemp
    });
});
var persistState = 0;
var timeSwitch = 0;
var timeOutFunction = "a";
var lastOffTime = 0;
app.get('/pir/:a/:b', function(req, res) {

    //log.add("PIR! " + req.params.b);

    var time = new Date().getTime();

    if (req.params.b == 1) {
        homeDB.pir.save({
            time: time,
            pir: "1"
        });

        if (pirLock === 0) {
            pirLastOn = time;
            pirLock = 1;
        }

    } else if (req.params.b == 0) {

        //log.add("PIR 0, diffTime:" + ((lastOffTime + (1000 * 60 * 5)) - time));
        if ((lastOffTime + (1000 * 60 * 5)) < time) {
            lastOffTime = time;
            pirLastOff = time;
            pirLock = 0;
            homeDB.pir.save({
                time: time,
                pir: "0"
            });
            console.log("INTO HISTORY", pirLastOn, pirLastOn);
            if (pirLastOn !== 0)
                homeDB.history.save({
                    title: "PIR",
                    color: "#FFFF66",
                    start: pirLastOn,
                    end: time,
                    allDay: false,
                    duration: time - pirLastOn
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
var timeOut = "a";

app.get('/bed/:bed/', function(req, res) {
    data = req.params.bed;
    var time = new Date().getTime();

    homeDB.bed.save({
        time: time,
        bed: data
    });

    if (data == "1") {
        if (timeOut == "a" && bedState !== 2) {
            bedTime = time;
            bedState = 2;
            io.sockets.emit('sleepStatus', {
                "bedTime": bedTime,
                "status": 2
            });
            log.add("Slapen beginnen", false);
        } else {
            bedState = 2;
            io.sockets.emit('sleepStatus', {
                "bedTime": bedTime,
                "status": 2
            });
            log.add("Slapen hervatten", false);

            clearTimeout(timeOut);
            timeOut = "a";
        }

    } else {
        sleepedTime = time - bedTime;


        if (timeOut == "a") {
            bedState = 1;
            io.sockets.emit('sleepStatus', {
                "bedTime": bedTime,
                "status": 1
            });
            log.add("Slapen wachten op 10 minuten", false);
            timeOut = setTimeout(function() {
                timeOut = "a";
                bedState = 0;
                io.sockets.emit('sleepStatus', {
                    "bedTime": bedTime,
                    "status": 0
                });
                log.add("Tijd geslapen: " + toHHMMSS(sleepedTime / 1000), true);

                homeDB.sleep.save({
                    begin: bedTime,
                    end: time
                });

            }, 1000 * 60 * 10);
        } else {

            clearTimeout(timeOut);
            timeOut = "a";
        }

    }
    res.send(JSON.stringify(req.params.bed)).end();
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
    socket.emit('cpu', cpuLoad);
    socket.emit("mem", memLoad);

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
    homeDB.log.find().sort({
        time: -1
    }).limit(100, function(err, docs) {
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


    socket.emit('sleepStatus', {
        "bedTime": bedTime,
        "status": bedState
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
                            childd = exec("cd /var/www/pi/raspberrypi/node && forever restart server.js", function(error, stdout, stderr) {});
                        }, 10000);
                    } else {
                        log.add("No updated to: " + newVersion + ", same version");
                        setTimeout(function() {
                            childd = exec("cd /var/www/pi/raspberrypi/node && forever restart server.js", function(error, stdout, stderr) {});
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



cConnect();




var itemDisc = {};

function networkDiscovery() {
    var i = 0;
    log.add("NETWORKDISC EXEC");
    var pingSession = ping.createSession();

    homeDB.devices.find(function(err, docs) {

        docs.forEach(function(item) {

            var self = this;

            //console.log(item);

            pingSession.pingHost(item.ip, function(error, target) {
                var time = new Date().getTime();
                if (error) {
                    var thisState = 0;
                } else {
                    var thisState = 1;
                }

                if (itemDisc[item.name] === undefined)
                    itemDisc[item.name] = -1;

                if (thisState != item.state) {

                    /*if (newState === 1) {
                        if (docs[0].lock === undefined || docs[0].lock === 0) {
                            homeDB.switches.update({
                                id: docs[0].id
                            }, {
                                $set: {
                                    lastOn: new Date().getTime(),
                                    lock: 1
                                }
                            });
                        }
                    } else {
                        homeDB.switches.update({
                            id: docs[0].id
                        }, {
                            $set: {
                                lastOff: new Date().getTime(),
                                lock: 0
                            }
                        });

                        homeDB.switches.findOne({
                            id: docs[0].id
                        }, function(err, s) {
                            console.log("INTO HISTORY", s.lastOn, s.lastOff);
                            homeDB.history.save({
                                title: s.name,
                                color: "#FF9900",
                                start: new Date(s.lastOn).toISOString(),
                                end: new Date(s.lastOff).toISOString(),
                                allDay: false,
                                duration: s.lastOff - s.lastOn
                            });
                        });

                    }*/




                    var evalExecute = true;
                    /*
                    if (itemDisc[item.name])
                        evalExecute = false

                    itemDisc[item.name] = thisState;
                    */


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

                    if (thisState === 1) {
                        log.add("NETWORKDISC " + item.name + " came online");
                        if (item.lock === undefined || item.lock === 0) {
                            homeDB.devices.update({
                                id: item.id
                            }, {
                                $set: {
                                    lastOn: new Date().getTime(),
                                    lock: 1
                                }
                            });
                        }
                        homeDB.deviceHis.save({
                            name: item.name,
                            time: time,
                            state: "1"
                        });

                        homeDB.devices.update({
                            id: item.id
                        }, {
                            $set: {
                                lastUp: time
                            }
                        }, function(err, docs) {
                            console.log("update DEVICE", err, docs);
                        });



                        if (item.onSwitchOn !== undefined) {
                            if (evalExecute)
                                eval(item.onSwitchOn);
                            log.add("AUTOCOMMAND ON " + item.name, true);
                        }
                    }
                    if (thisState === 0) {
                        log.add("NETWORKDISC " + item.name + " went offline");

                        homeDB.devices.update({
                            id: item.id
                        }, {
                            $set: {
                                lastOff: new Date().getTime(),
                                lock: 0
                            }
                        });

                        homeDB.deviceHis.save({
                            name: item.name,
                            time: time,
                            state: "0"
                        });
                        homeDB.devices.update({
                            id: item.id
                        }, {
                            $set: {
                                lastDown: time
                            }
                        }, function(err, docs) {
                            console.log("update DEVICE", err, docs);
                        });

                        homeDB.devices.findOne({
                            id: item.id
                        }, function(err, s) {
                            console.log("INTO HISTORY", s.lastOn, s.lastOff);
                            if (s.lastOn !== undefined)
                                homeDB.history.save({
                                    title: s.name,
                                    color: s.color,
                                    start: s.lastOn,
                                    end: time,
                                    allDay: false,
                                    duration: time - s.lastOn
                                });
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
app.get('/api/cpu/:min/', function(req, res) {
    cpu = [];
    mem = [];
    returnN = [];
    homeDB.cpu.find({
        time: {
            $gt: parseInt(req.params.min)
        }
    }, function(err, docs) {
        docs.forEach(function(item) {
            cpu.push([item.time, item.cpu]);
            mem.push([item.time, item.mem]);
        });
        returnN.push({
            label: "CPU",
            data: cpu,
            color: "#FF0000"
        });
        returnN.push({
            label: "MEM",
            data: mem,
            color: "#FFFF00",
            yaxis: 2
        });
        res.send(returnN).end();
    });


});
app.get('/agenda/', function(req, res) {
    var minDuration = 1000000;
    homeDB.history.find({
        start: {
            $gt: (parseInt(req.query.start) * 1000) - (1000 * 60 * 60 * 5)
        },
        end: {
            $lt: (parseInt(req.query.end) * 1000) + (1000 * 60 * 60 * 5)
        }
    }, function(err, docs) {
        homeDB.sleep.find({
            begin: {
                $gt: (parseInt(req.query.start) * 1000) - (1000 * 60 * 60 * 5)
            },
            end: {
                $lt: (parseInt(req.query.end) * 1000) + (1000 * 60 * 60 * 5)
            }
        }, function(err, sleeps) {
            var t = 0;

            var returnN = [];
            var previousStarts = [];
            var previousEnds = [];
            docs.forEach(function(item) {
                item.id = t;
                positionOfElement = previousStarts.contains(item.start);
                if (positionOfElement > -1) {

                    if (previousEnds[positionOfElement] < item.end) {

                        previousEnds[positionOfElement] = item.end;
                        returnN[positionOfElement].end = new Date(new Date(item.end).getTime() + (1000 * 60 * 60 * 2)).toISOString();

                    }

                } else {



                    if (item.duration > minDuration) {
                        previousStarts.push(item.start);
                        previousEnds.push(item.end);
                        item.start = new Date(new Date(item.start).getTime() + (1000 * 60 * 60 * 2)).toISOString();
                        item.end = new Date(new Date(item.end).getTime() + (1000 * 60 * 60 * 2)).toISOString();
                        returnN.push(item);
                    }
                }


                t++;
            });
            sleeps.forEach(function(sleep) {
                returnN.push({
                    id: t,
                    title: "bed",
                    color: "#663300",
                    start: new Date(parseInt(sleep.begin) + (1000 * 60 * 60 * 2)).toISOString(),
                    end: new Date(parseInt(sleep.end) + (1000 * 60 * 60 * 2)).toISOString(),
                    allDay: false,
                    duration: sleep.end - sleep.begin
                });
                t++;
            });

            res.send(returnN).end();
        });
    });
});

app.get('/agenda/cal/', function(req, res) {
    var minDuration = 1000000;
    homeDB.history.find().sort({
        _id: 1
    }).limit(50, function(err, docs) {
        homeDB.sleep.find().sort({
            _id: 1
        }).limit(50, function(err, sleeps) {
            var t = 0;

            var returnN = [];
            var event = {};
            var ical = new icalendar.iCalendar();

            var previousStarts = [];
            var previousEnds = [];

            docs.forEach(function(item) {
                item.id = t;
                positionOfElement = previousStarts.contains(item.start);
                if (positionOfElement > -1) {
                    console.log("Already contains");
                    console.log(previousEnds[positionOfElement]);
                    if (previousEnds[positionOfElement] < item.end && previousEnds[positionOfElement] !== undefined && returnN[positionOfElement] !== undefined) {

                        previousEnds[positionOfElement] = item.end;
                        returnN[positionOfElement].end = new Date(new Date(item.end).getTime() + (1000 * 60 * 60 * 2)).toISOString();

                    }
                } else {
                    if (item.duration > minDuration) {
                        previousStarts.push(item.start);
                        previousEnds.push(item.end);
                        item.start = new Date(new Date(item.start).getTime()).toISOString();
                        item.end = new Date(new Date(item.end).getTime()).toISOString();
                        event[t] = new icalendar.VEvent(md5(JSON.stringify(item)));
                        event[t].setSummary(item.title);
                        event[t].setDate(new Date(item.start), new Date(item.end));
                        event[t].toString();
                    }
                }





                t++;
            });
            sleeps.forEach(function(sleep) {
                returnN.push({
                    id: t,
                    title: "bed",
                    color: "#663300",
                    start: new Date(parseInt(sleep.begin)).toISOString(),
                    end: new Date(parseInt(sleep.end)).toISOString(),
                    allDay: false,
                    duration: sleep.end - sleep.begin
                });
                event[t] = new icalendar.VEvent(md5(JSON.stringify(sleep)));
                event[t].setSummary("Bed");
                event[t].setDate(new Date(parseInt(sleep.begin)), new Date(parseInt(sleep.end)));
                event[t].toString();
                t++;
            });

            for (i in event) {
                ical.addComponent(event[i]);
            }
            res.setHeader("Content-type", "text/calendar");

            res.send(ical.toString()).end();
        });
    });
});

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

function cpuLoadFN() {
    var load = os.loadavg();
    loadAVG = load[0];
    console.log("LOAD", loadAVG);
    log.add("CPU LOAD:" + loadAVG);

    var memAVG = (os.totalmem() - os.freemem()) / os.totalmem();

    homeDB.cpu.save({
        time: new Date().getTime(),
        cpu: loadAVG,
        mem: memAVG
    });
    cpuLoad = loadAVG;
    memLoad = memAVG;
    io.sockets.emit("cpu", loadAVG);
    io.sockets.emit("mem", memAVG);
}
cpuLoadFN();
networkDiscovery();

setInterval(function() {
    log.add("NETWORKDISC FROM TIMEOUT");
    networkDiscovery();
    log.add("CPU LOAD");
    if (!state.ssh) {
        log.add("SSH CONNECT FROM TIMEOUT");
        cConnect();
    }
    cpuLoadFN();
}, 60 * 1000);