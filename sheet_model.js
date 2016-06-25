var deepcopy = require("deepcopy");

var default_sheet = {
    "title":"Empty",
    "cells":[
        ""
    ]
};

module.exports = {};

module.exports.create = function(){
    var sheet = deepcopy(default_sheet);

    var exports = {};
    
    exports.edit = function(data){
        var number = parseInt(data.number);
        var content = data.content;
        
        if(number >= 0){
            sheet.cells[number] = content;
        }
    }
    
    exports.remove = function(data){
        var number = data.number;
        
        var len = sheet.cells.length;
        if((number > 0 || len > 1) && number < len){
            sheet.cells.splice(number, 1);
        }
    }
    
    exports.set_sheet = function(data){
        sheet = data;
    }
    
    exports.get_sheet = function(){
        return sheet;
    }
    
    exports.get_length = function(){
        return sheet.cells.length + 1;
    }
    
    return exports;
}
