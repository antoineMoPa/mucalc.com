var redis = require("redis");

var client = redis.createClient();

module.exports = {};

module.exports.store_sheet = function(id, data){
    var data = JSON.stringify(data);
    client.set(id, data, function(err, reply){
        if(err != null){
            console.log("err: " + err);
        }
    });
};

/*
  
  callback(data)
  
*/
module.exports.get_sheet = function(id, callback){
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
    client.exists(id, function(err, exists){
        if(err != null){
            console.log("err: " + err);
        }

        callback(exists);
    });
};
