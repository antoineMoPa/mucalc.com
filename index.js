var express = require("express");
var deepcopy = require("deepcopy");
var body_parser = require("body-parser");
var app = express();
var http = require("http").Server(app);
var io = require("socket.io")(http);

app.use(body_parser.json());

app.use(express.static('public'));

var namespaces = [];

app.get("/sheet/:id",function (req, res) {
    var sheet_id = req.params.id;

    if(namespaces.indexOf(sheet_id) <= -1){
	new_namespace(sheet_id);
    }
    
    res.sendFile(__dirname + "/public/index.html");
});

var default_sheet = {
    "title":"Empty",
    "cells":[
        ""
    ]
};

var test_sheet = deepcopy(default_sheet);

function new_namespace(namespace){
    var nsp = io.of("/"+namespace);
    
    console.log("new namespace : " + namespace);

    nsp.on("connection", function(socket){
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
	
	socket.on("disconnect",function(socket){
	    console.log("disconnection");
	});
    });
}

http.listen(3000);

/*
  Thank you, Stack Overflow:
  http://stackoverflow.com/questions/8855687/secure-random-token-in-node-jse
*/
function generate_token(){
    require('crypto').randomBytes(16, function(err, buffer) {
	var token = buffer.toString('hex');
	console.log(token);
    });
}
