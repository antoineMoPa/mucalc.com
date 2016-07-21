/* Handles request to user pages */

var cookie_utils = require("./cookie_utils");
var user_utils = require("./user_utils");

module.exports = function(app, cache_user_model, secrets){
    var fb_api = require("./fb_api")(app, cache_user_model, secrets);
        
    app.get('/signup', function (req, res) {
        if(!res.locals.logged_in){
            // If not logged in
            res.render('base',{page: "signup"});
        } else {
            // If logged in, redirect to user dashboard
            res.redirect("/dashboard");
        }
    });
    
    app.get('/account', function (req, res) {
        if(res.locals.logged_in){
            // If logged in
            res.render('base',{page: "account"});
        } else {
            // Else, go to signup
            res.redirect("/signup");
        }
    });
    
    function get_ip(req){
        // http://stackoverflow.com/questions/10849687/express-js-how-to-get-remote-client-address
        var ip = req.headers['x-forwarded-for'] ||
            req.connection.remoteAddress;
        
        return ip;
    }

    app.get('/account-username',function(req, res){
        res.redirect("/account");
    });

    app.post('/account-username',function(req, res){
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

    app.get('/account-password',function(req, res){
        res.redirect("/account");
    });
    
    app.post('/account-password', function (req, res) {
        var user = res.locals.user || null;
        var current_password = req.body.current_password || "";
        var new_password = req.body.new_password || "";
        var new_password_repeat = req.body.new_password_repeat || "";

        if(user == null){
            res.redirect("/signup");
            return;
        }
                
        user.fetch_permanent_user(function(){
            var perm = user.get_permanent_user();
            
            if(!perm.verify_password(current_password)){
                account_render(req, res, false, ["Wrong password"]);
                return;
            }

            // Password length
            if(new_password.length < 6){
                account_render(req, res, false, ["Password is too short."]);
                return;
            }
            
            // Password & password repead match
            if(new_password_repeat != new_password){
                account_render(req, res, false,
                               ["New passwords do not match."]);
                return;
            }
            
            perm.update_password(new_password);
            account_render(req, res, true, "Password updated!");
        });
    });
    
    app.get('/account-email',function(req, res){
        res.redirect("/account");
    });
    
    app.post('/account-email', function (req, res) {
        var user = res.locals.user || null;
        
        if(user == null){
            res.redirect("/signup");
            return;
        }

        var validator = require("email-validator");
        var email = req.body.email || "";

        // Email validation
        if(!validator.validate(email)){
            // Nope
            account_render(req, res, false, ["Email address is not valid."]);
            return;
        }
        
        user.fetch_permanent_user(function(){
            var user_db = cache_user_model.db;
            
            // Check email
            user_db.exists_email(email, function(exists){
                if(!exists){
                    // Ok!
                    user.set_email(email);
                    account_render(req, res, true,
                                   "Your email address was updated.");
                } else {
                    // Nope
                    account_render(req, res, false, ["Email " +
                                                     email
                                                     + " already in use."]);
                    return;
                }
            });
        });
    });
    
    function account_render(req, res, success, message){
        if(success != ""){
            res.render('base',{
                page: "account",
                positive_message: true,
                message: message
            });
        } else {
            var ip = get_ip(req);
            console.log("unsuccessful account operation: " + ip);
            
            res.render('base',{
                page: "account",
                negative_message: true,
                message: message.join(" ")
            });
        }
    }
    
    app.get('/login', function (req, res) {
        if(!res.locals.logged_in){
            // If not logged in
            res.render('base',{page: "login"});
        } else {
            // If logged in, redirect to user dashboard
            res.redirect("/dashboard");
            return;
        }
    });
    
    
    app.get('/logout', function (req, res){
        var session_id = cookie_utils.cookie_get_id(req);
        cookie_utils.cookie_send_id(res, "");

        // So that the frontend does not think user
        // is logged in.
        res.locals.user = undefined;
        res.locals.logged_in = false;
        
        cache_user_model.logout(session_id);
        
        res.render('base',{
            page: "login",
            positive_message: true,
            message: "You successfully logged out. Come again soon!"
        });
    });
    
    app.post('/login', function (req, res){
        if(!res.locals.logged_in){
            // If not logged in
            post_login_form(req, res);
        } else {
            // If logged in, redirect to user dashboard
            res.redirect("/dashboard");
            return;
        }
    });
    
    function post_login_form(req, res){
        var email = req.body.email || "";
        var password = req.body.password || "";
        var user_db = cache_user_model.db;
        
        // Check email
        user_db.exists_email(email, function(exists, user){
            if(!exists){
                // Nope!
                render(false);
            } else {
                if(user.verify_password(password)){
                    // User exists, has good password
                    var session_id = require("../tokens").generate_token(20);
                    user.login(cache_user_model, session_id);
                    
                    cookie_utils.cookie_send_id(res, session_id);
                    render(true);
                } else {
                    // User exists, but wrong password
                    render(false);
                }
            }
        });
        
        function render(success){
            if(success){
                res.redirect("/dashboard");
                return;
            } else {
                var ip = get_ip(req);
                
                console.log("unsuccessful login attempt: " + ip);
                
                res.render('base',{
                    page: "login",
                    negative_message: true,
                    message: "Wrong username/password combination."
                });
            }
        }
    }
    
    app.get('/dashboard', function (req, res) {
        // Se if user is logged in and get data
        if(!res.locals.logged_in){
            // Not logged in
            res.redirect("/login");
            return;
        } else {
            var user = res.locals.user || null;
            
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
    
    app.post('/signup', function (req, res) {
        var username = req.body.username || "";
        var email = req.body.email || "";
        var password = req.body.password || "";
        var user_db = cache_user_model.db;
        
        // Until not true,
        var success = true;
        var errors = [];
        
        var validator = require("email-validator");
        
        // Email validation
        if(!validator.validate(email)){
            success = false;
            errors.push("Email address is not valid.");
        }
        
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
        
        // Password length
        if(password.length < 6){
            success = false;
            errors.push("Password is too short.");
        }
        
        // Check email
        user_db.exists_email(email, function(exists){
            if(exists){
                success = false;
                errors.push("This email is already in use.");
            }
            
            // Check username
            user_db.exists_username(username, function(exists){
                if(exists){
                    success = false;
                    errors.push("This username is already used by someone.");
                }
                
                // If still successful
                if(success == true){
                    // Save user to mongo db
                    user_db.create({
                        username: username,
                        email: email,
                        password: password
                    }, function(){
                        render(success, errors);
                    });
                } else {
                    render(success, errors);
                }
            });
        });
        
        function render(success, errors){
            if(success){
                res.redirect("/dashboard");
                return;
            } else {
                var ip = get_ip(req);
                
                console.log("unsuccessful account creation attempt: " + ip);
                
                
                res.render('base',{
                    page: "signup",
                    negative_message: true,
                    message: errors.join(" ")
                });
            }
        }
    });
};
