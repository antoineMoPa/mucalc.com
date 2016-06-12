var express = require("express");

var app = express();

app.use(express.static('public'));

app.get('/', function (req, res) {
    res.send('GET request to the homepage');
});

app.listen(3000);
