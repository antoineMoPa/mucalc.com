var request = require("request");

module.exports = function(app, cache_user_model, secrets){
    
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
        
        if(error != ""){
            res.render('base',{
                page: "login",
                negative_message: true,
                message: "Facebook login did not work."
            });
            
            return;
        }

        var token_url = "https://graph.facebook.com/v2.3/oauth/access_token?" +
            "client_id=" + secrets.fb_appid + 
            "&redirect_uri=" + redirect_url + 
            "&client_secret=" + secrets.fb_appsecret + 
            "&code=";
        
        request('http://www.google.com', function (error, response, body) {
            if (!error && response.statusCode == 200) {
                console.log(body);

                // Find recently visited sheets
                user.recently_visited_sheets(function(sheets){
                    // Render page
                    res.render('base',{
                        page: "dashboard",
                        recent_sheets: sheets
                    });
                });
            }
        });
        
        console.log(code);
    });
}
