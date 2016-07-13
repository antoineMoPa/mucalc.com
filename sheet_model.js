var deepcopy = require("deepcopy");

var default_sheet = {
    "params":{
        "title":"Empty",
        "locked":false,
    },
    "cells":[
        ""
    ]
};

module.exports = {};

module.exports.create = function(){
    var sheet = deepcopy(default_sheet);
    
    var exports = {};

    exports.edit = function(data){
        if(sheet.params.locked){
            return;
        }

        var number = parseInt(data.number);
        var content = data.content;
        var method = data.method;

        if(method == "insert"){
            sheet.cells.splice(number, 0, content);
        } else if(number >= 0){
            sheet.cells[number] = content;
        }
    }
    
    exports.remove = function(data){
        if(sheet.params.locked){
            return;
        }
        
        var number = data.number;
        
        var len = sheet.cells.length;
        if((number > 0 || len > 1) && number < len){
            sheet.cells.splice(number, 1);
        }
    }

    exports.lock = function(){
        sheet.params.locked = true;
    }
    
    exports.is_locked = function(){
        if(sheet.params.locked == undefined){
            sheet.params.locked = false;
        }
        return sheet.params.locked;
    }
    
    exports.set_sheet = function(data){
        if(sheet.params.locked){
            return sheet;
        }

        sheet = data;
        sheet.params = sheet.params || {};
        sheet.params.locked = sheet.params.locked || false;
        
        return sheet;
    }
    
    exports.get_sheet = function(){
        return sheet;
    }
    
    exports.get_length = function(){
        return sheet.cells.length + 1;
    }
    
    return exports;
}
