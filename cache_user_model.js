var db = require("./user_db");

module.exports = {};

module.exports.db = db;

module.exports.User = function(p_id){
    var exports = {};

    var data = {
        public_id: p_id,
        session_id: "",
        nickname: "anonymous",
        password: ""
    };

    var permanent_user = null;

    exports.get_permanent_user = function(){
        return permanent_user;
    };

    exports.set_permanent_user = function(new_permanent_user){
        permanent_user = new_permanent_user;
        data.nickname = permanent_user.nickname;
    };
    
    exports.save_permanent = function(){
        permanent_user.save();
    };
    
    exports.save = function(){
        db.store_user(data.public_id, data);
    };

    /*
      callback()
     */
    exports.fetch = function(callback){
        db.get_user(p_id, function(from_db){
            data = from_db;
            callback();
        });
    };

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
    var id = require("./tokens").generate_token(6);
    return module.exports.User(id);
};

module.exports.temp_exists = function(id, callback){
    db.temp_exists(id, callback);
};
