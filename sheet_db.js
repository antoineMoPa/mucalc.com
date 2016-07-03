var redis = require("redis");

var client = redis.createClient();

module.exports = {};

function gen_id(id){
    var id = id.replace(/[^A-Za-z0-9_]/g,"");
    return "sheet:"+id;
}

test();

function test(){
    if(gen_id("*a*") != "sheet:a"){
        console.log("Test failed "+gen_id("*a*"));
    }
}

module.exports.store_sheet = function(id, data){
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
module.exports.get_sheet = function(id, callback){
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
