var redis = require("redis");

var client = redis.createClient();

module.exports = {};

function gen_id(id){
    var id = id.replace(/[^A-Za-z0-9]/g,"");
    return "user:"+id;
}

module.exports.store_user = function(id, data){
    var data = JSON.stringify(data);

    var id = gen_id(id);
    
    if(id.length == 0){
        return;
    }
    
    client.set(id, data, function(err, reply){
        if(err != null){
            console.log("err: " + err);
        }
    });
};

/*
  
  callback(data)
  
*/
module.exports.get_user = function(id, callback){
    var id = gen_id(id);
    
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
  
  callback(bool: exists)
  
*/
module.exports.exists = function(id, callback){
    var id = gen_id(id);
    
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
