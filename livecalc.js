/* livecalc.js */

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
        var data = {
            message: data.message,
            sender: user.get_nickname(),
            public_id: user.get_id()
        };

        chat_db.add_message(namespace, data);
        
        socket.broadcast.emit("new message", data);
        socket.emit("own message", data);
    });

    return exports;
}

/*
  callback(success)
*/
module.exports.livecalc = livecalc;
function livecalc(namespace, nsp){
    var model = require("./sheet_model").create();
    var sheet_user_count = 0;

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
        var users = {};
        
        nsp.on("connection", function(socket){
            // rate limiting
            if(sheet_user_count >= 3){
                socket.emit("too many users");
                return;
            }

            stats.new_sheet_visit(namespace);

            stats.get_sheet_visits(namespace, function(num){
                nsp.emit("sheet visit count", num);
            });
            
            sheet_user_count++;
            site_user_count++;
            
            console.log(
                "connection - " +
                    site_user_count +
                    " users in site, " +
                    sheet_user_count +
                    " users in sheet " +
                    namespace
            );

            nsp.emit("user count", sheet_user_count);

            // Temporary user
            // Will be saved at disconnection
            // To keep nickname and other info
            var user = cache_user_model.create();
            var public_id = user.get_id();
            
            users[public_id] = {focus:-1};
            
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
                users[public_id].nickname = nickname;
                user.set_nickname(nickname);
                // At this point, we can store in db
                user.save();
                send_focus_index();
            });

            // Send public user id
            socket.emit("user id",{
                public_id: public_id
            });
            
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
                users[public_id].focus = index;
                
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
                    initiator: users[public_id].nickname
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
                sheet_user_count--;
                site_user_count--;

                console.log(
                    "disconnection - " +
                        site_user_count +
                        " users in site, " +
                        sheet_user_count +
                        " users in sheet " +
                        namespace
                );
                
                nsp.emit("user count", sheet_user_count);
                // Save user in memory
                user.save();
                
                // Delete user from memory
                delete users[public_id];
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
