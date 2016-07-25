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
var is_challenge = href.match(/\/challenge/);
var is_landing = qsa(".landing").length > 0? true: false;

if(is_sheet){
    // In a sheet
    var namespace = /\/sheet\/(.*)/g.exec(href)[1];

    var user = User();

    // Start everything
    // Start calculator
    var calc = livecalc(qsa("livecalc")[0], {
        namespace: namespace,
        user: user
    });
    var chat = livechat(qsa("livechat")[0], namespace, calc.socket, user);

    // This thing communicates with the server
    var net_engine = calc.net_engine;

    // Render documentation
    var small_doc_container =
        subqsa(calc.el, ".small-doc-container")[0];
    
    render("small-doc", small_doc_container);
    
    function init_sheet_panel(root_el){
        // Render panel
        var panel_container =
            subqsa(root_el, ".sheet-panel-container" )[0];
        render("sheet-panel", panel_container);
        
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

    // Init header
    
    var header_container = qsa(".livecalc-header-container")[0]
    render("livecalc-header", header_container);
    
    var sheet_state = subqsa(calc.el, ".sheet-state")[0];
    var lock_panel = qsa(".panel-lock-sheet")[0];
        
    calc.on_update_state = function(params){
        if(params.locked){
            sheet_state.textContent = "This sheet is locked.";
            sheet_state.setAttribute("title","Modifications will not be saved. You can still open a copy (See bottom of the page).");
            hide(lock_panel);
        } else {
            sheet_state.textContent = "This sheet is public.";
            sheet_state.setAttribute("title","");
        }
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
} else if (is_challenge){

    // Challenge form code
    
    var initial = livecalc(qsa("livecalc.initial-content")[0]);
    var validator = livecalc(qsa("livecalc.validator")[0],{
        one_cell: true
    });
    
    var form = qsa("form.challenge-form")[0];
    var initial_content_input =
        qsa("input[name='initial_content']")[0];
    var validator_input =
        qsa("input[name='validator']")[0];

    // on submit:
    // Take livecalc jsons and store them in variables
    form.onsubmit = function(){
        initial_content_input.value = initial.get_json();
        validator_input.value = validator.get_json();

        form.submit();
        
        return false;
    };
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

{
    // init delete buttons
    
    var buttons = qsa(".delete.post-button");
    
    for(var i = 0; i < buttons.length; i++){
        var b = buttons[i];

        b.onclick = function(){
            var url = b.getAttribute("data-url");
            var json = b.getAttribute("data-params");
            var params = JSON.parse(json);
            
            please.post(url,params,{promise:true})
                .then(function(){
                    // tr td button
                    var to_remove = b.parentNode.parentNode;
                to_remove.parentNode.removeChild(to_remove);
                });
        }
    }
}

console.log("Hello!");
console.log("Fork me on http://github.com/antoineMoPa/livecalc !");
