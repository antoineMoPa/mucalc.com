/* handles pricing related pages */

module.exports = function(app, stats){
    app.get('/pricing', function (req, res) {
        stats.log_visit("pricing-page", req);
        res.render('base',{page: "pricing"});
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
};
