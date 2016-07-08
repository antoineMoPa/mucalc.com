var redis = require("redis");
var password_hash = require("password-hash");

var client = redis.createClient();

module.exports = {};

var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/livecalc');

var db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));

db.once('open', function() {
    // we're connected!
    console.log("connection");
});

var UserSchema = new mongoose.Schema({
    name: String,
    username: String,
    password: String,
    email: String,
    nickname: String,
    sheets: Array
});

UserSchema.methods.verify_password = function(given_password){
    if(password_hash.verify(given_password, this.password)){
        return true;
    }
    
    return false;
};

var User = mongoose.model('User',UserSchema);

/**
   This is supposed to hash passwords
 */
function hash_password(password){
    var hashed =  password_hash.generate(password);
    console.log(hashed);
    return hashed;
}

module.exports.create = create;

function create(data,callback){

    if(data.password == ""){
        console.log("Error: empty password got to user_db.create.");
    }
    
    var user = new User({
        name: data.name || "",
        username: data.username || "",
        email: data.email || "",
        nickname: data.nickname || "",
        password: hash_password(data.password)
    });
    
    user.save(function(err){
        if(err){
            console.log(err);
        } else {
            console.log("New user saved to mongo: " + user.username);
        }
        callback();
    });
}


module.exports.exists_email = exists_email;

/* 
   Exists in mongo ?
   (Also gives the user if it exists)
   callback(exists: true | false, [user])
 */
function exists_email(email, callback){
    User.find({ email: email }, function(err, user){
        if(err){console.log(err)};
        
        if(user.length > 0){
            callback(true, user[0]);
        } else {
            callback(false, user[0]);
        }
    });
}

module.exports.exists_username = exists_username;

/* 
   Exists in mongo ?
   callback(exists: true | false)   
 */
function exists_username(username, callback){
    User.find({ username: username }, function(err, user){
        if(err){console.log(err)};
        if(user.length > 0){
            callback(true);
        } else {
            callback(false);
        }
    });
}


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
  
  Does a temp user exist in redis?
  
  callback(bool: exists)
  
*/
module.exports.temp_exists = function(id, callback){
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
