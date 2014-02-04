var express = require('express');
var app = express();

app.use(express.static(__dirname + '/public'));

app.get('/switch/:brand/:code/:switch/:switchTo/', function(req, res){
  res.send('hello world');
  console.log(req);
});

app.listen(4000);