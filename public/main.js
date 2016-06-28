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
    var el = qsa("template[name="+name+"]")[0];
    var content = el.innerHTML;

    var params = el.getAttribute("data-params");

    if(params == "" || params == null){
        params = [];
    } else {
        params = params.split(","); 
    }
    
    return {
        content: content,
        params: params
    };
}

/* 
   finds template-instances
   
   replaces handlebars by data- attributes 
   
   {{meow}} will be replaced by attribute data-meow
   
   (Sort of a preprocessor)
*/
function instanciator(el){
    var instances = subqsa(el,"template-instance");

    for(var i = 0; i < instances.length; i++){
        var instance = instances[i];
        var name = instance.getAttribute("data-name");
        var template = load_template(name);
        var content = template.content;
        var params = template.params;

        for(var j = 0; j < params.length; j++){
            var attr = "data-"+params[j];
            var value = instance.getAttribute(attr);
            
            // Sanitize value to avoid XSS
            value = value.replace(/[^A-Za-z0-9\- ]/g,"");
            var attr = attr.replace(/^data-/,"")
            var handle = "{{"+attr+"}}";
            
            content = content.replace(handle,value);
        }
        
        instance.innerHTML = content;
    }
}

/*
  Create an instance of a template and put it in to_el
  Improvement idea: manage parameters and use this in instanciator
  instead of current code.
*/
function instanciate_to(template_name, to_el){
    var template = load_template(template_name).content;
    var el = new_el(template);
    to_el.innerHTML = "";
    to_el.appendChild(el);
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

function livecalc(root_el, namespace){
    eeify_mathjs();

    var scope = {};
    root_el.innerHTML = load_template("livecalc").content;
    instanciator(root_el);
    var cells = subqsa(root_el,".livecalc-cells")[0];
    var cell_count;
    var exports = {};
    var currently_calculated_cell = null
    var socket = io("/" + namespace);
    var params = {};
    
    exports.el = root_el;
    
    new_cell("", true);
    
    socket.on("sheet",function(sheet){
        load_json(sheet);
    });

    var user_count = subqsa(root_el, ".user-count")[0];
    
    socket.on("user count",function(count){
        var plural = count > 1;
        var count = parseInt(count);
        user_count.innerHTML = count + " user" + (plural? "s": "");
    });

    
    socket.on("edit cell",function(data){
        var number = data.number;
        var content = data.content;
        edit_cell(number, content);
    });

    socket.on("sheet locked",function(data){
        // data.initiator is normally sanited on server
        alert( "Sheet was locked by \"" +
               data.initiator +
               "\". You can still open a copy."
             );
        
        params.locked = true;
        
        update_state();
    });
    
    socket.on("focus index",function(data){
        for(var i = 0; i < data.length; i++){
            var cell = find_cell(i);

            if(cell == null){
                return;
            }
            
            var usersinfo = cell.usersinfo;
            
            if(Array.isArray(data[i]) && data[i].length > 0){
                usersinfo.textContent = data[i].join(", ") + " editing this cell...";
            } else {
                usersinfo.textContent = "";
            }
        }
    });
    
    socket.on("delete cell",function(data){
        var number = data.number;
        delete_cell(number, true);
    });
    
    window.addEventListener("beforeunload", function(){
        socket.close();
    });

    var nickname = "";
    
    function init_nickname_field(){
        var input = subqsa(root_el, ".nickname input")[0];
        var button = subqsa(root_el, ".nickname button")[0];

        input.onkeydown = function(e){
            if(e.keyCode == 13){
                submit();
            }
        }
        
        button.addEventListener("click",function(){
            submit();
        });

        function submit(){
            nickname = input.value;
            flash(input,"#eee");
            send_nickname(nickname);
        }
        
        // Send it at page load
        send_nickname("anonymous");
        
        function send_nickname(nickname){
            socket.emit("set nickname", {
                nickname: nickname
            });
        }
    }
    
    init_nickname_field();

    function init_sheet_panel(){
        var lock_sheet_button = subqsa(
            root_el,
            "button[name='lock-sheet']"
        )[0];

        lock_sheet_button.onclick = function(){
            socket.emit("lock sheet");
        };
        
        var new_copy_button = subqsa(
            root_el,
            "button[name='new-copy']"
        )[0];
        
        new_copy_button.onclick = function(){
            window.location.href = "/copy/"+namespace;
        }
    }

    init_sheet_panel();
    
    /*
      Delete a cell. If remote, we don't send an event to the server.
     */
    function delete_cell(index, remote){
        var remote = remote || false;

        // Never delete last remaining cell
        var len = cells.children.length;
        
        if((index > 0 || len > 1) && index < len){
            var cell = find_cell(index).element;

            // Avoid deleting more than one time
            if(cell.getAttribute("data-deleting") == "true"){
                return;
            }
            cell.setAttribute("data-deleting","true");
            
            animated_remove(cell,function(){
                update_indices();
                focus(index-1);
            });

            if(!remote){
                socket.emit("delete cell", {
                    number: index
                });
            }
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
        params = data.params;

        update_state();
        
        delete_all();
        
        for(var i = 0; i < cells.length; i++){
            new_cell(cells[i], true);
        }
        re_run();
    }

    exports.load_json = load_json;

    var sheet_state = subqsa(root_el, ".sheet-state")[0];
    
    function update_state(){
        if(params.locked){
            sheet_state.textContent = "This sheet is locked. Modifications will not be saved. You can still open a copy (See bottom of the page).";
        } else {
            sheet_state.textContent = "This sheet is public.";
        }
    }

    update_state();
    
    function send_all(){
        for(var i = 0; i < cells.children.length; i++){
            send_value(i);
        }
    }

    exports.send_all = send_all;
    
    function focus(index){
        if(index >= cell_count || index < 0){
            return;
        }
        find_cell(index).input.focus();
        send_focus(index);
    }

    exports.focus = focus;
    
    function send_focus(index){
        if(index == null){
            index = -1;
        }
        socket.emit("set focus", {
            index: index
        });
    }
    
    function find_cell(index){
        var el = cells.children[index];

        if(el == undefined){
            return null;
        }
        
        return {
            element: el,
            input: subqsa(el, ".livecalc-input")[0],
            output: subqsa(el,".livecalc-output")[0],
            usersinfo: subqsa(el,".users-info")[0],
            plot: subqsa(el,".plot")[0]
        };
    }

    function update_indices(){
        var i = 0;
        for(i = 0; i < cells.children.length; i++){
            var cell = cells.children[i];
            cell.setAttribute("data-index", i);
            subqsa(cell,".livecalc-input")[0]
                .setAttribute("tabindex", i + 1);
        }
        cell_count = i;
    }
    
    function edit_cell(number, content){
        grow_to(number);
        var field = find_cell(number).input;
        field.value = content;
        calculate_cell(number);
    }

    /* To add cells if required*/
    function grow_to(number){
        var from = cells.children.length;
        var to = number;

        for(i = from; i <= to; i++){
            new_cell("",false);
        }
    }
    
    function new_cell(content, send_data){
        var exports = {};
        var content = content || "";

        cell_count++;
        var cell = new_el(load_template("livecalc-cell").content);
        cells.appendChild(cell);
        update_indices();

        var input = subqsa(cell,".livecalc-input")[0];
        var button = subqsa(cell,".livecalc-go-button")[0];
        var output = subqsa(cell,".livecalc-output")[0];

        appear(cell);
        input.setAttribute("value",content);
        
        function get_index(){
            return parseInt(cell.getAttribute("data-index"));
        }

        function get_value(){
            return input.value;
        }

        function calculate(){
            calculate_cell(get_index());
        };

        input.addEventListener("click",function(){
            send_focus(get_index());
        });
        
        cell.calculate = calculate;
        
        input.onkeydown = function(e){
            if(e.keyCode == 13 && !e.shiftKey){
                e.preventDefault();
                send_value(get_index());
                calculate_and_next();
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

        function calculate_and_next(){
            calculate();
            
            var index = get_index();
            
            // If last cell, add new cell
            if(index == cell_count - 1){
                new_cell("", true);
            }
            // Or move focus to next cell
            else {
                focus(index + 1);
            }
        }
        
        button.onclick = function(){
            send_value(get_index());
            calculate_and_next();
        };

        exports.calculate_and_next = calculate_and_next;
        exports.calculate = calculate;

        input.focus();

        if(send_data){
            send_focus(get_index());
            send_value(get_index());
        }
        
        return exports;
    }

    exports.new_cell = new_cell;
    
    function send_value(index){
        var cell_data = find_cell(index);
        
        var input = cell_data.input;

        socket.emit("edit cell", {
            number: index,
            content: input.value
        });
    } 
    
    function calculate_cell(index){
        var cell_data = find_cell(index);
        currently_calculated_cell = cell_data;
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
            output.textContent = e;
            return;
        }
        
        if(text == ""){
            return;
        } else if(result != undefined){
            output.textContent = result;
        } else {
            output.textContent = result;
                return;
        }
        
        flash(output,"#cdf");
    }

    /*
      Add some useful stuff to math.js
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
            },
            rule: function(number){
                var cell = currently_calculated_cell;
                return rule(cell.plot, number);
            },
            plot: plot,
            zfractal: function(e,i,s){
                var cell = currently_calculated_cell;
                wait_for_click(cell, function(){
                    zfractal(cell.plot, e, i, s);
                });
                return "";
            }
        });
    }
    
    /* 
       Wait for user click before 
       calculating something potentially long 
    */
    function wait_for_click(cell, callback){
        instanciate_to("livecalc-wait-click", cell.plot);
        
        var button = subqsa(cell.plot,"button")[0];
        button.onclick = go;
        
        function go(){
            button.innerHTML = "Computing...";
            setTimeout(callback,100);
        }
    }

    /*
      Cellular automata
     */
    function rule(plot_el, number){
        var number = parseInt(number);
        
        if(number < 0 || number > 255){
            throw "Number should be between 0 and 255";
        }
        
        plot_el.innerHTML = "";
        var div_width = plot_el.clientWidth;
        
        var grid_size = 100;
        var pixel_size = 4;
        
        var width = grid_size;
        var height = grid_size;

        var can = new_el("<canvas></canvas>");
        var ctx = can.getContext("2d");
        
        plot_el.appendChild(can);
        
        can.width = width * pixel_size;
        can.height = height * pixel_size;

        var imgdata = ctx.createImageData(can.width, can.height);

        var line = new_line();

        line[parseInt(width/2)] = true;

        // This is a port of my GLSL code found
        // [here](https://github.com/antoineMoPa/ogl-js/blob/master/tests/triangles/post-fragment.glsl)

        // Draw a pixel
        // (That may be many pixel, depending on pixel_size)
        function set_pixel(i,j,val){
            var j = j * pixel_size;
            var i = i * pixel_size;

            // repeat the pixel
            for(var k = 0; k < pixel_size; k++){
                for(var l = 0; l < pixel_size; l++){
                    set_one_pixel(i+k,j+l,val);
                }
            }
        }

        // Draw one actual canvas pixel
        function set_one_pixel(i,j,val){
            var index = 4 * (j * can.width + i);
            // Set value
            imgdata.data[index + 0] = val;
            imgdata.data[index + 1] = val;
            imgdata.data[index + 2] = val;
            imgdata.data[index + 3] = 255;
        }

        // Parse screen and follow the rule to create new line
        for(var j = 0; j < height; j++){
            // Keep last line in memory
            var last_line = copy_line(line);
            for(var i = 0; i < width; i++){
                // Drawing
                var val = 230;

                if(line[i]){
                    val = 30;
                }

                set_pixel(i, j, val);
                
                var cell_1 = last_line[i-1];
                var cell_2 = last_line[i];
                var cell_3 = last_line[i+1];
                
                var num = 0;
                
                if(cell_1){
                    num += 4;
                }
                if(cell_2){
                    num += 2;
                }
                if(cell_3){
                    num += 1;
                }

                next = false;
                
                // `rule`: 8 bits
                // `num`: 3 bits addressing `rule` bits
                //
                // `rule` indicates which cases of `num` will produce
                // an open pixel
                //
                // bitwise or (&) operator example:
                // 0010 0000 & 0010 0001 == 0010 0000
                //
                // Example with rule 3
                // Rule 3 = 0000 0011
                // So bits 1 and 2 are activated
                // Which means 2^0 and 2^1 is activated
                // 0000 0011 & 0000 0001 != 0 and
                // 0000 0011 & 0000 0010 != 0
                //
                // In these cases, the next state of the pixel is `1`
                //
                if(number & parseInt(Math.pow(2,num))){
                    next = true;
                }
                
                if(next){
                    line[i] = true;
                } else {
                    line[i] = false;
                }
            }
        }

        function new_line(){
            var line = [];
            for(var i = 0; i < width; i++){
                line.push(false);
            }
            return line;
        }

        function copy_line(old){
            var line = [];
            for(var i = 0; i < old.length; i++){
                line.push(old[i]);
            }
            return line;
        }
        
        ctx.putImageData(imgdata,0,0);
        
        // We must return a value
        return "";
    }
    
    function plot(expression){
        var plot_el = currently_calculated_cell.plot;
        
        var div_width = plot_el.clientWidth;
        
        // For most screens: keep this width
        // To optimize vertical space used +
        // pragmatic aspect ratio
        var width = 550;
        
        // Smaller screens limit widthx
        if(div_width < 550){
            width = div_width - 10;
        }
        
        functionPlot({
            target: plot_el,
            width: width,
            disableZoom: true,
            data: [{
                sampler: 'builtIn', /* To use math.js */
                graphType: 'polyline', /* To use math.js */
                fn: expression
            }],
            grid: true
        })

        // We must return a value
        return "";
    }
    
    function zfractal(plot_el, expression, iterations, size){
        var iterations = iterations || 10;
        var exp = math.compile(expression);
        plot_el.innerHTML = "";
        var div_width = plot_el.clientWidth;
        var pixel_ratio = 1;
        
        var size = size || 30;
        
        var width = size;
        var height = size;
        
        var can = new_el("<canvas></canvas>");
        var ctx = can.getContext("2d");
        
        plot_el.appendChild(can);
        
        // Make it square
        can.width = width * pixel_ratio;
        can.height = height * pixel_ratio;

        var data = ctx.createImageData(width, height);
        
        for(var i = 0; i < width; i++){
            for(var j = 0; j < height; j++){
                scope.c = math.complex(
                    4.0 * (i/width - 0.5),
                    4.0 * (j/height - 0.5)
                );
                
                scope.z = math.complex(scope.c);

                var val = 255;
                
                for(var k = 0; k < iterations; k++){
                    scope.z = exp.eval(scope);
                    if(len(scope.z) > 2.0){
                        val = parseInt(((k/iterations) * 255));
                        break;
                    }
                }

                var index = 4 * (j * width + i);
                        
                data.data[index + 0] = val;
                data.data[index + 1] = val;
                data.data[index + 2] = val;
                data.data[index + 3] = 255
            }
        }

        ctx.putImageData(data,0,0);
        
        function len(z){
            return Math.sqrt(
                Math.pow(z.re,2) + 
                    Math.pow(z.im,2)
            );
        }
    }
    
    return exports;
}

// Replace electrical engineering notation
function ee_parse(str){
    str = str.replace(/([0-9]+)G/g,  "$1E9");
    str = str.replace(/([0-9]+)M/g,  "$1E6");
    str = str.replace(/([0-9]+)meg/g,"$1E6");
    str = str.replace(/([0-9]+)K/g,  "$1E3");
    str = str.replace(/([0-9]+)k/g,  "$1E3");
    str = str.replace(/([0-9]+)m/g,  "$1E-3");
    str = str.replace(/([0-9]+)u/g,  "$1E-6");
    str = str.replace(/([0-9]+)n/g,  "$1E-9");
    str = str.replace(/([0-9]+)p/g,  "$1E-12");
    str = str.replace(/\*\*/g,  "^");
    return str;
}

function init_starters(calc){
    var scripts = qsa(".starter-scripts script");
    var container = qsa(".starter-buttons-container")[0];

    // Create buttons
    for(var i = 0; i < scripts.length; i++){
        var html = load_template("starter-button").content;
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
            calc.send_all();
            calc.re_run();
        };
    }
}

function init_doc(calc){
    var codes = subqsa(calc.el, ".doc code");

    for(var i = 0; i < codes.length; i++){
        var el = codes[i];
        var content = el.innerHTML;
        
        init_click(el, content);
        el.setAttribute("title","Click to add to sheet");
    }

    function init_click(el, code){
        el.onclick = function(){
            var cell = calc.new_cell(code, true);
            cell.calculate();
        };
    }
}


var href = window.location.href;

if(href.match(/\/sheet\/(.*)/)){
    // In a sheet
    
    // Remove landing page
    var landing = qsa(".only-landing")[0];
    landing.parentNode.removeChild(landing);

    var namespace = /\/sheet\/(.*)/g.exec(href)[1];

    // Start everything
    
    // Start calculator
    var calc = livecalc(qsa("livecalc")[0], namespace);
    
    // Start documentation
    init_doc(calc);
    init_starters(calc);
} else {
    // Landing page
    // Nice background animation
    var can = new_el("<canvas id='bg-canvas'></canvas>");
    var body = document.body;
    body.appendChild(can);
    can.style.position = "absolute";
    can.style.top = 0;
    can.style.left = 0;
    can.style.zIndex = -1;
    
    var w = body.clientWidth;
    var h = body.clientHeight;
    can.width = w;
    can.height = h;
    var ctx = can.getContext("2d");

    var x = 0;
    var last;
    setInterval(function(){
        var t = new Date().getTime()/1000;
        var deltat = t - last;
        ctx.fillStyle = "rgba(255,255,255,0.02)";
        ctx.fillRect(0,0,w,h);
        var iterations = 5;
        for(var i=0; i < iterations; i++){
            x+=2;
            x %= w;
            ctx.fillStyle = "rgba(40,40,200,0.6)";
            // Don't ask me how I ended up with this
            var y = h/2 *
                Math.sin(t+(i/iterations*deltat)*4) + h/2;
            ctx.fillRect(x,y,2,2);
        };
        last = t;
    },33);
}
