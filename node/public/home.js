var red = "red",
    green = "rgb(27,242,0)",
    orange = "orange";
$(document).ready(function() {

    var socket = io.connect('http://' + window.location.hostname);

    socket.on('connect', function() {

        $(".connection").html('<i class="glyphicon glyphicon-ok" style="color:' + green + ';"></i>');

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
        var html = "";
        $.each(data, function(x, y) {
            var color = red;
            if (y.state === 1) {
                color = green;
            }

            html += '<a class="switch well" id="switch-' + x + '" style="background:' + color + '"><h1><span class="' + y.icon + '"></span> ' + y.name + '</h1></a>';
        });

        $(".switches").html(html);

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


    socket.on("state", function(data) {

        if (data.ssh) {

            $(".ssh").html('<i class="glyphicon glyphicon-ok" style="color:' + green + ';"></i>');

        } else {
            $(".ssh").html('<i class="glyphicon glyphicon-remove" style="color:' + red + ';"></i>');
        }

    });

});