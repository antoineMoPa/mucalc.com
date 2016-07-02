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
    client.lrange("livechat:"+id, 0, 100, function(err, reply){
        if(err != null){
            console.log(err);
        }
    });
};
