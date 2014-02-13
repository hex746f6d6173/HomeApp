var red = "red",
    green = "rgb(27,242,0)",
    orange = "orange";
$(document).ready(function() {

    var socket = io.connect('http://' + window.location.hostname);

    socket.on('connect', function() {

        $(".connection").html('<i class="glyphicon glyphicon-ok" style="color:' + green + ';"></i>');

        if (localStorage.me === undefined || localStorage.me === "") {

            var name = prompt("Geef mij een naam");
            localStorage.me = name;
            socket.emit("me", name);

        } else {
            socket.emit("me", localStorage.me);
        }

    });

    socket.on('connecting', function() {

        $(".connection").html('<i class="glyphicon glyphicon-minus"></i>');
        $(".ssh").html('');
    });

    socket.on('connect_failed', function() {

        $(".connection").html('<i class="glyphicon glyphicon-remove" style="color:' + red + ';"></i>');
        $(".ssh").html('');
    });

    socket.on('disconnect', function() {

        $(".connection").html('<i class="glyphicon glyphicon-remove" style="color:' + red + ';"></i>');
        $(".ssh").html('');
    });


    socket.on('switches', function(data) {
        var html = "<div class=\"row\">";
        $.each(data, function(x, y) {
            var color = red;
            if (y.state === 1) {
                color = green;
            }

            html += '<div class="col-md-3"><a class="switch well" id="switch-' + x + '" style="background:' + color + '"><h3><span class="' + y.icon + '"></span> ' + y.name + '</h3></a></div>';
        });

        $(".switches").html(html + "</div>");

        $(".switch").each(function() {
            $(this).click(function(e) {
                e.preventDefault();
                $(this).css({
                    "background": orange
                });
                socket.emit("switch", {
                    id: $(this).attr("id").replace("switch-", "")
                });
            });
        });



    });

    socket.on("clients", function(data) {
        data = JSON.parse(data);
        console.log(data);

        var html = "";
        $.each(data, function(x, y) {
            var color = red;
            if (y === true) {
                color = green;
            }
            if (x != "")
                html += '<span class="device well" id="device-' + x + '" style="background:' + color + '">' + x + '</span>';
        });

        $(".clients").html(html);

    });

    socket.on("devices", function(data) {
        console.log(data);

        var html = "";
        $.each(data, function(x, y) {
            var color = red;
            if (y.state === 1) {
                color = green;
            }

            html += '<span class="device well" id="device-' + x + '" style="background:' + color + '"><span class="' + y.icon + '"></span> ' + y.name + '</span>';
        });

        $(".devices").html(html);

    });

    socket.on("deviceChange", function(data) {
        console.log(data);
        var color = red;
        if (data.state === 1) {
            color = green;
        }

        $("#device-" + data.id).css({
            "background": color
        });
    });

    socket.on("switched", function(data) {

        var color = red;
        if (data.
            switch.state === 1) {
            color = green;
        }

        $("#switch-" + data.id).css({
            "background": color
        });

    });

    socket.on("log", function(data) {
        console.log("LOG", data);

        var log = "";
        var i = 0;

        $.each(data, function(x, y) {
            if (i < 50) {
                log += '<p class="l">' + y.time + ': ' + y.action + '</p>';
            }
            i++;
        });

        $(".log").html(log);

    });

    socket.on("state", function(data) {

        if (data.ssh) {

            $(".ssh").html('<i class="glyphicon glyphicon-ok" style="color:' + green + ';"></i>');

        } else {
            $(".ssh").html('<i class="glyphicon glyphicon-remove" style="color:' + red + ';"></i>');
        }

    });

});