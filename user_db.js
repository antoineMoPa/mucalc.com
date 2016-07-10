/* user_db.js */
/* 
   For the moment, this deals with both redis and mongo,
   this could be changed.
 */

var password_hash = require("password-hash");

module.exports = {};

var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/livecalc');

var db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));

db.once('open', function() {
    console.log("mongo connection");
});

var UserSchema = new mongoose.Schema({
    name: String,
    public_id: String, /* to know who sent what message, for example.
                          Since it is visible to everybody, it must not
                          allow to do dangerous things.
                        */
    username: String,
    password: String,
    email: String,
    nickname: String,
    sheets: Array,
    recent_sheets: Array
});

UserSchema.methods.verify_password = function(given_password){
    if(password_hash.verify(given_password, this.password)){
        return true;
    }
    
    return false;
};

module.exports.create = create;

function create(data, callback){
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

/*
  
  Fetches data from mongodb
  Puts it in redis
  
 */
UserSchema.methods.login = function(cache_user_model, session_id){
    var user = cache_user_model.create();
    var public_id = user.get_public_id();

    if(this.public_id == undefined || this.public_id == ""){
        // Set public id for the first time
        this.public_id = public_id;
        this.save();
    } else {
        // Use public id from db
        public_id = this.public_id;
        user.set_public_id(public_id);
    }
    
    user.set_permanent_user(this);
    user.set_nickname(this.nickname);
    user.set_session_id(session_id);
    user.set_public_id(public_id);
    user.save();
    
    return public_id;
};

var User = mongoose.model('User', UserSchema);

/**
   This is supposed to hash passwords
 */
function hash_password(password){
    var hashed =  password_hash.generate(password);
    return hashed;
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

module.exports.get_user_by_id = get_user_by_id;

function get_user_by_id(id, callback){
    User.findById(id, function(err, user){
        if(err){console.log(err)};
        if(user != null){
            callback(user);
        } else {
            callback(null);
        }
    });
}
