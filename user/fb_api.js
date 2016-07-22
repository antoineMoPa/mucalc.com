var cookie_utils = require("./cookie_utils");
var request = require("request");
var user_utils = require("./user_utils");

module.exports = function(app, cache_user_model, secrets){
    var user_db = cache_user_model.db;
    var redirect_url = secrets.base_url + "/fb/validate";

    app.get('/fb/login', function (req, res) {
        var url = "https://www.facebook.com/dialog/oauth?" +
            "client_id=" + secrets.fb_appid + 
            "&redirect_uri=" + redirect_url +
            "&state=" + require("../tokens").generate_token(30);
        
        res.redirect(url);
    });

    function fb_error(res){
        res.render('base',{
            page: "login",
            negative_message: true,
            message: "Facebook login did not work."
        });
    }
    
    app.get('/fb/validate', function (req, res) {
        var code = req.query.code;
        var error = req.query.error_reason || "";

        // Verify if fb returned an error
        if(error != ""){
            fb_error(res);
            console.log("facebook login error: " + error);
            return;
        }

        // Create url to fetch fb token
        var token_url = "https://graph.facebook.com/v2.3/oauth/access_token?" +
            "client_id=" + secrets.fb_appid + 
            "&redirect_uri=" + redirect_url + 
            "&client_secret=" + secrets.fb_appsecret + 
            "&code=" + code;

        request(token_url, on_token);
        
        // When facebook token is received
        function on_token(error, response, body) {
            if (!error && response.statusCode == 200) {
                var json_body = JSON.parse(body);
                var access_token = json_body.access_token;
                var token_type = json_body.token_type;
                var expires_in = json_body.expires_in;

                var me_url =
                    "https://graph.facebook.com/me" +
                    "?access_token=" + access_token;
                
                request(me_url, on_me);
            } else if (error) {
                console.log("facebook token error: " + error);
                fb_error(res);
            } else {
                console.log("facebook token error: " + response.statusCode);
                fb_error(res);
            }
        }
        
        // When user_id and name are successfully fetched
        function on_me(error, response, body){
            var json_body = JSON.parse(body);
            
            var name = json_body.name;
            var fb_id = json_body.id;

            function on_exists(exists, mongo_user){
                if(exists){
                    // Login
                    var cache_user = mongo_user.login(cache_user_model);
                    
                    cookie_utils.cookie_send_id(
                        res,
                        cache_user.get_session_id()
                    );
                    
                    res.redirect("/dashboard");
                } else {
                    var username = name;

                    // Only allow certain things in username
                    // User can change it later anyway
                    username = username.replace(/[^A-Za-z0-9]*/g,"");
                    
                    // Create account
                    // Save user to mongo db
                    var mongo_user = user_db.create({
                        username: username,
                        fb_id: fb_id,
                        name: name
                    }, on_create);
                }
            }

            // When account is created after oauth
            function on_create(mongo_user){
                var cache_user = mongo_user.login(cache_user_model);
                
                cookie_utils.cookie_send_id(
                    res,
                    cache_user.get_session_id()
                );
                
                res.redirect("/dashboard");
            }
            
            user_db.exists_fb_id(fb_id, on_exists);
        }
    });
}
