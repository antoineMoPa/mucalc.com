var express = require("express");
var body_parser = require("body-parser");
var app = express();
var http = require("http").Server(app);
var io = require("socket.io")(http);
var sheet_db = require("./sheet_db");
var user_model = require("./user_model");
var chat_db = require("./chat_db");
var stats = require("./stats");

app.use(body_parser.json());

// Serve static files
app.use(express.static('public'));

app.locals.pretty = true;

// Views
app.set('views', './views')
app.set('view engine', 'pug');

var namespaces = [];

app.get('/', function (req, res) {
    res.render('base',{landing:true});
});

app.get("/sheet/:id",function (req, res) {
    var sheet_id = req.params.id;

    // See if namespace is already in memory
    if(namespaces.indexOf(sheet_id) <= -1){
        new_namespace(sheet_id);
    }

    res.render('base');
});

app.get("/copy/:id",function (req, res) {
    var sheet_id = req.params.id;
    var new_id = require("./tokens").generate_token();
    
    sheet_db.get_sheet(sheet_id, function(data){
        data.params.locked = false;
        sheet_db.store_sheet(new_id, data);
        res.redirect("/sheet/"+new_id);
    });
});

app.get("/new",function (req, res) {
    res.redirect("/sheet/"+(require("./tokens").generate_token()));
});

function new_namespace(namespace){
    var nsp = io.of("/"+namespace);
    
    livecalc(namespace, nsp);
    
}

/* Sidebar chat */
function livechat(namespace, nsp, socket, user){
    var user;
    
    var exports = {};

    exports.set_user = function(new_user){
        user = new_user;
    };
    
    socket.on("load more messages",function(last_sent){
        chat_db.get_conv(namespace,function(data){
            socket.emit("past messages", data);
        });
    });
    
    socket.on("new message", function(data){
        var data = {
            message: data.message,
            sender: user.get_nickname(),
            user_id: user.get_id()
        };

        chat_db.add_message(namespace, data);
        
        socket.broadcast.emit("new message", data);
        socket.emit("own message", data);
    });

    return exports;
}

function livecalc(namespace, nsp){
    var model = require("./sheet_model").create();
    var user_count = 0;
    stats.new_sheet();

    namespaces.push(namespace);

    // Check if sheet exists
    // Then load it and serve normally
    sheet_db.exists(namespace, function(exists){
        if(exists){
            sheet_db.get_sheet(namespace, function(data){
                model.set_sheet(data);
                listen();
            })
        } else {
            listen();
        }
    });
    
    function listen(){
        var users = {};
        
        nsp.on("connection", function(socket){
            // rate limiting
            if(user_count >= 3){
                socket.emit("too many users");
                return;
            }
            
            user_count++;
            console.log("connection - " + user_count + " users");
            nsp.emit("user count", user_count);

            // Temporary user
            // Will be saved at disconnection
            // To keep nickname and other info
            // Will be changed immediatly with socket.io
            // if the browser already contains a user_id
            // in localStorage
            var user = user_model.create();
            var user_id = user.get_id();
            
            users[user_id] = {focus:-1};
            
            var chat = livechat(namespace, nsp, socket, user);
            
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
                
                if(!model.is_locked()){
                    for(var i in users){
                        var user = users[i];
                        if(user == undefined){
                            continue;
                        }
                        if( user.focus != -1 ){
                            fi[user.focus].push(user.nickname);
                        }
                    }
                }
                nsp.emit("focus index", fi);
            }
            
            // Send sheet to user
            socket.emit("sheet", JSON.stringify(model.get_sheet()));
            
            socket.on("set nickname",function(data){
                // Prevent XSS
                var nickname = data.nickname.replace(/[^A-Za-z0-9\-]/g,"");
                users[user_id].nickname = nickname;
                user.set_nickname(nickname);
                // At this point, we can store in db
                user.save();
                send_focus_index();
            });

            // When browser asks user id
            socket.on("give user id",function(){
                // We send it
                send_user_id()
            });

            // When browser already has a user id
            socket.on("user id",function(data){
                var new_id = data.user_id;
                var old_id = user.get_id();
                
                user_model.exists(new_id, function(exists){
                    if(exists){
                        // This ID is effectively in database
                        // Todo: prevent session hijacking
                        // with tokens or something
                        // (everybody can se user ids now)
                        // Not a priority now because it does not
                        // give access to anything
                        user = user_model.User(new_id);
                        
                        user.fetch(function(){
                            user_id = user.get_id();
                            users[user_id] = user.get_public_data();
                            chat.set_user(user);
                            send_user_data();

                            // Delete old temp user in memory
                            if(new_id != old_id){
                                delete users[old_id];
                            }
                        });
                    } else {
                        // Nope, we don't have this id
                        // Here is your new one
                        send_user_id();
                    }
                });
                
                
            });

            function send_user_id(){
                socket.emit("user id",{
                    user_id: user_id
                });
            }
            
            function send_user_data(){
                socket.emit("user data", {
                    nickname: user.get_nickname()
                });
            }
            
            socket.on("set focus",function(data){
                if(model.is_locked()){
                    return;
                }
                
                var index = data.index;
                users[user_id].focus = index;
                
                send_focus_index();
            });

            
            socket.on("lock sheet",function(data){
                // Already locked?
                if(model.is_locked()){
                    return;
                }
                
                model.lock();
                save(true);
                
                send_focus_index();
                
                socket.emit("sheet locked", {
                    initiator: users[user_id].nickname
                });
            });
            
            socket.on("edit cell", function(data){
                if(!model.is_locked()){
                    model.edit(data);
                    socket.broadcast.emit("edit cell", data);
                    save();
                }
            });
            
            socket.on("delete cell", function(data){
                if(!model.is_locked()){
                    model.remove(data);

                    save();
                    socket.broadcast.emit("delete cell", data);
                }
            });
            
            socket.on("disconnect",function(socket){
                console.log("disconnection");
                user_count--;
                nsp.emit("user count", user_count);
                // Save user in memory
                user.save();
                
                // Delete user from memory
                delete users[user_id];
                send_focus_index();
            });
        });

        function save(even_if_locked){
            var even_if_locked = even_if_locked || false;
            if(!model.is_locked() || even_if_locked){
                sheet_db.store_sheet(namespace, model.get_sheet());
            }
        }
    }
}

http.listen(3000);
