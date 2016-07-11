var express = require("express");
var body_parser = require("body-parser");
var app = express();
var http = require("http").Server(app);
var io = require("socket.io")(http);
var cookie = require('cookie');
var sass_middleware = require("node-sass-middleware");
var livecalc = require("./livecalc");
var sheet_db = require("./sheet_db");
var cache_user_model = require("./cache_user_model");
var chat_db = require("./chat_db");
var stats = require("./stats");

livecalc.set_globals(io, sheet_db, chat_db, stats, cache_user_model);

app.use(body_parser.json());
app.use(body_parser.urlencoded({extended: true}));

// Add some user info for render
app.use(function(req, res, next){
    get_user_model(req, function(user){
        res.locals.user = user || null;
        if(user == null){
            // not logged in
            res.locals.logged_in = false;
        } else {
            // logged in
            res.locals.logged_in = true;
        }
        next();
    });
});

/* Stylesheets */
app.use(sass_middleware({
    src: "./sass",
    dest: "./public/css",
    debug: false,
    outputStyle: "compressed",
    prefix: "/css"
}));

// Serve static files
app.use(express.static('public'));

app.locals.pretty = true;

// Views
app.set('views', './views')
app.set('view engine', 'pug');

app.get('/', function (req, res) {
    res.render('base',{page: "landing"});
});

app.get('/pricing', function (req, res) {
    res.render('base',{page: "pricing"});
});

app.get('/signup', function (req, res) {
    if(!res.locals.logged_in){
        // If not logged in
        res.render('base',{page: "signup"});
    } else {
        // If logged in, redirect to user dashboard
        res.redirect("/dashboard");
    }
});

app.get('/login', function (req, res) {
    if(!res.locals.logged_in){
        // If not logged in
        res.render('base',{page: "login"});
    } else {
        // If logged in, redirect to user dashboard
        res.redirect("/dashboard");
    }
});

function cookie_send_id(res, id){
    res.setHeader(
        'Set-Cookie',
        cookie.serialize('session_id', id, {
            httpOnly: true,
            maxAge: 60 * 60 * 24 // 1 days
        }));
}

function cookie_get_id(req){
    return cookie.parse(req.headers.cookie || '').session_id;
}

function is_logged_in(req, callback){
    var session_id = cookie_get_id(req) || "";

    if(session_id == ""){
        callback(false);
    }
    
    cache_user_model.temp_exists(session_id, function(exists){
        if(exists){
            return callback(true);
        } else {
            return callback(false);
        }
    });
}

/*
  Make sure user is logged in before calling this.
*/
function get_user_model(req, callback){
    var session_id = cookie_get_id(req) || "";
    
    is_logged_in(req, function(logged_in){
        if(logged_in){
            user = cache_user_model.cached_user(session_id);
            user.fetch(function(){
                callback(user);
            });
        } else {
            callback(null);
        }
    });
}

app.get('/logout', function (req, res){
    var session_id = cookie_get_id(req);
    cookie_send_id(res, "");

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
                var session_id = require("./tokens").generate_token(20);
                user.login(cache_user_model, session_id);
                
                cookie_send_id(res, session_id);
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
        } else {
            // http://stackoverflow.com/questions/10849687/express-js-how-to-get-remote-client-address
            var ip = req.headers['x-forwarded-for'] ||
                req.connection.remoteAddress;
            
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
    } else {
        var user = res.locals.user;
        
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
    if(username.length < 6){
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
        } else {

            // http://stackoverflow.com/questions/10849687/express-js-how-to-get-remote-client-address
            var ip = req.headers['x-forwarded-for'] ||
                req.connection.remoteAddress;
            
            console.log("unsuccessful account creation attempt: " + ip);

            
            res.render('base',{
                page: "signup",
                negative_message: true,
                message: errors.join(" ")
            });
        }
    }
});

app.post('/marketing/newsletter_signup', function (req, res) {
    var email = req.body.email;

    var validator = require("email-validator");

    if(validator.validate(email)){
        stats.newaccounts_newsletter_signup(email);
        console.log("newsletter signup: ", email);
        res.render('base',{
            page: "pricing",
            positive_message:true,
            message:
            "Thank you for signing up to our newsletter! "+
                "You will be informed when new "+
                "user accounts are made available."
        });
    } else {
        res.render('base',{
            page: "pricing",
            negative_message:true,
            message:
            "We could not sign you up, "+
                "there seems to be a problem with your email address."
        });
    }
});

app.get("/sheet/:id",function (req, res) {
    var sheet_id = req.params.id;
    var logged_in = res.locals.logged_in;
    var user = res.locals.user || null;

    // Todo: unhardcode domain and protocol
    var share_url =
        "https://livecalc.xyz/sheet/" +
        sheet_id;

    res.locals.share_url = share_url;
    
    // See if namespace is already in memory
    // Else we check in DB
    if(livecalc.namespaces.indexOf(sheet_id) <= -1){
        sheet_db.exists(sheet_id, function(exists){
            // Maybe then it exists in redis
            if(exists){
                livecalc.new_namespace(sheet_id);
                res.render('base',{
                    in_sheet: true
                });
                
                // For "recently visited sheets"
                if(user != null){
                    user.visit_sheets(sheet_id);
                }
            } else {
                // Else, sheet not found
                res.status(404).send('Not Found');
            }
        });
    } else {
        // Sheet exists
        res.render('base',{
            in_sheet: true
        });
    }
});

app.get("/copy/:id",function (req, res) {
    var sheet_id = req.params.id;
    var new_id = require("./tokens").generate_token();
    
    sheet_db.get_sheet(sheet_id, function(data){
        data.params.locked = false;
        sheet_db.store_sheet(new_id, data);
        res.redirect("/sheet/"+new_id);
    });
});

app.get("/new",function (req, res) {
    // Todo: verify if a sheet already has same token
    // Not so probable...
    // Nope, new sheet
    stats.new_sheet();
    
    var token = require("./tokens").generate_token();

    var model = require("./sheet_model").create();
    
    sheet_db.store_sheet(token, model.get_sheet());
    
    res.redirect("/sheet/"+token);
});

http.listen(3000);
