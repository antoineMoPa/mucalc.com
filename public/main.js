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

function livechat(root_el, namespace, socket, user){
    render("livechat", root_el);

    var log = subqsa(root_el, ".message-log")[0];
    var textarea = subqsa(root_el, "textarea")[0];
    var button = subqsa(root_el, "button")[0];
    var exports = {};

    textarea.value = "";

    exports.root_el = root_el;

    exports.has_focus = false;
    exports.textarea = textarea;

    textarea.addEventListener("focus",function(){
        exports.has_focus = true;
    });

    textarea.addEventListener("blur",function(){
        exports.has_focus = false;
    });

    exports.die = function(){
        root_el.innerHTML = "";
    };

    var past_messages_loaded = false;

    exports.on_user_ready = function(){
        // Only do this once
        if(past_messages_loaded == false){
            // Now that we know the user id, we
            // load the messages
            // (and we will be able to mark "own" messages)
            socket.emit("load more messages",0);
            past_messages_loaded = true;
        }
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

    exports.resize = resize;
    var current_proportion = 1/3;
    
    /*
      Note: This is full of ugly hacks to position and size
      The chat elements.
     */
    function resize(proportion){
        var winw = window.innerWidth;
        var winh = window.innerHeight;
        var proportion = proportion || current_proportion;
        // Save it in case we need it.
        current_proportion = proportion;
        var scroll = window.scrollY || 0;

        /* set with to one column + margin */
        var w = (parseInt(winw)/4) - 10;

        var button_width = button.clientWidth;

        var chat_header = 15;
        var input_height = 40;
        var input_width = w - button_width - 60;
        var chat_height = parseInt(proportion * winh - input_height);

        textarea.style.width = (input_width)+"px";

        log.style.height = (
            chat_height - input_height - chat_header - 10
        ) + "px";
    }

    resize();

    window.addEventListener("resize", function(){
        resize();
    });

    button.addEventListener("click", submit);

    socket.on("new message", function(data){
        var el = render_message(data);

        log.appendChild(el);
        
        var system_message = false;
        
        if(data.public_id == -1){
            system_message = true;
            el.classList.add("system-message");
        }
        
        flash(el);
        scroll_bottom();
    });

    socket.on("own message", function(data){
        var el = render_message(data,true);
        log.appendChild(el);
        scroll_bottom();
    });

    socket.on("past messages", function(messages){
        var user_id = user.get_public_id();

        for(var i = messages.length - 1; i >= 0; i--){
            var data = JSON.parse(messages[i]);
            var own = false;
            var system_message = false;
            
            if(data.public_id == -1){
                system_message = true;
            }
            
            if(data.public_id == user_id){
                own = true;
            }

            var el = render_message(data, own);
            
            if(system_message){
                el.classList.add("system-message");
            }
            
            if(log.children[0] != undefined){
                log.insertBefore(el, log.children[0]);
            } else {
                log.appendChild(el);
            }
        }

        // While this is used only at page load:
        scroll_bottom();
    });

    function render_message(data, own){
        var el = render("livechat-message");

        if(own){
            el.classList.add("sent");
        } else {
            el.classList.add("received");
        }

        // Set the content
        var message = subqsa(el, ".content")[0];

        // Use textContent to avoid script injection
        message.textContent = data.message;

        // Clickable links
        message.innerHTML = message.innerHTML
            .replace(/(https?\:\/\/[^\n ]*)/g,"<a href='$1' target='_blank'>$1</a>");

        var sender = subqsa(el, ".sender")[0];

        var date = subqsa(el, ".date")[0];

        // Put sender name
        sender.textContent = data.sender;

        // Remove newline at begining and end of string
        message.innerHTML = message.innerHTML.replace(/^[\s\n]*/g,"");
        // String end
        message.innerHTML = message.innerHTML.replace(/[\s\n]*$/g,"");
        // Replace newline inside message to <br>
        message.innerHTML = message.innerHTML.replace(/\n/g,"<br/>");

        var raw_date = data.date || "";
        
        if(raw_date != ""){
            date.textContent = moment(raw_date).fromNow();
        }
        
        return el;
    }

    // Send chat message
    function submit(){
        var val = get_value();

        if(val != ""){

            // Only whitespace?
            if(val.match(/[^\s\n]/) == null){
                return;
            }

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

    var public_id = "";

    exports.has_id = function(){
        if(public_id == ""){
            return false;
        }
        if(public_id == ""){
            return false;
        }
        return true;
    }

    exports.get_public_id = function(){
        return public_id;
    }

    exports.set_public_id = function(id){
        public_id = id;
    }

    return exports;
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
