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

app.get("/new",function (req, res) {
    res.redirect("/sheet/"+generate_token());
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

	var len = sheet.cells.length;
	if((number > 0 || len > 1) && number < len){
	    sheet.cells.splice(number, 1);
	}
    }

    function get_sheet(){
	return sheet;
    }

    function get_length(){
	return sheet.cells.length + 1;
    }
    
    var exports = {
	get_sheet: get_sheet,
	edit: edit,
	remove: remove,
	get_length: get_length
    };
    
    return exports;
};

function new_namespace(namespace){
    var nsp = io.of("/"+namespace);
    var model = sheet_model();

    console.log("new namespace : " + namespace);
    namespaces.push(namespace);

    var users = {};
    
    nsp.on("connection", function(socket){
	console.log("connection");
	var user_id = generate_token(6);

	users[user_id] = {focus:-1};

	/*
	  Build array containing array of nicknames
	  of user focussing on each cell
	  
	  [
	  ["Paul","Anonymous"],
	  [],
	  ["George"]
	  ]
	  
	  Goal: show the users who's editing what.
	  
	 */
	function send_focus_index(){
	    var fi = [];
	    
	    for(var i = 0; i < model.get_length(); i++){
		fi.push([]);
	    }

	    for(var i in users){
		var user = users[i];
		if(user.focus != -1){
		    fi[user.focus].push(user.nickname);
		}
	    }

	    nsp.emit("focus index", fi);
	}
	
	// Send sheet to user
	socket.emit("sheet", JSON.stringify(model.get_sheet()));
	
	socket.on("set nickname",function(data){
	    users[user_id].nickname = data.nickname;
	    send_focus_index();
	});
	
	socket.on("set focus",function(data){
	    var index = data.index;
	    users[user_id].focus = index;

	    send_focus_index();
	});
	
	socket.on("edit cell", function(data){
	    console.log("edition");
	    model.edit(data);
	    socket.broadcast.emit("edit cell", data);
	});
	
	socket.on("delete cell", function(data){
	    model.remove(data);
	    socket.broadcast.emit("delete cell", data);
	});
	
	socket.on("disconnect",function(socket){
	    console.log("disconnection");
	    delete users[user_id];
	    send_focus_index();
	});
    });
}

http.listen(3000);

/*
  Thank you, Stack Overflow:
  http://stackoverflow.com/questions/8855687/secure-random-token-in-node-jse
*/
function generate_token(num){
    var num = num || 10;
    return require('crypto').randomBytes(num).toString('hex');
}
