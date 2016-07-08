var db = require("./user_db");

module.exports = {};

module.exports.db = db;

module.exports.User = function(id){
    var exports = {};

    var data = {
        public_id:id,
        nickname:"anonymous",
        password:""
    };
    
    exports.save = function(){
        db.store_user(data.public_id, data);
    };

    /*
      callback()
     */
    exports.fetch = function(callback){
        db.get_user(id, function(from_db){
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
    
    exports.get_id = function(){
        return data.public_id;
    };
    
    exports.set_id = function(new_id){
        data.public_id = new_id;
    };
    
    exports.set_nickname = function(new_nickname){
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
