var redis = require("redis");

var client = redis.createClient();

var expiry_timeout = 60 * 60 * 24; // 1 day

module.exports = {};

function session_db_id(id){
    var id = id.replace(/[^A-Za-z0-9]/g,"");
    return "user_session:"+id;
}

module.exports.store_user = function(id, data){
    var data = JSON.stringify(data);

    var id = session_db_id(id);
    
    if(id.length == 0){
        return;
    }
    
    client.set(id, data, function(err, reply){
        if(err != null){
            console.log("err: " + err);
        }
    });

    // Expire session automagically
    client.expire(id, expiry_timeout);
};

module.exports.logout = function(session_id){
    var id = session_db_id(session_id);

    client.del(id, function(err, reply){
        if(err != null){
            console.log("err: " + err);
        }
    });
};

/*
  
  Gets user from temp db
  callback(data)
  
*/
module.exports.get_user = function(id, callback){
    var id = session_db_id(id);
    
    if(id.length == 0){
        return;
    }
    
    client.get(id, function(err, reply){
        if(err != null){
            console.log("err: " + err);
        }
        callback(JSON.parse(reply));
    });
};

/*
  
  Does a temp user exist in redis?
  
  callback(bool: exists)
  
*/
module.exports.exists = function(id, callback){
    if(id == undefined || id == ""){
        return false;
    }
    
    var id = session_db_id(id);

    if(id.length == 0){
        callback(false);
        return;
    }
    
    client.exists(id, function(err, exists){
        if(err != null){
            console.log("err: " + err);
        }
        callback(exists);
    });
};

function visited_sheets_id(user_id){
    var visited_id = "user_sheet_visits:"+user_id+":";

    return visited_id;
}

/*
  Call whenever a sheet is visited by a user
*/
module.exports.visit_sheet = function(user_id, sheets){
    var visited_id = visited_sheets_id(user_id);
    
    client.rpush(visited_id, sheets, function(err, reply){
        if(err != null){
            console.log("err: " + err);
        }
    });
};

/*
  Call whenever a sheet is visited by a user
  callback(sheets)
*/
module.exports.recently_visited_sheets = function(user_id, callback){
    var visited_id = visited_sheets_id(user_id);

    client.lrange(visited_id, -20, -1, function(err, reply){
        if(err != null){
            console.log("err: " + err);
        } else {
            callback(reply);
        }
    });
};
