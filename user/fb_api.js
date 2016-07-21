var request = require("request");
var user_utils = require("./user_utils");

module.exports = function(app, cache_user_model, secrets){
    var redirect_url = secrets.base_url + "/fb/validate";

    app.get('/fb/login', function (req, res) {
        var url = "https://www.facebook.com/dialog/oauth?" +
            "client_id=" + secrets.fb_appid + 
            "&redirect_uri=" + redirect_url +
            "&state=" + require("../tokens").generate_token(30);
        
        res.redirect(url);
    });
    
    app.get('/fb/validate', function (req, res) {
        var code = req.query.code;
        var error = req.query.error_reason || "";

        // Verify if fb returned an error
        if(error != ""){
            res.render('base',{
                page: "login",
                negative_message: true,
                message: "Facebook login did not work."
            });
            
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
            }
        }
        
        // When user_id and name are successfully fetched
        function on_me(error, response, body){
            var json_body = JSON.parse(body);
            
            var name = json_body.name;
            var fb_id = json_body.id;
            
            function on_exists(exists, mongo_user){
                if(exists){
                    // Did user choose a username?
                    if(mongo_user.username == ""){
                        // Nope? send to form.
                        render_oauth_form(res)
                        return;
                    }

                    // User account is complete
                    // Login
                    mongo_user.login(cache_user_model);

                    res.redirect("/dashboard");
                } else {
                    // Create account
                    // Save user to mongo db
                    var mongo_user = user_db.create({
                        fb_id: fb_id,
                        name: name
                    }, on_create);
                }
            }

            // When account is created after oauth
            function on_create(mongo_user){
                var user = mongo_user.login(cache_user_model);
                
                cookie_utils.cookie_send_id(
                    res,
                    user.get_session_id()
                );
                
                render_oauth_form(res);
            }
            
            user_db.exists_fb_id(fb_id, on_exists);
            
            function render_oauth_form(res){
                // Render "complete account" page
                res.render('base',{
                    page: "oauth-signup-form"
                });
            }
        }
    });

    // When a user creates an account with facebook/oauth
    // And needs to set up their username
    app.post('/oauth/signup',function(req, res){
        var user = res.locals.user || null;
        
        if(user == null){
            res.redirect("/signup");
            return;
        }

        var username = req.body.username || "";
        
        user_utils.validate_nickname(username, function(success, errors){
            if(success){
                // Save user to mongo db
                user.set_username(username);
                account_render(req, res, true,
                               ["Your username was changed"]);
            } else {
                account_render(req, res, false, errors);
            }
        });
    });
}
