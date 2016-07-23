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
  Hide an element
*/
function hide(el){
    el.classList.add("hidden");
}

/*
   Determine if hidden
 */
function hidden(el){
    return el.classList.contains("hidden");
}


/*
  Show an element
 */
function show(el){
    el.classList.remove("hidden");
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
            value = value.replace(/[^A-Za-z0-9\-\.\_\: ]/g,"");
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
    var has_to_el = false;
    
    if(to_el != undefined){
        has_to_el = true;
    }
    
    var to_el = to_el || dom("<div></div>");

    to_el.innerHTML = template;
    instanciator(to_el);

    // If we were not rendering to something
    if(!has_to_el){
        // If there is only one element,
        if(to_el.children.length == 1){
            // return it
            return to_el.children[0];
        }
    }
    
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
  Make something disappear "smoothly"
 */
function disappear(el, effect){
    appear(el, effect, true);
}

/*
  Make something appear "smoothly"
 */
function appear(el, effect, reverse){
    var reverse = reverse || false;
    var effect = effect || "scale up";

    var effects = {
        "scale up": {
            max: 3,
            begin: function(el){
                el.style.transform = "scale(0.0)";
            },
            end: function(el){
                el.style.transform = "";
            },
            step: function(el,step,max){
                var ratio = step / max;

                if(reverse){
                    ratio = 1 - ratio;
                }

                el.style.opacity = "0.0";
                el.style.opacity = 1.0 - ratio;
                el.style.transform = "scale("+(1.0 - ratio)+")";
            }
        },
        "from top": {
            max: 6,
            begin: function(el){
                el.style.transform = "scale(1,0)";
            },
            end: function(el){
                el.style.transform = "";
            },
            step: function(el,step,max){
                var ratio = step / max;

                if(reverse){
                    ratio = 1 - ratio;
                }

                el.style.opacity = "0.0";
                el.style.opacity = 1.0 - ratio;
                el.style.transformOrigin = "top";
                el.style.transform =
                    "scale(1,"+(1.0 - ratio)+")";
            }
        }
    };

    if(effects[effect] == undefined){
        console.error("Animation '" + effect + "' does not exist.");
        return;
    }

    var effect = effects[effect];

    /* reverse begin and end */
    if(reverse == true){
        var tmp = effect.begin;
        effect.begin = effect.end;
        effect.end = function(el){
            // Hide before to prevent visual glitch
            hide(el);
            tmp(el);
        };
    }

    animate(el, effect);
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
function flash(el){
    var options = {
        max: 2,
        time_step: 300,
        begin: function(el){
            el.classList.add("flashing");
        },
        end: function(el){
            el.classList.remove("flashing");
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

    socket.on("user data", function(data){
        shell.on_user_data(data);
    });

    socket.on("sheet",function(sheet){
        shell.on_sheet(sheet);
    });

    socket.on("user count",function(count){
        shell.on_user_count(count);
    });

    socket.on("definitive edit",function(data){
        shell.on_edit_cell(data);
    });

    socket.on("cell saved",function(data){
        shell.on_cell_saved(data);
    });
    
    socket.on("live edit",function(data){
        shell.on_live_edit(data);
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

    exports.close = function(){
        socket.close();
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

    exports.edit_cell = function(index, value, method){
        socket.emit("definitive edit", {
            number: index,
            content: value,
            method: method
        });
    };

    
    exports.live_edit_cell = function(index, value){
        socket.emit("live edit", {
            number: index,
            content: value,
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

    /* Less essential functionnality after this point */

    // stats

    socket.on("sheet visit count", function(num){
        shell.on_visit_count(num);
    });

    return exports;
}

function mathjs_compute_engine(){

}


var href = window.location.href;

var is_sheet = href.match(/\/sheet\/(.*)/);
var is_new_challenge = href.match(/\/new-challenge/);
var is_landing = qsa(".landing").length > 0? true: false;

if(is_sheet){
    // In a sheet
    var namespace = /\/sheet\/(.*)/g.exec(href)[1];

    var user = User();

    // Start everything
    // Start calculator
    var calc = livecalc(qsa("livecalc")[0], namespace, user);
    var chat = livechat(qsa("livechat")[0], namespace, calc.socket, user);

    var net_engine = calc.net_engine;
    
    function init_sheet_panel(root_el){
        var panel = qsa(".sheet-panel")[0];

        var lock_sheet_button = subqsa(
            root_el,
            "button[name='lock-sheet']"
        )[0];

        lock_sheet_button.onclick = function(){
            if(namespace == "demo"){
                modal_inform("This sheet is the public demo, it can't be locked.");
                return;
            }

            modal_yesno(
                "This action cannot be undone. " +
                    "Nobody will be able to modify this " +
                    "sheet after you click \"yes\". " +
                    "Do you really want to lock the sheet?",
                function(yes){
                    if(yes){
                        net_engine.lock_sheet();
                    }
                });
        };

        {
            // New copy button
            var new_copy_button = subqsa(
                root_el,
                "button[name='new-copy']"
            )[0];
            
            new_copy_button.onclick = function(){
                window.location.href = "/copy/"+namespace;
            }
        }

        {
            // View JSON button
            var view_json_button = subqsa(
                root_el,
                "button[name='view-json']"
            )[0];
            
            view_json_button.onclick = function(){
                var json = calc.get_json();
                modal_inform(json);
            }
        }

        {
            // Visit count
            var visit_count = subqsa(panel, ".visit-count")[0];
            
            calc.on_visit_count = function(count){
                visit_count.textContent = count;
            };
        }
        
    }
    
    init_sheet_panel(calc.el);

    
    calc.set_chat(chat);

    resizeable_sidebar_box(function(proportion){
        chat.resize(1-proportion);
    });
    
    function resizeable_sidebar_box(callback){
        // Make chat + palette resizable
        var resizable_header = qsa(".sidebar-resize-header")[0];
        var dragging = false;
        var initial_pos = 0;
        var upper_box = calc.palette;
        var lower_box = chat.root_el;

        resizable_header.addEventListener("mousedown",function(e){
            e.preventDefault();
            dragging = true;
        });


        resizable_header.addEventListener("mouseup",function(e){
            dragging = false;
        });

        document.body.addEventListener("mousemove",function(e){
            if(dragging){
                var current_pos = e.clientY;
                var proportion = current_pos / window.innerHeight;

                proportion = clip(proportion, 0.2,0.8);
                
                var upper_proportion =
                    parseInt(proportion * 100) + "%";
                var lower_proportion =
                    parseInt((1-proportion) * 100) + "%";

                upper_box.style.height = upper_proportion;
                lower_box.style.height = lower_proportion;

                callback(proportion);

                function clip(val, min, max){
                    if(val > min){
                        return val < max? val :max;
                    } else {
                        return min;
                    }
                }
            }
        });
    }

    // Start documentation
    init_doc(calc);
} else if (is_landing){
    // TODO: create something nice but easy on CPU for background
} else if (is_new_challenge){
    var calc = livecalc(qsa("livecalc")[0]);
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
    content.innerHTML = content.innerHTML.replace(/\n/g,"<br>");
    document.body.appendChild(overlay);
    overlay.appendChild(modal);

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

function modal_inform(message){
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
function modal_yesno(message, callback){
    var buttons = [
        {
            text: "Yes",
            action: function(modal){
                callback(true);
                modal.close();
            }
        },
        {
            text: "No",
            action: function(modal){
                callback(false);
                modal.close();
            }
        }
    ];

    return modal(message, buttons);
}

console.log("Hello!");
console.log("Fork me on http://github.com/antoineMoPa/livecalc !");
