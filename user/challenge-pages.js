
module.exports = function(app, cache_user_model, secrets){
    app.get('/new-challenge', function (req, res) {
        if(res.locals.logged_in){
            // If logged in
            res.render('base',{page: "new-challenge"});
        } else {
            // Else, go to signup
            res.redirect("/signup");
        }
    });

}
