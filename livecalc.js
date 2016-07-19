/* livecalc.js */

var cookie = require('cookie');
var user_cache = require('./user_cache');
var sheet_counter = require('./sheet_counter');

var site_user_count = 0;

/* old globals */
var io, sheet_db, chat_db, stats, cache_user_model;

var namespaces = [];

module.exports = {};

module.exports.namespaces = namespaces;

/* Set socket.io et al. */
module.exports.set_globals = function (
    new_io,
    new_sheet_db,
    new_chat_db,
    new_stats,
    new_cache_user_model ){
    
    io = new_io;
    sheet_db = new_sheet_db;
    chat_db = new_chat_db;
    stats = new_stats;
    cache_user_model = new_cache_user_model;
};


/**
   Callback is supposed to render page
 */
module.exports.new_namespace = function(namespace){
    var nsp = io.of("/"+namespace);
    
    livecalc(namespace, nsp);
}

/**
   Sidebar chat 
   
   This is the code that listens to everything related to the chat.
 */
module.exports.livechat = livechat;
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
        if(user == undefined){
            return;
        }

        var data = {
            message: data.message,
            sender: user.get_username(),
            public_id: user.get_public_id(),
            date: new Date()
        };
        
        chat_db.add_message(namespace, data);
        
        socket.broadcast.emit("new message", data);
        socket.emit("own message", data);
    });

    return exports;
}

function system_chat_message(namespace, nsp, message){
    var data = {
        message: message,
        sender: "livecalc.xyz system",
        public_id: -1,
        date: new Date()
    };

    nsp.emit("new message", data);
    
    chat_db.add_message(namespace, data);
}

/*
  callback(success)
*/
module.exports.livecalc = livecalc;
function livecalc(namespace, nsp){
    var model = require("./sheet_model").create();
    var counter = sheet_counter.Counter();
    
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
            console.log("Someone tries to access namespace: "+namespace+
                        " but it does not exist. This should not happen.");
        }
    });
    
    function listen(){
        /*
         Array of users used to create focus index
         
         note: don't rely on a value being in there.
         
         for(i in users) == ok
         users[my_id] == not ok, don't do that!
         (it might not exist)
         
        */
        var users = {};
        
        nsp.on("connection", function(socket){
            var cookie_val = socket.handshake.headers['cookie'];
            var ip = socket.handshake.headers['x-forwarded-for'] || 
		socket.handshake.address;

            var session_id = cookie.parse(cookie_val || '').session_id || "";
            var registered = false;
            var user;
            var public_id;

            /**
               Helper function to get socket's username in this context
            */
            function get_username(){
                return users[session_id].username || "";
            }
            
            function temp_user(){
                // Temporary user
                user = cache_user_model.create();
                public_id = user.get_public_id();
                
                // Generate a temporary session id
                // (That will not be saved, even to redis)
                session_id = user.get_session_id();
                users[session_id] = user.get_public_data();
            }
            
            if(session_id != ""){
                // User says "im logged in"
                // See if the user is actually in redis
                cache_user_model.temp_exists(session_id, function(exists){
                    if(exists){
                        // User actually logged in
                        registered = true;
                        user = cache_user_model.cached_user(session_id);

                        // Fetch data
                        user.fetch(function(){
                            // Then update our data
                            public_id = user.get_public_id();
                            users[session_id] = user.get_public_data();
                            chat.set_user(user);
                            send_user_data();
                            
                            // Inform users
                            system_chat_message(
                                namespace,
                                nsp,
                                get_username() + " connected."
                            );
                        });
                    } else {
                        // User had a session_id, but it
                        // is not in db. (expired/never existed)
                        // TODO: inform user he is not connected.
                        console.log(
                            "Attempt to login with bad cookie token."
                        );
                        
                        temp_user();
                        
                        // Send temp data
                        send_user_data();
                    }
                });
            } else {
                // User is not logged in
                temp_user();
                // Still send temp data
                send_user_data();

                // Inform users
                system_chat_message(
                    namespace,
                    nsp,
                    get_username() + " connected."
                );
            }

            send_focus_index();
            
            // Rate limiting.
            // while registered users are not managed,
            // leave this to 5
            if(counter.get() >= 5){
                socket.emit("too many users");
                return;
            }

            stats.new_sheet_visit(namespace);

            stats.get_sheet_visits(namespace, function(num){
                nsp.emit("sheet visit count", num);
            });


            counter.plus("anon");
            site_user_count++;
            
            console.log(
                "connection    - " +
                    site_user_count +
                    " users in site, " +
                    counter.get("anon") +
                    " users in sheet " +
                    namespace +
                    " [ip: " +
                    ip +
                    "]"
            );

            nsp.emit("user count", counter.get("anon"));

            if(users[session_id] != undefined){
                users[session_id].focus = -1;
            }
            
            var chat = livechat(namespace, nsp, socket, user);
            
            /*
              Build array containing array of usernames
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
                        if(user.focus != undefined && user.focus != -1){
                            fi[user.focus].push(user.username);
                        }
                    }
                }
                nsp.emit("focus index", fi);
            }
            
            // Send sheet to user
            socket.emit("sheet", JSON.stringify(model.get_sheet()));
            
            function send_user_data(){
                socket.emit("user data", user.get_public_data());
            }
            
            socket.on("set focus",function(data){
                if(model.is_locked()){
                    return;
                }
                
                var index = data.index;
                users[session_id].focus = index;
                
                send_focus_index();
            });

            
            socket.on("lock sheet",function(data){
                // Don't lock demo
                if(namespace == "demo"){
                    return;
                }
                
                // Already locked?
                if(model.is_locked()){
                    return;
                }
                
                model.lock();
                save(true);
                
                send_focus_index();
                
                socket.emit("sheet locked", {
                    initiator: get_username()
                });
            });

            /*
              When a user submits a cell by pressing enter
              or "go", the model is updated and the info 
              is sent to other users, overwriting current value
              for all users.
             */
            socket.on("definitive edit", function(data){
                if(!model.is_locked()){
                    model.edit(data);
                    socket.broadcast.emit("definitive edit", data);
                    socket.emit("cell saved", data);
                    save();
                }
            });

            /*
              Live edits are not definitive
              They are just there to show what other users
              are typing
             */
            socket.on("live edit", function(data){
                if(!model.is_locked()){
                    socket.broadcast.emit("live edit", data);
                }
            });
            
            socket.on("insert cell", function(data){
                if(!model.is_locked()){
                    model.insert_cell(data);
                    socket.broadcast.emit("insert cell", data);
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
                counter.minus("anon");
                site_user_count--;

                system_chat_message(
                    namespace,
                    nsp,
                    get_username() + " disconnected."
                );

                console.log(
                    "disconnection - " +
                        site_user_count +
                        " users in site, " +
                        counter.get("anon") +
                        " users in sheet " +
                        namespace +
                        " [ip: " +
                        ip +
                        "]"
                );
                
                nsp.emit("user count", counter.get("anon"));
                
                if(registered){
                    // Save user in memory
                    user.save();
                }
                
                /*
                  Delete user from memory.

                  What if user is in 2 tabs: 
                  If the user is there 2 times in 2 tabs,
                  it will be recreated after the user sends back it's
                  focus. So there is no problem in deleting.
                  
                  This is necessary to avoid ending up with enormous
                  amounts of users in this array.
                 */
                delete users[session_id];
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
