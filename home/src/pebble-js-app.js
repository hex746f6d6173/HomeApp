 Pebble.addEventListener("ready",
     function(e) {
         Pebble.addEventListener("getSwitches",
             function(e) {
                 var req = new XMLHttpRequest();
                 req.open('GET', 'http://home.tomasharkema.nl/switches', true);
                 req.onload = function(e) {
                     if (req.readyState == 4 && req.status == 200) {
                         if (req.status == 200) {
                             var response = JSON.parse(req.responseText);
                             Pebble.sendAppMessage({
                                 switches: response
                             });
                         } else {
                             console.log("Error");
                         }
                     }
                 }
                 req.send(null);

             }
         );

         Pebble.addEventListener("setSwitch",
             function(e) {
                 console.log("Received message: " + e.payload);
             }
         );



     }
 );