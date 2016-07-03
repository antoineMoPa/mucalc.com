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

    if(el == undefined){
        console.error("Template "+name+" does not exist.");
    }
    
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
  Create an instance of a template and put it in to_el, 
  replacing the content
  Improvement idea: manage parameters and use this in instanciator
  instead of current code.
*/
function render(template_name, to_el){
    var template = load_template(template_name).content;
    
    var to_el = to_el || dom("<div></div>");
    to_el.innerHTML = template;
    instanciator(to_el);
    
    return to_el;
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
function dom(html){
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


/**
   Interface between the shell and the server.
 */
function lc_network_engine(socket, shell){
    var exports = {};

    socket.on("too many users",function(sheet){
        shell.die("Too many users are editing this sheet right now."+
                  " Try again later or create a new sheet.");
    });

    socket.on("user data",function(data){
        shell.on_user_data(data);
    });
    
    socket.on("sheet",function(sheet){
        shell.on_sheet(sheet);
    });

    socket.on("user count",function(count){
        shell.on_count(count);
    });

    socket.on("edit cell",function(data){
        shell.on_edit_cell(data);
    });

    socket.on("sheet locked",function(data){
        shell.on_sheet_locked(data);
    });

    socket.on("focus index",function(data){
        shell.on_focus_index(data);
    });

    socket.on("delete cell",function(data){
        shell.on_delete_cell(data);
    });

    socket.on("user id",function(data){
        shell.on_user_id(data);
    });

    exports.close = function(){
        socket.close();
    };

    exports.send_nickname = function(nickname){
        socket.emit("set nickname", {
            nickname: nickname
        });
    };

    exports.lock_sheet = function(){
        socket.emit("lock sheet");
    };

    exports.delete_cell = function(index){
        socket.emit("delete cell", {
            number: index
        });
    };

    exports.send_focus = function(index){
        socket.emit("set focus", {
            index: index
        });
    };

    exports.edit_cell = function(index, value){
        socket.emit("edit cell", {
            number: index,
            content: value
        });
    };

    exports.ask_user_id = function(){
        socket.emit("give user id");
    };

    exports.send_user_id = function(id){
        socket.emit("user id",{
            user_id: id
        });
    };

    return exports;
}

function mathjs_compute_engine(){
    
}

function livecalc(root_el, namespace, user){
    eeify_mathjs();
    var chat;
    var scope = {};

    // Create template
    render("livecalc", root_el);
    
    var cells = subqsa(root_el,".livecalc-cells")[0];
    var cell_count;
    var exports = {};
    var currently_calculated_cell = null
    var socket = io("/" + namespace);
    var params = {};

    var net_engine = lc_network_engine(socket, exports);
    
    exports.el = root_el;

    exports.socket = socket;
    
    new_cell("", true);
    
    exports.on_sheet = function(sheet){
        load_json(sheet);
    };

    var user_count = subqsa(root_el, ".user-count")[0];

    if(user.has_id() == false){
        net_engine.ask_user_id();
    } else {
        net_engine.send_user_id(user.get_id());
    }
        
    exports.die = function(message){
        render("livecalc-die",root_el);

        if(chat != undefined){
            chat.die();
        }

        var buttons = [
            {
                text: "Create a new sheet",
                action: function(modal){
                    window.location.href = "/new";
                    console.log("/new");
                }
            },
            {
                text: "Go back to homepage",
                action: function(modal){
                    window.location.href = "/";
                }
            }
        ];
        
        modal(message, buttons);
    };
    
    exports.set_chat = function(c){
        chat = c;
    };
    
    exports.on_count = function(count){
        var plural = count > 1;
        var count = parseInt(count);
        user_count.innerHTML = count + " user" + (plural? "s": "");
    };

    exports.on_edit_cell = function(data){
        var number = data.number;
        var content = data.content;
        edit_cell(number, content);
    };

    exports.on_sheet_locked = function(data){
        // data.initiator is normally sanited on server
        inform_modal( "Sheet was locked by \"" +
               data.initiator +
               "\". You can still open a copy."
             );
        
        params.locked = true;
        
        update_state();
    };
    
    exports.on_focus_index = function(data){
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
    };
    
    exports.on_delete_cell = function(data){
        var number = data.number;
        delete_cell(number, true);
    }

    exports.on_user_id = function(data){
        user.set_id(data.user_id);
        exports.set_nickname("anonymous");
        exports.send_nickname();
        chat.on_user_ready();
    }
    
    window.addEventListener("beforeunload", net_engine.close);

    var nickname = "";
    
    function init_user_data(){
        var nickname_input = subqsa(root_el, ".nickname input")[0];
        var nickname_button = subqsa(root_el, ".nickname button")[0];

        exports.set_nickname = function(new_nickname){
            nickname_input.value = new_nickname;
            nickname = new_nickname;
        };

        exports.on_user_data = function(data){
            exports.set_nickname(data.nickname);
            chat.on_user_ready();
        };
        
        exports.send_nickname = function(){
            net_engine.send_nickname(nickname);
        }
        
        nickname_input.onkeydown = function(e){
            if(e.keyCode == 13){
                submit();
            }
        }
        
        nickname_button.addEventListener("click",function(){
            submit();
        });

        function submit(){
            nickname = nickname_input.value;
            flash(nickname_input,"#eee");
            exports.send_nickname();
        }
    }
    
    init_user_data();

    function init_sheet_panel(){
        var lock_sheet_button = subqsa(
            root_el,
            "button[name='lock-sheet']"
        )[0];

        lock_sheet_button.onclick = function(){
            net_engine.lock_sheet();
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
                net_engine.delete_cell(index);
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
        focus(0);
    }

    exports.load_json = load_json;

    var sheet_state = subqsa(root_el, ".sheet-state")[0];
    
    function update_state(){
        if(params.locked){
            sheet_state.textContent = "This sheet is locked.";
            sheet_state.setAttribute("title","Modifications will not be saved. You can still open a copy (See bottom of the page).");
        } else {
            sheet_state.textContent = "This sheet is public.";
            sheet_state.setAttribute("title","");
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
        net_engine.send_focus(index);
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
        var cell = dom(load_template("livecalc-cell").content);
        cells.appendChild(cell);
        update_indices();

        var input = subqsa(cell,".livecalc-input")[0];
        var button = subqsa(cell,".livecalc-go-button")[0];
        var output = subqsa(cell,".livecalc-output")[0];
        
        //appear(cell);
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
                if(get_value() != ""){
                    send_value(get_index());
                    calculate_and_next();
                }
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

        net_engine.edit_cell(index, input.value);
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
        } catch (exception){
            output.textContent = exception;
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
        
        flash(output,"#c5ddf5");
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
        render("livecalc-wait-click", cell.plot);
        
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

        var can = dom("<canvas></canvas>");
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
        
        var can = dom("<canvas></canvas>");
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

function livechat(root_el, namespace, socket, user){
    render("livechat", root_el);

    var log = subqsa(root_el, ".message-log")[0];
    var header = subqsa(root_el, ".sheet-chat-header")[0];
    var textarea = subqsa(root_el, "textarea")[0];
    var button = subqsa(root_el, "button")[0];
    var exports = {};

    textarea.value = "";
    
    exports.die = function(){
        root_el.innerHTML = "";
    };

    exports.on_user_ready = function(){
        // Now that we know the user id, we
        // load the messages
        // (and we will be able to mark "own" messages)
        socket.emit("load more messages",0);
    };
    
    function get_value(){
        return textarea.value;
    }
    
    function scroll_bottom(){
        log.scrollTop = log.scrollHeight;
    }
    
    textarea.onkeydown = function(e){
        if(e.keyCode == 13 && !e.shiftKey){
            e.preventDefault();
            submit();
        }
    }

    /*
      Note: This is full of ugly hacks to position and size
      The chat elements.
     */
    function resize(){
        var winw = window.innerWidth;
        var winh = window.innerHeight;
        var header = 82;
        var scroll = window.scrollY || 0;

        /*
          If scrolled enough, take space left by header
          Allow a 10 px margin
         */
        if(scroll > header){
            header = 10;
        }
        
        /* set with to one column + margin */
        var w = (parseInt(winw)/4);
        
        root_el.style.width = w+"px";
        textarea.style.width = (w-20)+"px";

        var chat_header = 14;
        var input = 40;
        
        log.style.height = (
            parseInt(winh)-
                header - input - chat_header - 30
        ) + "px";
    }

    resize();
    
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", resize);
    
    button.addEventListener("click",submit);
    
    socket.on("new message", function(data){
        var el = render_message(data);
        log.appendChild(el);
        scroll_bottom();
    });

    socket.on("own message", function(data){
        var el = render_message(data,true);
        log.appendChild(el);
        scroll_bottom();
    });
    
    socket.on("past messages", function(messages){
        var user_id = user.get_id();

        for(var i = messages.length - 1; i >= 0; i--){
            var data = JSON.parse(messages[i]);
            var own = false;

            if(data.user_id == user_id){
                own = true;
            }
            
            var el = render_message(data, own);
            
            // Children 0 is header
            // Children 1 is oldest loaded comment
            if(log.children[1] != undefined){
                log.insertBefore(el, log.children[1]);
            } else {
                log.appendChild(el);
            }
        }
    });
    
    function render_message(data, own){
        var el;
        if(own){
            el = render("livechat-sent-message");
        } else {
            el = render("livechat-received-message");
        }
        var message = subqsa(el, ".content")[0];
        message.textContent = data.message;

        var sender = subqsa(el, ".sender")[0];
        sender.textContent = data.sender;

        // Remove newline at begining and end of string
        el.innerHTML = el.innerHTML.replace(/^[\n]*/g,"");
        el.innerHTML = el.innerHTML.replace(/[\n]*$/g,"");
        el.innerHTML = el.innerHTML.replace(/\n/g,"");
        el.innerHTML = el.innerHTML.replace(/\n/g,"<br>");

        return el;
    }
    
    
    
    function submit(){
        var val = get_value();

        if(val != ""){
            socket.emit("new message",{
                message: val
            });
            
            textarea.value = "";
        }
    }

    return exports;
}

function User(){
    var exports = {};
    var storage = localStorage;

    exports.has_id = function(){
        if(storage.user_id == undefined){
            return false;
        }
        if(storage.user_id == ""){
            return false;
        }
        return true;
    }
    
    exports.get_id = function(){
        return storage.user_id;
    }

    exports.set_id = function(id){
        localStorage.setItem("user_id",id);
    }
    
    return exports;
}

var href = window.location.href;

if(href.match(/\/sheet\/(.*)/)){
    // In a sheet
    var namespace = /\/sheet\/(.*)/g.exec(href)[1];
    
    var user = User();
    
    // Start everything
    // Start calculator
    var calc = livecalc(qsa("livecalc")[0], namespace, user);
    var chat = livechat(qsa("livechat")[0], namespace, calc.socket, user);
    calc.set_chat(chat);
    
    // Start documentation
    init_doc(calc);
} else {
    landing_bg_anim();
}

function landing_bg_anim(){
    // Landing page
    // Nice background animation
    var col = "rgba(130,140,255,0.2)";
    var bg_col = "rgba(130,140,255,1.0)";
    
    document.body.style.background = bg_col;

    if(window.innerWidth < 768){
        // Mobile: abort animation
        return;
    }

    var can = dom("<canvas id='bg-canvas'></canvas>");
    var body = document.body;
    body.appendChild(can);
    can.style.position = "absolute";
    can.style.top = 0;
    can.style.left = 0;
    can.style.zIndex = -1;
    
    var winh, winw;
    var bodh;
    
    var w;
    var h;
    var ctx = can.getContext("2d");

    function onresize(){
        winh = window.innerHeight;
        winw = window.innerWidth;
        bodh = body.clientHeight;
        w = window.innerWidth;
        h = bodh > winh? bodh: winh;
        can.width = w;
        can.height = h;
    }    
    
    onresize();
    
    window.addEventListener("resize",onresize);
    
    var x = 0;
    var last;
    
    setInterval(function(){
        var t = new Date().getTime()/1000;
        var deltat = t - last;
        ctx.fillStyle = col;
        ctx.fillRect(0,0,w,h);
        var iterations = 5;
        for(var i=0; i < iterations; i++){
            x+=2;
            x %= w;
            ctx.fillStyle = "rgba(225,225,255,0.8)";
            // Don't ask me how I ended up with this
            var y = h/2 *
                Math.sin(t + (i/iterations)*30) + h/2;
            ctx.fillRect(x,y,4,4);

            ctx.fillStyle = "rgba(225,225,255,0.1)";
            
            var y = h/2 *
                Math.sin(t + (deltat*i/iterations)*10) + h/2;
            ctx.fillRect(x,y,20,20);
        };
        last = t;
    },33);
}

/** 
    modal 
    
    Example: 
    
    var buttons = [
        {
            text: "Accept",
            action: function(modal){
                modal.close();
            }
        }
    ];
 */
function modal(message, buttons){
    var modal = render("modal-inform");
    var overlay = render("modal-overlay");
    var content = subqsa(modal, ".content p")[0];
    var buttons_container = subqsa(modal, ".buttons")[0];
    var buttons = buttons || [];
    
    content.textContent = message;
    document.body.appendChild(overlay);
    document.body.appendChild(modal);

    var exports = {};

    exports.close = function(){
        modal.parentNode.removeChild(modal);
        overlay.parentNode.removeChild(overlay);
    }

    for(var i = 0; i < buttons.length; i++){
        var button = dom("<button></button>");
        var callback = buttons[i].action || function(){};
        var text = buttons[i].text || "No button text";

        button.textContent = text;
            
        enable_click(button, callback);
        
        buttons_container.appendChild(button);
    }

    function enable_click(button, callback){
        // Onclick: Call callback with modal as argument
        button.addEventListener("click", function(){
            callback(exports);
        });
    }
    
    return exports;
}

function inform_modal(message){
    var buttons = [
        {
            text: "Accept",
            action: function(modal){
                modal.close();
            }
        }
    ];
    
    return modal(message, buttons);
}

/**
   callback(bool: answer) (true == yes)
*/
function yesno_modal(message, callback){
    
}
