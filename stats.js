var redis = require("redis");

var client = redis.createClient()

module.exports = {};

function get_ip(req){
    if(req == undefined){
        return "";
    }

    if(typeof req == "string"){
        return req;
    }
    // http://stackoverflow.com/questions/10849687/express-js-how-to-get-remote-client-address
    var ip = req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress;
    
    return ip;
}


module.exports.new_sheet = function(req){
    var ip = get_ip(req);
    client.incr("sheet_count", function(err, msg){
        // Log a each 5 new sheets
        if(msg % 5 == 0){
            console.log("total sheets: " + msg + " [ip: " + ip + "]");
        }
    });
}

module.exports.launch_example = function(name, req){
    var ip = get_ip(req);
    console.log("launch example: " + name + " [ip: " + ip + "]");
}

module.exports.log_visit = function(what, req){
    var ip = get_ip(req);
    console.log("visit: " + what + " [ip: " + ip + "]");
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
