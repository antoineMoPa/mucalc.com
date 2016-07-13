module.exports = {};

module.exports.Counter = Counter;

function Counter(){
    var exports = {};

    var data = {};

    exports.data = data;

    data.counters = {};

    var counters = data.counters;
    var types = [];
    
    exports.plus = function(type){
        if(counters[type] == undefined){
            counters[type] = 0;
            types.push(type);
        }
        data.counters[type]++;
    }

    exports.minus = function(type){
        if(counters[type] == undefined){
            console.log(
                "Error: Trying to decrement undefined counter");
        }

        if(counters[type] == 0){
            console.log(
                "Error: Trying to decrement counter = 0, type: "+type);
        }
        
        data.counters[type]--;
    }

    /*
      Returns total if type is null/undefined
     */
    exports.get = function(type){
        if(type == undefined || type == null){
            var tot = 0;
            for(t in types){
                tot += data.counters[t];
            }
            return tot;
        }
        
        return data.counters[type] || 0;
    }
    
    return exports;
}
