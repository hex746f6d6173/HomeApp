var express = require('express');
var app = express();

app.use(express.static(__dirname + '/public'));

var flipSwitch = function(req, res){

	console.log(req);

}

app.get('/switch/:brand/:code/:switch/:switchTo/', flipSwitch, function(req, res){

});

app.listen(4000);