var express = require("express");
var deepcopy = require("deepcopy");
var body_parser = require("body-parser");
var app = express();
var http = require("http").Server(app);
var io = require("socket.io")(http);


app.use(body_parser.json());

// Serve public files
app.use(express.static('public'));

// Homepage
app.get('/', function (req, res) {
    res.send('GET home');
});

var default_sheet = {
    "title":"Empty",
    "cells":[
        ""
    ]
};

var test_sheet = deepcopy(default_sheet);

io.on("connection", function(socket){
    var sheet = test_sheet;
    console.log("connection");

    // Send sheet to user
    socket.emit("sheet", JSON.stringify(sheet));
    
    socket.on("edit cell", function(data){
	console.log("edition");
	socket.broadcast.emit("edit cell", data);
    });

    socket.on("delete cell", function(data){
	console.log("deletion");
	socket.broadcast.emit("delete cell", data);
    });

    
    io.on("disconnect",function(socket){
	console.log("disconnection");
    });
});

http.listen(3000);
