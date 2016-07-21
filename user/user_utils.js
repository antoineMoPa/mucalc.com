module.exports = function(cache_user_model){

    var exports = {};

    exports.validate_nickname = validate_nickname;
    
    function validate_nickname(username, callback){
        user.fetch_permanent_user(function(){
            var user_db = cache_user_model.db;
            
            // Until not true,
            var success = true;
            var errors = [];
            
            // Username length
            if(username.length < 6){
                success = false;
                errors.push("Username is too short.");
            }
            
            // Username length
            if(username.length > 40){
                success = false;
                errors.push("Username is too long.");
            }
            
            // Username format
            if(!username.match(/^[A-Za-z0-9]*$/)){
                success = false;
                errors.push("Username contains invalid characters.");
            }
            
            // Check username for existence
            user_db.exists_username(username, function(exists){
                if(exists){
                    success = false;
                    errors.push("This username is already used by someone.");
                }
                
                // If still successful
                if(success == true){
                    callback(true);
                } else {
                    callback(false, errors);
                }
            });
        });
    }

    return exports;
}
