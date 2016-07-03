var redis = require("redis");

var client = redis.createClient();

module.exports = {};

module.exports.add_message = function(id, data){
    var data = JSON.stringify(data);
    client.rpush(["livechat:"+id, data], function(err, reply){
        if(err != null){
            console.log(err);
        }
    });
};

module.exports.get_conv = function(id, callback){
    /* get 100 last messages */
    client.lrange("livechat:"+id, -100, -1, function(err, reply){
        if(err != null){
            console.log(err);
        }
        callback(reply);
    });
};
