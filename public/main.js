/*
  Shortcut to document.querySelectorAll
 */
function qsa(sel){
    return document.querySelectorAll(sel);
}

/*
  qsa, but on an element
 */
function subqsa(el,sel){
    return el.querySelectorAll(sel);
}

/*
  Load a template
  
  returns the HTML
 */
function load_template(name){
    var content = qsa("template[name="+name+"]")[0].innerHTML;
    return content;
}

/*
  Load a script
  Returns the content
 */
function load_script(name){
    var content = qsa("script[name="+name+"]")[0].innerHTML;
    return content;
}

/*
  Create a dom element
 */
function new_el(html){
    var node = document.createElement("div");
    node.innerHTML = html;
    return node.children[0];
}

/*
  Add some useful stuff for electrical engineering
 */
function eeify_mathjs(){
    math.import({
	/* Parallel resistors */
	LL: function(a,b){
	    var num = 0;
	    for(i in arguments){
		var arg = arguments[i];
		num += 1/arg;
	    }	
	    return 1 / num;
	}
    });
}

/*
  Make something appear "smoothly"
 */
function appear(el){
    var options = {
        max: 6,
        begin: function(el){
            el.style.transform = "scale(0.0)";
        },
        end: function(el){
            el.style.transform = "";
        },
        step: function(el,step,max){
            var ratio = step / max;
            el.style.opacity = "0.0";
            el.style.opacity = 1.0 - ratio;
            el.style.transform = "scale("+(1.0 - ratio)+")";
        }
    };
    animate(el,options);
}

/*
  Make something appear "smoothly"
 */
function animated_remove(el, callback){
    var options = {
        max: 10,
        begin: function(el){
            el.style.position = "relative";
            el.style.opacity = "1.0";
        },
        end: function(el){
            el.style.position = "";
            el.parentNode.removeChild(el);
            callback();
        },
        step: function(el,step,max){
            var ratio = step / max;
            el.style.opacity = ratio;
            el.style.transform = "scale("+ratio+")";
            el.style.top = 100 * (1.0 - ratio) + "px";
        }
    };
    animate(el,options);
}

/*
  Make something flash
 */
function flash(el,color){
    var original_color;
    var options = {
        max: 2,
        time_step: 300,
        begin: function(el){
            original_color = el.style.backgroundColor;
            el.style.backgroundColor = color;
        },
        end: function(el){
            el.style.backgroundColor = original_color;
        },
        step: function(el,step,max){
        }
    };
    animate(el,options);
}

function animate(el,options,step){
    max = options.max;
    time_step = options.time_step || 33;
    if(step == undefined){
	step = max;
        options.begin(el);
    }
    if(step < 0){
        options.end(el);
	return;
    }

    options.step(el, step, max);
    
    setTimeout(
	function(){
	    animate(el, options, step - 1);
	},
	time_step
    );
}

function eecalc(root_el, namespace){
    eeify_mathjs();

    var scope = {};
    root_el.innerHTML = load_template("eecalc");
    var cells = subqsa(root_el,".eecalc-cells")[0];
    var cell_count;
    var exports = {};

    var socket = io("/" + namespace);
    
    new_cell("");

    socket.on("sheet",function(sheet){
	load_json(sheet);
    });

    socket.on("edit cell",function(data){
	var number = data.number;
	var content = data.content;
	edit_cell(number, content);
	console.log("remote edit cell " + number);
    });

    socket.on("delete cell",function(data){
	var number = data.number;
	delete_cell(number, true);
	console.log("remote delete of cell " + number);
    });
    
    window.addEventListener("beforeunload", function(){
	socket.close();
    });

    /*
      Delete a cell. If remote, we don't send an event to the server.
     */
    function delete_cell(index, remote){
	var remote = remote || false;

	if(!remote){
	    socket.emit("delete cell", {
		number: index
	    });
	}

	// Never delete first cell
	if(index > 0 && index < cells.children.length){
	    var cell = find_cell(index).element;
            animated_remove(cell,function(){
                update_indices();
                focus(index-1);
            });
	}
    }

    function delete_all(){
        cells.innerHTML = "";
    }

    function re_run(){
        scope = {};
        for(var i = 0; i < cells.children.length; i++){
            cells.children[i].calculate();
        }
    }

    exports.re_run = re_run;
    
    function load_json(data){
        var data = JSON.parse(data);
        var cells = data.cells;
        
        delete_all();
        
        for(var i = 0; i < cells.length; i++){
            new_cell(cells[i]);
        }
    }

    exports.load_json = load_json;
    
    function get_json(){
        // TODO
    }
    
    exports.get_json = get_json;
        
    function focus(index){
        if(index >= cell_count || index < 0){
            return;
        }
	find_cell(index).input.focus();
    }
    
    function find_cell(index){
	var el = cells.children[index];
	return {
	    element: el,
	    input: subqsa(el, ".eecalc-input")[0],
	    output: subqsa(el,".eecalc-output")[0],
	};
    }

    function update_indices(){
	var i = 0;
	for(i = 0; i < cells.children.length; i++){
	    var cell = cells.children[i];
	    cell.setAttribute("data-index", i);
	    subqsa(cell,".eecalc-input")[0]
		.setAttribute("tabindex", i + 1);
	}
	cell_count = i;
    }
    
    function edit_cell(number, content){
	var field = find_cell(number).input;
	field.value = content;
	calculate_cell(number);
	console.log("edited cell " + number);
    }
    
    function new_cell(content){
	var cell = new_el(load_template("eecalc-cell"));
	cells.appendChild(cell);
	update_indices();
	
	var input = subqsa(cell,".eecalc-input")[0];
	var button = subqsa(cell,".eecalc-go-button")[0];
	var output = subqsa(cell,".eecalc-output")[0];
        
	appear(cell);
        input.value = content;
	input.focus();

	function get_index(){
	    return parseInt(cell.getAttribute("data-index"));
	}

	function get_value(){
	    return input.value;
	}

	function calculate(){
	    calculate_cell(get_index());
	};
	
        cell.calculate = calculate;
	
	input.onkeydown = function(e){
            if(e.keyCode == 13 && !e.shiftKey){
                e.preventDefault();
		send_edit();
		calculate();
	    } else if (e.keyCode == 38) {
                focus(get_index()-1);
            } else if (e.keyCode == 40) {
                focus(get_index()+1);
            } else if(e.code == "Backspace"){
		// Delete cell
		if(get_value() == ""){
		    delete_cell(get_index());
		}
	    }
	}

	function send_edit(){
	    console.log("edit");
	    socket.emit("edit cell", {
		number: get_index(),
		content: input.value
	    });
	} 
	
        input.onkeyup = function(e){
	};
	
	button.onclick = calculate;
    }

    function calculate_cell(index){
	var cell_data = find_cell(index);

	var cell = cell_data.element;
	var input = cell_data.input;
	var output = cell_data.output;

	function get_value(){
	    return input.value;
	}
	
	var text = ee_parse(get_value());
	try{
	    var result = math.eval(text, scope);
	} catch (e){
	    output.innerHTML = e;
	    return;
	}
	
	if(text == ""){
	    return;
	} else if(result != undefined){
	    output.innerHTML = result;
	} else {
	    output.innerHTML = result;
		return;
	}
	
        flash(output,"#ffee55");
        
	// If last cell, add new cell
	if(index == cell_count - 1){
	    new_cell("");
	}
	// Or move focus to next cell
	else {
	    subqsa(cells,".eecalc-input")[index + 1].focus();
	}
    }
    
    return exports;
}

// Replace electrical engineering notation
function ee_parse(str){
    str = str.replace(/([0-9]+)( *)G/g,  "$1E9");
    str = str.replace(/([0-9]+)( *)M/g,  "$1E6");
    str = str.replace(/([0-9]+)( *)meg/g,"$1E6");
    str = str.replace(/([0-9]+)( *)K/g,  "$1E3");
    str = str.replace(/([0-9]+)( *)k/g,  "$1E3");
    str = str.replace(/([0-9]+)( *)m/g,  "$1E-3");
    str = str.replace(/([0-9]+)( *)u/g,  "$1E-6");
    str = str.replace(/([0-9]+)( *)n/g,  "$1E-9");
    str = str.replace(/([0-9]+)( *)p/g,  "$1E-12");
    return str;
}

function init_starters(calc){
    var scripts = qsa(".starter-scripts script");
    var container = qsa(".starter-buttons-container")[0];

    // Create buttons
    for(var i = 0; i < scripts.length; i++){
        var html = load_template("starter-button");
        var button = new_el(html);
        container.appendChild(button);

        var name = scripts[i].getAttribute("name");
        var script = scripts[i].innerHTML;
        var json = JSON.parse(script);
        var title = json.title;
        
        button.name = name;
        button.innerHTML = title;
        enable_click(button);
    }
    
    function enable_click(el){
        el.onclick = function(){
            var name = el.name;
            var starter = load_script(name);
            calc.load_json(starter);
            calc.re_run();
        };
    }
}

var namespace = /\/sheet\/(.*)/g.exec(window.location.href)[1];

// Start everything
var calc = eecalc(qsa("eecalc")[0], namespace);
init_starters(calc);
