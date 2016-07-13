var redis = require("redis");

var client = redis.createClient()

module.exports = {};

module.exports.new_sheet = function(){
    client.incr("sheet_count", function(err, msg){
        // Log a each 5 new sheets
        if(msg % 5 == 0){
            console.log("total sheets: " + msg);
        }
    });
}

module.exports.log_visit = function(what){
    console.log("visit: " + what);
}

module.exports.new_sheet_visit = function(id){
    client.incr("visit_sheet:"+id, function(err, msg){
        if(err != null){
            console.log(err);
        }
    });
}

module.exports.get_sheet_visits = function(id, callback){
    var callback = callback || function(){};
    client.get("visit_sheet:"+id, function(err, msg){
        if(err != null){
            console.log(err);
        }
        callback(msg);
    });
}

/* Marketing */

module.exports.newaccounts_newsletter_signup = function(email){
    client.lpush("newsaccounts_newsletter",email, function(err, msg){
        if(err != null){
            console.log(err);
        }
    });
}
