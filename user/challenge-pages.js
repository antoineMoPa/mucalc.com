var mongoose = require('mongoose');

mongoose.Promise = global.Promise;

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

var Challenge;

module.exports = function(app, cache_user_model){
    Challenge = mongoose.model('Challenge', ChallengeSchema);
    
    module.exports.Challenge = Challenge;
    
    app.get('/challenge/new', function (req, res) {
        if(res.locals.logged_in){
            var token = require("../tokens").generate_token(10);
            
            var challenge = new Challenge({
                public_id: token,
                owner: res.locals.user.get_public_id()
            });
            
            challenge.save(function(err){
                if(err){
                    console.log(err);
                    res.redirect("/dashboard");
                } else {
                    res.render('base',{
                        page: "challenge",
                        challenge_id: token
                    });
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

            // Look for the challenge
            // requirement: public_id == owner
            Challenge.find({
                public_id: id,
                owner: res.locals.user.get_public_id()
            }, function(err, challenges){
                if(challenges.length == 0){
                    // No match
                    res.redirect("/dashboard");
                } else {
                    // Match
                    // If logged in
                    var ch = challenges[0];
                    render_challenge_form(res, ch);
                }
            });
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
                owner: res.locals.user.get_public_id()
            }, function(err, challenges){
                if(challenges.length == 0){
                    // No match
                    res.redirect("/dashboard");
                } else {
                    // Match
                    // If logged in
                    var ch = challenges[0];

                    ch.title = req.body.title || "";
                    ch.question = req.body.question || "";
                    ch.time = req.body.time || "";
                    ch.initial_content = req.body.initial_content || "";
                    ch.validator = req.body.validator || "";
                    ch.save();

                    render_challenge_form(res, ch);
                }
            });
        } else {
            // Else, go to signup
            res.redirect("/signup");
        }
    });

    app.post('/challenge/:id/delete', function (req, res) {
        var id = req.params.id || "";

        if(id == ""){
            res.status(404).send('Please give a valid id');
            return;
        }
        
        if(res.locals.logged_in){
            var user = res.locals.user;
            
            // Look for the challenge
            // requirement: public_id == owner
            Challenge.find({
                public_id: id,
                owner: res.locals.user.get_public_id()
            }, function(err, challenges){
                if(challenges.length == 0){
                    res.redirect("/dashboard");
                    res.status(404).send('No challenges found');
                } else {
                    // Match
                    // If logged in
                    var ch = challenges[0];
                    ch.remove();
                    res.status(200).send('ok!');
                }
            });
        } else {
            res.status(404).send('Please log in before');
        }
    });

    
    function render_challenge_form(res, challenge){
        res.render('base',{
            page: "challenge",
            challenge_id: challenge.public_id,
            title: challenge.title,
            question: challenge.question,
            time: challenge.time,
            initial_content: challenge.initial_content,
            validator: challenge.validator
        });
        
    }
}
