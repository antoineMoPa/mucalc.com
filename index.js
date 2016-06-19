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

var sheet_model = function(){
    var sheet = deepcopy(default_sheet);

    function edit(data){
	var number = parseInt(data.number);
	var content = data.content;

	if(number >= 0){
	    sheet.cells[number] = content;
	}
    }
    
    function remove(data){
	var number = data.number;
	
	if(number > 0 && number < sheet.cells.length){
	    sheet.cells.splice(number, 1);
	}
    }

    function get_sheet(){
	return sheet;
    }
    
    var exports = {
	get_sheet: get_sheet,
	edit: edit,
	remove: remove
    };
    
    return exports;
};

function new_namespace(namespace){
    var nsp = io.of("/"+namespace);
    var model = sheet_model();

    console.log("new namespace : " + namespace);
    namespaces.push(namespace);
    
    nsp.on("connection", function(socket){
	console.log("connection");
	
	// Send sheet to user
	socket.emit("sheet", JSON.stringify(model.get_sheet()));
	
	socket.on("edit cell", function(data){
	    console.log("edition");
	    model.edit(data);
	    socket.broadcast.emit("edit cell", data);
	});
	
	socket.on("delete cell", function(data){
	    console.log("deletion");
	    model.remove(data);
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
