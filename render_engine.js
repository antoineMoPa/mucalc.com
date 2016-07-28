var pug = require("pug");
var fs = require("fs");

module.exports = function(app){
    var extension_folder = "./views/extensions/";
    
    var found_files = fs.readdirSync(extension_folder);
    var good_files = [];

    found_files.map(function(el){
        if(el.match(/^[A-Za-z\-]*\.pug$/)){
            good_files.push(el);
        }
    });

    var extensions_html = "";
    
    good_files.map(function(file){
        var html = pug.renderFile(
            extension_folder + file
        );
        
        extensions_html += html;
    });
    
    app.locals.extensions_html = extensions_html;
    
    app.set('view engine', 'pug');
};
