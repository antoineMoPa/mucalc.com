var express = require("express");
var body_parser = require("body-parser");
var app = express();
var http = require("http").Server(app);
var io = require("socket.io")(http);
var sass_middleware = require("node-sass-middleware");
var livecalc = require("./livecalc");
var sheet_db = require("./sheet_db");
var cache_user_model = require("./cache_user_model");
var chat_db = require("./chat_db");
var stats = require("./stats");
var cookie_utils = require("./user/cookie_utils");
var Cookies = require('cookies');
var package_info = require("./package.json");

/*
  default data
 */
var secrets = {
    base_url: "http://localhost",
    fb_appid: null
};

try{
    secrets = require("./secrets.json");
} catch (e){
    console.log("No secrets.json found. Facebook functions will not work.");
}

livecalc.set_globals(io, sheet_db, chat_db, stats, cache_user_model);

app.use(body_parser.json());
app.use(body_parser.urlencoded({extended: true}));

// Startup message + version
console.log(
    "Starting livecalc.xyz server version: " +
        (package_info["version"] || "")
);

/* Stylesheets */
app.use(sass_middleware({
    src: "./sass",
    dest: "./public/css",
    debug: false,
    sourceMap: true,
    outputStyle: "compressed",
    prefix: "/css"
}));

// Serve static files
app.use(express.static('public'));

app.use(Cookies.express());

// Manage cookies
// Add some user info for render
app.use(function(req, res, next){
    res.locals.cookies = new Cookies(req, res);
    res.locals.version = package_info["version"] || "";
    res.locals.page = "not-specified";

    get_user_model(res, function(user){
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

app.locals.pretty = true;

// Views
app.set('views', './views')
app.set('view engine', 'pug');

app.get('/', function (req, res) {
    stats.log_visit("landing-page");
    res.render('base',{page: "landing"});
});

// All the user pages (account, login, etc.)
var user_pages = require("./user/user_pages")(app, cache_user_model, secrets)

// All the marketing pages (pricing)
var marketing_pages = require("./marketing/marketing")(app, stats)

function is_logged_in(res, callback){
    var session_id = cookie_utils.cookie_get_id(res) || "";
    
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
  callback(cached_user)
*/
function get_user_model(res, callback){
    var session_id = cookie_utils.cookie_get_id(res) || "";
    is_logged_in(res, function(logged_in){
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
                    in_sheet: true,
                    page: "sheet"
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
            in_sheet: true,
            page: "sheet"
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
    new_sheet(req, res);
});

function new_sheet(req, res, data){
    // Todo: verify if a sheet already has same token
    // Not so probable...
    // Nope, new sheet
    stats.new_sheet();
    
    var token = require("./tokens").generate_token();
    
    var model = require("./sheet_model").create();
    
    if(data != undefined){
        model.set_sheet(data);
    }

    sheet_db.store_sheet(token, model.get_sheet());
    
    res.redirect("/sheet/"+token);
}

app.get("/new/:template",function (req, res) {
    var available_templates = [
        "circle-area",
        "sin-x",
        "convert-round",
        "julia"
    ];
    
    var template = req.params.template;
    
    var index = available_templates.indexOf(template);
    
    if(index != -1){
        var name = available_templates[index];
        var filename = name + ".json";
        var content = require("./json/"+filename);
        stats.launch_example(name);
        new_sheet(req, res, content);
    } else {
        res.status(404).send('Template not found');
    }
});

http.listen(3000);
