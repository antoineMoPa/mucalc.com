var redis = require("redis");

var client = redis.createClient();

module.exports = {};

var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/test');

var db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));

db.once('open', function() {
    // we're connected!
    console.log("connection");


    var User = mongoose.model('User',{
        name: String,
        email: String,
        nickname: String
    });
    
    var user = new User({
        name: "Antoine",
        email: "a@b.c",
        nickname: "toine"
    });
    /*
    user.save(function(err){
        if(err){
            console.log(err);
        } else {
            console.log("User saved to mongodb");
            console.log(user);
        }
    });

    User.find({ name: "Antoine" }, function(err, user){
        console.log("found user");
        console.log(user);
    });
    */
});

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
