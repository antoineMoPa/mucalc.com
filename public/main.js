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
function flash(el,color,text_color){
    var original_color, original_text;
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

function livecalc(root_el, namespace, user){
    eeify_mathjs();
    var chat;
    var scope = default_scope();
    var current_focus = -1;

    function default_scope(){
        return {
            ans: undefined
        };
    }

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

    new_cell("", true, true);

    exports.on_sheet = function(sheet){
        load_json(sheet);
    };

    var user_count = subqsa(root_el, ".user-count")[0];

    if(user.has_id() == false){
        net_engine.ask_user_id();
    } else {
        net_engine.send_user_id(user.get_public_id());
    }

    {
        // share url activation
        var url_share_button = qsa(".url-popup-modal")[0];

        url_share_button.onclick = function(e){
            e.preventDefault();
            var link = url_share_button.href;
            modal_inform(link);
        }
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
                    modal.close();
                }
            },
            {
                text: "Go back to homepage",
                action: function(modal){
                    window.location.href = "/";
                    modal.close();
                }
            }
        ];

        modal(message, buttons);
    };

    exports.set_chat = function(c){
        chat = c;
    };

    exports.on_user_count = function(count){
        var plural = count > 1;
        var count = parseInt(count);
        user_count.innerHTML = count + " user" + (plural? "s": "");
    };

    exports.on_edit_cell = function(data){
        var number = data.number;
        var content = data.content;
        var method = data.method;
        edit_cell(number, content, method);
    };

    exports.on_cell_saved = function(data){
        cell_state_saved(data.number);
    };
    
    exports.on_sheet_locked = function(data){
        // data.initiator is normally sanited on server
        modal_inform( "Sheet was locked by \"" +
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

            var users_info = cell.users_info;

            if(Array.isArray(data[i]) && data[i].length > 0){
                users_info.textContent = data[i].join(", ") + " editing this cell...";
            } else {
                users_info.textContent = "";
            }
        }
    };

    exports.on_delete_cell = function(data){
        var number = data.number;
        delete_cell(number, true);
    }

    window.addEventListener("beforeunload", net_engine.close);

    var nickname = "";

    function init_user_data(){
        var nickname_input = subqsa(root_el, ".nickname input")[0];
        var nickname_button = subqsa(root_el, ".nickname button")[0];
        var username_field = qsa(".user-name")[0];

        exports.set_nickname = function(new_nickname){
            nickname_input.value = new_nickname;
            nickname = new_nickname;
            username_field.innerText = nickname;
        };

        exports.on_user_data = function(data){
            user.set_public_id(data.public_id);
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
            flash(nickname_input,"#eee","#333");
            exports.send_nickname();
        }
    }

    init_user_data();

    function init_sheet_panel(){
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
                var json = get_json();
                modal_inform(json);
            }
        }

        {
            // Visit count
            var visit_count = subqsa(panel, ".visit-count")[0];
            
            exports.on_visit_count = function(count){
                visit_count.textContent = count;
            };
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
        scope = default_scope();
        for(var i = 0; i < cells.children.length; i++){
            cells.children[i].calculate();
        }
    }

    exports.re_run = re_run;

    function get_json(){
        var data = {};

        var count = cells.children.length;
        
        data.params = params;
        data.cells = [];

        for(var i = 0; i < count; i++){
            var input = find_cell(i).input;
            data.cells.push(input.value);
        }

        return JSON.stringify(data);
    }
    
    function load_json(data){
        var data = JSON.parse(data);
        var cells = data.cells;
        params = data.params;

        update_state();

        delete_all();

        for(var i = 0; i < cells.length; i++){
            new_cell(cells[i], true, false);
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
        current_focus = index;
        net_engine.send_focus(index);
    }

    function cell_state_unsaved(index){
        var cell = find_cell(index);
        var cell_state = cell.cell_state;
        cell_state.innerText = "Cell not saved. Press enter/go to save.";
    }
    
    function cell_state_saved(index){
        var cell = find_cell(index);
        var cell_state = cell.cell_state;

        cell_state.innerText = "Cell saved";
    }

    function find_cell(index){
        var el = cells.children[index];

        if(el == undefined){
            return null;
        }

        return {
            element: el,
            input: subqsa(el, ".livecalc-input")[0],
            button: subqsa(el, ".livecalc-go-button")[0],
            output: subqsa(el,".livecalc-output")[0],
            secondary_output: subqsa(el,".livecalc-secondary-output")[0],
            users_info: subqsa(el,".users-info")[0],
            cell_state: subqsa(el,".cell-state")[0],
            text_part: subqsa(el,".text-part")[0],
            math_part: subqsa(el,".math-part")[0],
            plot: subqsa(el,".plot")[0]
        };
    }

    exports.find_cell = find_cell;

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

    function edit_cell(number, content, method){
        grow_to(number);

        if(method == "insert"){
            new_cell(content, false, false, number);
        } else {
            var field = find_cell(number).input;
            field.value = content;
        }

        calculate_cell(number);
    }

    /* To add cells if required*/
    function grow_to(number){
        var from = cells.children.length;
        var to = number;

        for(i = from; i <= to; i++){
            new_cell("", false, false);
        }
    }

    function insert_cell_at(index, send_data, callback){
        new_cell("", send_data, true, index);
        callback();
    }

    function new_cell(content, send_data, animate, at_index){
        var exports = {};
        var content = content || "";
        var method = "append";

        if(at_index == undefined || at_index < 0){
            at_index = -1;
        } else {
            method = "insert";
        }

        cell_count++;
        var cell = dom(load_template("livecalc-cell").content);

        if(at_index == -1){
            // Append at end
            cells.appendChild(cell);
        } else {
            // Append at index
            cells.insertBefore(
                cell,                       // Insert this
                find_cell(at_index).element // Before this cell
            );
        }

        // This should not be used anymore,
        // since it may change anytime.
        // use get_index()
        at_index = undefined;

        update_indices();

        var cell_data        = find_cell(get_index());
        var input            = cell_data.input;
        var button           = cell_data.button;
        var output           = cell_data.output;
        var text_part        = cell_data.text_part;
        var math_part        = cell_data.math_part;
        var cell_state        = cell_data.cell_state;
        var secondary_output = cell_data.secondary_output;

        if(animate == true){
            appear(cell);
        }

        var add_cell_button = subqsa(cell, ".add-cell-button .inner")[0];

        add_cell_button.onclick = function(){
            var index = get_index();
            insert_cell_at(index, true,function(){
                focus(index);
            });
        }

        input.setAttribute("value", content);

        /* Make sure inputs are shown on mouse click */
        text_part.addEventListener("click",function(){
            if(hidden(math_part)){
                // Show math part for edition
                show(math_part);
                appear(math_part,"from top");
                input.focus();
            } else {
                // Hide
                hide(math_part);
            }
        });

        // Hide these at beginning
        hide(text_part);
        hide(secondary_output);

        function get_index(){
            return parseInt(cell.getAttribute("data-index"));
        }

        exports.get_index = get_index;

        function get_value(){
            return input.value;
        }

        function calculate(){
            calculate_cell(get_index());
        };

        input.addEventListener("click",function(){
            send_focus(get_index());
        });

        /* lost focus */
        input.addEventListener("blur",function(){
            send_focus(-1);
        });

        cell.calculate = calculate;

        {
            // manage delete cell button
            var delete_cell_button
                = subqsa(cell,".delete-cell-button")[0];

            delete_cell_button.onclick = function(){
                delete_cell(get_index());
            };
        }
        
        var operation_keys = ["+","-","*","/"];

        var last_value = input.value;
        
        input.onkeydown = function(e){
            var key_num = e.keyCode || e.which;
            var has_live_edit = true;
            
            if(e.keyCode == 13 && !e.shiftKey){
                // Enter key
                e.preventDefault();
                if(get_value() != ""){
                    send_value(get_index());
                    go();

                    // Edit will already be send
                    has_live_edit = false;
                }
            } else if (e.keyCode == 38) {
                // Up arrow
                focus(get_index()-1);
            } else if (e.keyCode == 40) {
                // Down arrow
                focus(get_index()+1);
            } else if(e.code == "Backspace"){
                // Delete cell
                if(get_value() == ""){
                    delete_cell(get_index());

                    // delete_cell fires a delete event
                    // sending edit would be a problem
                    has_live_edit = false;
                }
            } else {
                // Detect if an operator
                // was inserted (+ - * /)
                // and wrap selected text
                for(var i in operation_keys){
                    var op = operation_keys[i];
                    if(e.key == op){
                        operation_keydown(e, op);
                    }
                }
            }

            // Live edits does not include
            // cell deletion
            if(has_live_edit){
                // Verify if value actually changed
                if(input.value != last_value){
                    send_live_throttled();
                    // Inform user that
                    // data is not on server yet
                    cell_state_unsaved(get_index())
                }
            }

            last_value = input.value;
            
            var last_live_edit_send = time();
            var time_threshold = 350;
            var has_waiting_timeout = false;
            
            /* Send data, but not too often */
            function send_live_throttled(){
                if(time() - last_live_edit_send > time_threshold){
                    send_live_edit(get_index());
                } else {
                    if(!has_waiting_timeout){
                        setTimeout(function(){
                            send_live_throttled();
                            has_waiting_timeout = false;
                        },
                                   time() - time_threshold
                                  );
                        has_waiting_timeout = true;
                    }
                }
            }
            
            function time(){
                return (new Date()).getTime();
            }
        }

        /*

          Manage text selection smartly
          when user types an operator + / - / * / '/'

          And move cursor to a practical position.

         */
        function operation_keydown(e, operation){
            var start = input.selectionStart;
            var end = input.selectionEnd;

            if(start != end){
                e.preventDefault();

                // By default, place cursor after operator
                var inside = false;

                if( operation == "+" ||
                    operation == "-"
                  ){
                    inside = true;
                }

                var after = ")" + operation + "[[cursor]]";

                if(inside){
                    after = operation + "[[cursor]]" + ")";
                }

                selection_wrap(input, "(", after, operation);
            }
        }

        function go(){
            calculate();

            var index = get_index();

            // If last cell, add new cell
            if(index == cell_count - 1){
                new_cell("", true, true);
            }
        }

        button.onclick = function(){
            send_value(get_index());
            go();
        };

        exports.calculate = calculate;

        input.focus();

        if(send_data){
            send_focus(get_index());
            send_value(get_index(), method);
        }

        return exports;
    }

    /*
      before_sel : something to place before selection
      after_sel : idem, after

      puts selections at [[cursor]] ans [[cursor-end]]
    */
    function selection_wrap(input, before_sel, after_sel, fallback, no_selection){
        var fallback = fallback || "";

        var start = input.selectionStart;
        var end = input.selectionEnd;

        // if the browser does not support this feature,
        // just add fallback at input end
        if(input.selectionStart == undefined){
            input.value += fallback;
            return;
        }

        // If there is no selection
        // add the appropriate value (no_selection) if present
        // or the fallback
        if(start == end){
            before_sel = "";
            after_sel = no_selection || (fallback + "[[cursor]]");
        }

        var val = input.value;
        var before = val.substr(0,start);
        var between = val.substr(start, end - start);
        var after = val.substr(end,val.length - end);

        var new_val = before;
        new_val += before_sel;
        new_val += between;
        new_val += after_sel;
        new_val += after;

        var new_start = new_val.indexOf("[[cursor]]");
        new_val = new_val.replace("[[cursor]]","");

        var new_end = new_val.indexOf("[[cursor-end]]");

        // Actually using [[cursor-end]]?
        if(new_end != -1){
            // Yes
            new_val = new_val.replace("[[cursor-end]]","");
        } else {
            // Nope, just place cursor
            new_end = new_start;
        }

        input.value = new_val;

        input.selectionStart = new_start;
        input.selectionEnd = new_end;
    }

    exports.new_cell = new_cell;

    function send_live_edit(index){
        var cell_data = find_cell(index);
        var input = cell_data.input;
        net_engine.live_edit_cell(index, input.value);
    }

    exports.on_live_edit = on_live_edit;
    
    function on_live_edit(data){
        var cell_data = find_cell(data.number);
        var input = cell_data.input;
        input.value = data.content;
    }
    
    function send_value(index, method){
        var method = method || "append";

        var cell_data = find_cell(index);

        var input = cell_data.input;
        
        net_engine.edit_cell(index, input.value, method);
    }

    function calculate_cell(index){
        var cell_data = find_cell(index);
        currently_calculated_cell = cell_data;
        var cell = cell_data.element;
        var text_part = cell_data.text_part;
        var math_part = cell_data.math_part;
        var plot_el = cell_data.plot;
        var input = cell_data.input;
        var output = cell_data.output;
        var secondary_output = cell_data.secondary_output;
        var value = input.value;
        var math_value = value;
        var text_comment = "";

        plot_el.innerHTML = "";
        show(math_part);
        hide(secondary_output);

        // Extract comment
        var comment_pos = value.indexOf("//");

        if(comment_pos != -1){
            text_comment = value.substr(comment_pos+2,value.length);
            math_value = value.substr(0,comment_pos);
        }

        if(text_comment != "" && math_value == ""){
            // Has comment but no math
            // Show only text part
            text_part.textContent = text_comment;
            show(text_part);
            hide(math_part);
            return;
        } else if (math_value != "" && text_comment == ""){
            // Has math but no comment
            // Show only math part
            text_part.textContent = "";
            hide(text_part);
            show(math_part);
        } else if (math_value != "" && text_comment != ""){
            // Has math and comment
            // Show math (includes comment anyway)
            show(math_part);
            hide(text_part);
        } else {
            // No value, no comment
            // Show only math
            show(math_part);
            hide(text_part);
            return;
        }

        var text = ee_parse(math_value);

        // Evaluate and display errors/result
        try{
            var result = math.eval(text, scope);
            scope["ans"] = result;
        } catch (exception){
            output.textContent = exception;
            return;
        }

        secondary_output.innerHTML = "";

        if(text == ""){
            return;
        } else if(result != undefined){
            if(typeof result == "function"){
                output.textContent = "[function]";
            } else if (typeof result == "number"){
                // Here, we will round values if needed
                var rounded = parseFloat(result.toPrecision(10));
                var final_output = "";

                // If we display a rounding, inform the user
                // and also show the non-rounded value.
                if(result != rounded){
                    final_output = rounded;
                    secondary_output.textContent =
                        "Raw float value: " +
                        result;
                    show(secondary_output);
                } else {
                    final_output = result;
                }

                output.textContent = final_output;
            } else {
                output.textContent = result;
            }
        } else {
            output.textContent = "[undefined]";
            return;
        }

        flash(output,"#09bc8a","#ffffff");
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
                wait_for_click(cell, function(){
                    rule(cell.plot, number)
                });
                return "";
            },
            plot: plot,
            zfractal: function(e,i,s){
                var cell = currently_calculated_cell;
                wait_for_click(cell, function(){
                    zfractal(cell.plot, e, i, s);
                });
                return "";
            },
            "π": math.pi
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

        plot_el.innerHTML = "";

        if(number < 0 || number > 255){
            throw "Number should be between 0 and 255";
        }

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

    function plot(){
        var plot_el = currently_calculated_cell.plot;
        var fullscreen_button = render("plot-interact-button");
        var div_width = plot_el.clientWidth;

        var functions_data = [];

        for(i in arguments){
            var expression = arguments[i];
            functions_data.push({
                sampler: 'builtIn', /* To use math.js */
                graphType: 'polyline', /* To use math.js */
                fn: expression
            });
        }


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
            data: functions_data,
            grid: true
        });

        plot_el.appendChild(fullscreen_button);

        fullscreen_button.onclick = function(){
            fullscreen(expression, function(content){
                functionPlot({
                    target: content,
                    width: window.innerWidth,
                    height: window.innerHeight - 100,
                    disableZoom: false,
                    data: functions_data,
                    grid: true
                });
            });

            /*
              callback(content_dom_element)
             */
            function fullscreen(title_text, callback){
                var fullscreen_el = render("fullscreen");
                var close_button = subqsa(fullscreen_el, ".close-button")[0];
                var content = subqsa(fullscreen_el, ".content")[0];
                var title = subqsa(fullscreen_el, ".fullscreen-title")[0];

                title.textContent = title_text;

                close_button.onclick = function(){
                    fullscreen_el.parentNode.removeChild(fullscreen_el);
                };

                document.body.appendChild(fullscreen_el);
                callback(content);
            }
        }

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

    var palette_el = qsa(".palette")[0];

    exports.palette = palette_el;

    if(palette_el){
        init_palette(palette_el);
    }

    function init_palette(palette){
        palette_el.addEventListener("mousedown",function(event){
            // Prevent focus loss to input
            event.preventDefault();
            event.stopPropagation();

            var el = event.target;

            // Is it a button ?
            if(el.tagName.toLowerCase() == "button"){
                var cell = find_cell(current_focus);

                if(cell != null){
                    var input = cell.input;
                    on_click(el, input);
                } else if (chat.has_focus){
                    on_click(el, chat.textarea);
                }
            }
        });

        function on_click(button, input){
            var value = button.innerText;

            // Are we using selection_wrap?
            if(button.hasAttribute("data-wrap-before")){
                var before = button.getAttribute("data-wrap-before");
                var after = "";
                var fallback = button.innerText
                var no_selection = fallback + "[[cursor]]";

                if(button.hasAttribute("data-wrap-after")){
                    after = button.getAttribute("data-wrap-after")
                }

                if(button.hasAttribute("data-no-sel")){
                    no_selection = button.getAttribute("data-no-sel")
                }

                selection_wrap(input, before, after, fallback, no_selection);

                return;
            }

            if(input.selectionStart != undefined){
                var offset = input.selectionStart;

                var curr_val = input.value; // Current input value
                var input_begin = curr_val.substr(0,offset);
                var input_end = curr_val.substr(offset,curr_val.length);

                if(offset != input.selectionEnd){
                    // If some text is selected, we'll replace it
                    // So erase that part

                    input_end = curr_val.substr(
                        input.selectionEnd,
                        curr_val.length
                    );
                }

                input.value =
                    input_begin +
                    value +
                    input_end;

                // Remove variable and place
                // user cursor
                var replace_var =
                    button.getAttribute("data-replace-var") || "";

                if(replace_var != ""){
                    var var_pos = value.indexOf(replace_var);
                    var var_len = replace_var.length;

                    // Select variable
                    input.selectionStart =
                        input_begin.length + var_pos;
                    input.selectionEnd =
                        input_begin.length + var_pos + var_len;
                } else {
                    // Place back mouse after what we inserted
                    var new_offset = input_begin.length +
                        value.length;

                    input.selectionStart = new_offset;
                    input.selectionEnd = new_offset;
                }
            } else {
                input.value += value;
            }
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
            var cell = calc.new_cell(code, true, true);
            cell.calculate();
            var dom_data = calc.find_cell(cell.get_index());
            show(dom_data.math_part);
        };
    }
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

    /*
      Note: This is full of ugly hacks to position and size
      The chat elements.
     */
    function resize(proportion){
        var winw = window.innerWidth;
        var winh = window.innerHeight;
        var proportion = proportion || 1/3;
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

    window.addEventListener("resize", resize);

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
        var user_id = user.get_public_id();

        for(var i = messages.length - 1; i >= 0; i--){
            var data = JSON.parse(messages[i]);
            var own = false;

            if(data.public_id == user_id){
                own = true;
            }

            var el = render_message(data, own);

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
        var el;
        if(own){
            el = render("livechat-sent-message");
        } else {
            el = render("livechat-received-message");
        }

        // Set the content
        var message = subqsa(el, ".content")[0];

        // Use textContent to avoid script injection
        message.textContent = data.message;

        // Clickable links
        message.innerHTML = message.innerHTML
            .replace(/(https?\:\/\/[^\n ]*)/g,"<a href='$1' target='_blank'>$1</a>");

        var sender = subqsa(el, ".sender")[0];

        // Put sender nickname
        sender.textContent = data.sender;

        // Remove newline at begining and end of string
        message.innerHTML = message.innerHTML.replace(/^[\s\n]*/g,"");
        // String end
        message.innerHTML = message.innerHTML.replace(/[\s\n]*$/g,"");
        // Replace newline inside message to <br>
        message.innerHTML = message.innerHTML.replace(/\n/g,"<br/>");

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
    var modal = render("modal-inform").children[0];
    var overlay = render("modal-overlay").children[0];
    var content = subqsa(modal, ".content p")[0];
    var buttons_container = subqsa(modal, ".buttons")[0];
    var buttons = buttons || [];

    content.textContent = message;
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
