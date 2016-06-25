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
