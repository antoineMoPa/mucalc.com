var mongoose = require('mongoose');
var db = mongoose.connection;

var ChallengeSchema = new mongoose.Schema({
    title: String,
    question: String,
    time: Number,
    initial_content: String,
    validator: String,
    public_id: String,
    owner: String,
    cells: String
});

module.exports = function(app, cache_user_model){
    var Challenge = mongoose.model('Challenge', ChallengeSchema);
    
    app.get('/challenge/new', function (req, res) {
        if(res.locals.logged_in){
            var token = require("../tokens").generate_token(20);
            
            var challenge = new Challenge({
                public_id: token,
                owner: res.locals.user.get_public_id()
            });
            
            challenge.save(function(err){
                if(err){
                    console.log(err);
                    res.redirect("/dashboard");
                } else {
                    res.render('base',{page: "challenge"});
                }
            });
        } else {
            // Else, go to signup
            res.redirect("/signup");
        }
    });
    
    app.get('/challenge/:id', function (req, res) {
        var id = req.params.id || "";
        if(id != "" && res.locals.logged_in){
            // If logged in
            res.render('base',{page: "challenge"});
        } else {
            // Else, go to signup
            res.redirect("/signup");
        }
    });
    
    app.post('/challenge/:id', function (req, res) {
        var id = req.params.id || "";
        
        if(res.locals.logged_in){
            var user = res.locals.user;

            // Look for the challenge
            // requirement: public_id == owner
            Challenge.find({
                public_id: id,
                owner: req.locals.user.get_public_id()
            }, function(err, challenge){
                if(challenge.length == 0){
                    // No match
                    res.redirect("/dashboard");
                } else {
                    var ch = challenge[0];
                    // Match
                    // If logged in
                    res.render('base',{
                        page: "challenge",
                        title: ch.title,
                        question: ch.question,
                        time: ch.time,
                        initial_content: ch.initial_content,
                        validator: ch.validator
                    });
                }
            });
        } else {
            // Else, go to signup
            res.redirect("/signup");
        }
    });

}
