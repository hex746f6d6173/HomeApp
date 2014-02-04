var express = require('express');
var app = express();

app.get('/switch/:brand/:code/:switch/:switchTo/', function(req, res){
  res.send('hello world');
  console.log(req, res);
});

app.listen(4000);