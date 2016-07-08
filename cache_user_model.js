/* cache_user_model.js */

/* todo: untangle this and user_db.js */

var db = require("./user_db");

module.exports = {};

module.exports.db = db;

module.exports.User = function(session_id, public_id){
    var exports = {};

    var data = {
        public_id: public_id || "",
        session_id: session_id || "",
        nickname: "Anonymous",
        permanent_id: null
    };

    var permanent_user = null;

    exports.get_permanent_user = function(){
        return permanent_user;
    };

    exports.set_permanent_user = set_permanent_user;

    function set_permanent_user(new_permanent_user){
        permanent_user = new_permanent_user;
        data.nickname = permanent_user.nickname;
        data.permanent_id = permanent_user.id;
    };

    exports.fetch_permanent_user = fetch_permanent_user;

    /*
      Find user in mongo 
      to prepare for update
     */
    function fetch_permanent_user(callback){
        if(data.permanent_id == null){
            console.log("Error: cannot fetch permanent user. "+
                        "permanent_id is not known.");
        }
        
        db.get_user_by_id(data.permanent_id, function(user){
            if(user == null){
                console.log("Error: permanent id not linked to a user.");
                return;
            }
            set_permanent_user(user);
            callback();
        });
    }

    /*
      Save in mongo
    */
    exports.save_permanent = function(){
        permanent_user.save();
    };

    /*
      Save in cache
     */
    exports.save = function(){
        db.store_user(data.session_id, data);
    };

    /*
      callback()
     */
    exports.fetch = function(callback){
        db.get_user( data.session_id, function(from_cache){
            data = from_cache;
            callback();
        });
    };

    /*
      Should be only data safe for frontend
     */
    exports.get_public_data = function(){
        return {
            public_id: data.public_id,
            nickname: data.nickname,
            focus: -1
        }
    };
    
    exports.get_public_id = function(){
        return data.public_id;
    };
    
    exports.set_public_id = function(new_id){
        data.public_id = new_id;
    };

    exports.get_session_id = function(){
        return data.session_id;
    };
    
    exports.set_session_id = function(new_id){
        data.session_id = new_id;
    };
    
    exports.set_nickname = function(new_nickname){
        if(permanent_user != null){
            permanent_user.nickname = new_nickname;
            permanent_user.save();
        }
        data.nickname = new_nickname;
    };

    exports.get_nickname = function(){
        return data.nickname;
    };

    return exports;
}

module.exports.create = function(){
    var session_id = require("./tokens").generate_token(6);
    var public_id = require("./tokens").generate_token(6);
    return module.exports.User(session_id, public_id);
};

module.exports.temp_exists = function(id, callback){
    db.temp_exists(id, callback);
};
