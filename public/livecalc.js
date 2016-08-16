function preprocess_katex(string){
    var s = string;
    
    if(typeof s != "string"){
        return;
    }
    
    // Replace greek letters chars
    s = s.replace(/α/g, ' \\alpha ');
    s = s.replace(/β/g, ' \\beta ');
    s = s.replace(/Γ/g, ' \\Gamma ');
    s = s.replace(/γ/g, ' \\gamma ');
    s = s.replace(/Δ/g, ' \\Delta ');
    s = s.replace(/δ/g, ' \\delta ');
    s = s.replace(/ε/g, ' \\varepsilon ');
    s = s.replace(/ζ/g, ' \\zeta ');
    s = s.replace(/η/g, ' \\eta ');
    s = s.replace(/Θ/g, ' \\Theta ');
    s = s.replace(/θ/g, ' \\theta ');
    s = s.replace(/ι/g, ' \\iota ');
    s = s.replace(/κ/g, ' \\kappa ');
    s = s.replace(/Λ/g, ' \\Lambda ');
    s = s.replace(/λ/g, ' \\lambda ');
    s = s.replace(/μ/g, ' \\mu ');
    s = s.replace(/ν/g, ' \\nu ');
    s = s.replace(/Ξ/g, ' \\Xi ');
    s = s.replace(/ξ/g, ' \\xi ');
    s = s.replace(/Π/g, ' \\Pi ');
    s = s.replace(/π/g, ' \\pi ');
    s = s.replace(/ρ/g, ' \\rho ');
    s = s.replace(/Σ/g, ' \\Sigma ');
    s = s.replace(/σ/g, ' \\sigma ');
    s = s.replace(/ς/g, ' \\sigma ');
    s = s.replace(/τ/g, ' \\tau ');
    s = s.replace(/υ/g, ' \\upsilon ');
    s = s.replace(/Φ/g, ' \\phi ');
    s = s.replace(/φ/g, ' \\Phi ');
    s = s.replace(/χ/g, ' \\chi ');
    s = s.replace(/Ψ/g, ' \\Psi ');
    s = s.replace(/ψ/g, ' \\psi ');
    s = s.replace(/Ω/g, ' \\Omega ');
    s = s.replace(/ω/g, ' \\omega ');
    
    // Replace other non-ascii characters
    s = s.replace(/[^\x20-\x7f]/g,"")
    
    return s;
}

function livecalc(root_el, settings){
    eeify_mathjs();

    var chat;
    var scope = default_scope();
    var current_focus = -1;
    var settings = settings || {};
    var one_cell = settings.one_cell || false;
    var user = settings.user || "";
    var namespace = settings.namespace || "";
    
    var networked = (namespace != "");
    
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

    if(networked){
        var net_engine = lc_network_engine(socket, exports);
        
        exports.net_engine = net_engine;
        exports.socket = socket;
    }
    
    exports.el = root_el;

    exports.on_sheet = function(sheet){
        var sheet = load_json(sheet);
        
        exports.on_sheet_title({
            title: sheet.params.title
        });
    };

    var initial_content = root_el.getAttribute("data-value") || "";
    
    if(initial_content != ""){
        load_json(initial_content);
    } else {
        new_cell("", false, true);
    }
    
    if(networked){
        if(user.has_id() == false){
            net_engine.ask_user_id();
        } else {
            net_engine.send_user_id(user.get_public_id());
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
        var user_count = subqsa(root_el, ".user-count")[0];
        var plural = count > 1;
        var count = parseInt(count);
        user_count.innerHTML = count + " user" + (plural? "s": "");
    };

    exports.on_edit_cell = function(data){
        var number = data.number;
        var content = data.content;
        var method = data.method;
        edit_cell(number, content, method);
        update_katex_input(data.number);
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

    exports.on_sheet_title = function(data){
        var title = subqsa(root_el,".sheet-title")[0];
        var input = subqsa(root_el,"input[name='sheet-title']")[0];
        title.innerText = data.title;
        input.value = data.title;
    };

    
    exports.on_focus_index = function(data){
        for(var i = 0; i < data.length; i++){
            var cell = find_cell(i);

            if(cell == null){
                return;
            }

            var users_info = cell.users_info;

            if(Array.isArray(data[i]) && data[i].length > 0){
                users_info.textContent = data[i].join(", ") +
                    " editing this cell";
            } else {
                users_info.textContent = "no one editing";
            }
        }
    };

    exports.on_delete_cell = function(data){
        if(one_cell){
            return;
        }

        var number = data.number;
        delete_cell(number, true);
    }

    if(networked){
        window.addEventListener( "beforeunload",
                                 net_engine.close );
    }
    
    function init_user_data(){
        exports.on_user_data = function(data){
            var username_field = qsa(".user-name")[0];
            
            user.set_public_id(data.public_id);
            username_field.innerText = data.username;
            chat.on_user_ready();
        };
    }
    
    if(networked){
        init_user_data();
    }

    /*
      Delete a cell. If remote, we don't send an event to the server.
     */
    function delete_cell(index, remote){
        if(one_cell){
            return;
        }

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

            if(!remote && networked){
                net_engine.delete_cell(index);
            }
        }
    }

    function delete_all(){
        if(one_cell){
            return;
        }

        cells.innerHTML = "";
    }

    function re_run(){
        scope = default_scope();
        for(var i = 0; i < cells.children.length; i++){
            calculate_cell(i);
        }
    }

    exports.re_run = re_run;

    exports.get_json = get_json;
    
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

        if(networked){
            update_state();
        }

        delete_all();

        for(var i = 0; i < cells.length; i++){
            new_cell(cells[i], false, false);
        }

        if(params.locked == true){
            modal_inform(
                "This sheet is locked for edition.\n" +
                    "Edits will not be saved or sent to other users.\n" +
                    "But don't worry,\n" +
                    "you can still try things, "+
                    "use the chat and open a copy."
            );
        }
        
        re_run();
        focus(0);
        return data;
    }

    exports.load_json = load_json;
    
    if(networked){
        function update_state(){
            if(exports.on_update_state != undefined){
                exports.on_update_state(params);
            }
        }

        update_state();
    }
    
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

        find_cell(index).focus_element.focus();
        send_focus(index);
    }

    exports.focus = focus;

    function send_focus(index){
        if(index == null){
            index = -1;
        }
        current_focus = index;
        if(networked){
            net_engine.send_focus(index);
        }
    }

    function cell_state_unsaved(index){
        var cell = find_cell(index);
        var cell_state = cell.cell_state;
        cell_state.innerText =
            "Cell not saved. Press Shift+Enter/go to save.";
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
            type: el.getAttribute("data-type"),
            element: el,
            focus_element: subqsa(el, ".livecalc-focus-element")[0],
            input: subqsa(el, ".livecalc-input")[0],
            button: subqsa(el, ".livecalc-go-button")[0],
            output: subqsa(el,".livecalc-output")[0],
            secondary_output: subqsa(el,".livecalc-secondary-output")[0],
            users_info: subqsa(el,".users-info")[0],
            cell_state: subqsa(el,".cell-state")[0],
            katex_input: subqsa(el,".katex-input")[0],
            katex_output: subqsa(el,".katex-output")[0],
            plot: subqsa(el,".plot")[0]
        };
    }

    exports.find_cell = find_cell;

    function update_indices(){
        var i = 0;
        for(i = 0; i < cells.children.length; i++){
            var cell = cells.children[i];
            cell.setAttribute("data-index", i);
            subqsa(cell,".livecalc-focus-element")[0]
                .setAttribute("tabindex", i + 1);
        }
        cell_count = i;
    }

    function edit_cell(number, content, method){
        grow_to(number);
        
        if(method == "insert"){
            // Add a new cell
            new_cell(content, false, false, number);
        } else {
            // Update the field
            var content = JSON.parse(content);
            var cell_data = find_cell(number);
            var field = cell_data.input;
            
            field.value = content.value;

            // Call updater function
            var type_name = cell_data.type;
            var cell_updater =
                cell_types[type_name].on_update || function(){};
            
            var input = cell_data.focus_element;
            
            cell_updater(cell_data.element);
        }

        calculate_cell(number);
    }

    /* To add cells if required*/
    function grow_to(number){
        if(one_cell){
            return;
        }
        var from = cells.children.length;
        var to = number;

        for(i = from; i <= to; i++){
            new_cell("", false, false);
        }
    }

    function serialize(index){
        var cell_data = find_cell(index);
        var type_name = cell_data.type;
        
        var get_value = cell_types[type_name].get_value ||
            function(){
                var input = cell_data.input;
                return input.value;
            };

        var value = get_value(cell_data.element);

        var data = {
            type: cell_data.type,
            value: value
        };

        return JSON.stringify(data);
    }
    
    function insert_cell_at(index, send_data, type, callback){
        if(one_cell){
            return;
        }

        new_cell("", send_data, true, index, type);
        callback();
    }

    /*
      Adds a new cell to the sheet
      Can be at a given position
      
      content can be a string of a json
      
      ex:
      {
         "type": "mathjs",
         "value": "1+1"
      }
      
      set send_data to true if you want 
      to update data on server
      
      `type` will be deprecated soon and 
      the json value will be used
      
     */
    function new_cell(content, send_data, animate, at_index, type){
        if(one_cell && cell_count == 1){
            return;
        }

        // Default type
        var type = type || "mathjs";
        var content = content || "";
        
        // Look wether this is JSON
        // ( some cells are only a string,
        //   then we assume mathjs type )
        try{
            var content = JSON.parse(content);
            type = content.type || "mathjs";
        } catch (e){
            content = {
                type: "mathjs",
                value: content
            }
        }
        
        var exports = {};
        var method = "append";

        if(at_index == undefined || at_index < 0){
            at_index = -1;
        } else {
            method = "insert";
        }

        cell_count++;
        
        var cell;

        cell = dom(load_template("livecalc-cell").content);

        // Call the extension's on_create method
        cell_types[type].on_create(cell, content, exports);
        cell.setAttribute("data-type", type);
        
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
        var type_name        = cell_data.type;
        var element          = cell_data.element;
        var input            = cell_data.input;
        var focus_element    = cell_data.focus_element;
        var button           = cell_data.button;
        var output           = cell_data.output;
        var cell_state       = cell_data.cell_state;
        var secondary_output = cell_data.secondary_output;

        if(animate == true){
            appear(cell);
        }

        var buttons = subqsa(cell, ".add-cell-buttons")[0]
        var add_cell_button = subqsa(buttons, ".mathjscell")[0];
        
        // Add buttons for all cell types
        // Wrapped in function to protect scope
        (function(){
            // Create buttons for all cell types
            for(i in cell_types){
                var type_name = i;
                var type = cell_types[i];
                var text = type.button_html;
                var type_button =
                    dom("<span class='button'>"+text+"</span>");
                
                init_click(type_button, type_name);
                
                buttons.appendChild(type_button);
            }
            
            function init_click(type_button, type_name){
                type_button.onclick = function(){
                    var index = get_index();
                    insert_cell_at(index, true, type_name,function(){
                        focus(index);
                    });
                };
            }
        })();
        
        // If this is one-cell sheet,
        // hide buttons that would add more cells
        if(one_cell){
            buttons.parentNode
                .removeChild(buttons);
        }
        
        input.setAttribute("value", content.value);

        if(secondary_output != undefined){
            hide(secondary_output);
        }

        function get_index(){
            return parseInt(cell.getAttribute("data-index"));
        }

        exports.get_index = get_index;

        function get_value(){
            return focus_element.value;
        }

        function calculate(){
            calculate_cell(get_index());
        };
        
        focus_element.addEventListener("click",function(){
            send_focus(get_index());
        });

        /* lost focus */
        focus_element.addEventListener("blur",function(){
            send_focus(-1);
        });

        cell.calculate = calculate;

        {
            // manage delete cell button
            var delete_cell_button
                = subqsa(cell,".delete-cell-button")[0];

            delete_cell_button.onclick = function(){
                if(one_cell){
                    return;
                }

                delete_cell(get_index());
            };
        }
        
        var operation_keys = ["+","-","*","/"];

        {
            // Manage live edition and saving
            
            var live_edit_data = {
                time_threshold: 350,
                last_live_edit_send: time(),
                has_waiting_timeout: false
            };

            var input = focus_element;

            var last_value = input.value;
            
            function time(){
                return (new Date()).getTime();
            }
            
            input.onkeydown = function(e){
                var key_num = e.keyCode || e.which;
                var has_live_edit = true;
                var type_data = cell_types[type];

                // Some cell types require Shift+Enter
                // Other require Enter only
                var require_shift =
                    type_data.require_shift || false;

                // Defauls: only Enter
                var should_send = (e.keyCode == 13 && !e.shiftKey);

                // require_shift: Enter + Shift
                if(require_shift){
                    should_send = (e.keyCode == 13 && e.shiftKey);
                }
                
                if(should_send){
                    // Enter key
                    e.preventDefault();
                    if(get_value() != ""){
                        send_value(get_index());
                        go();
                        
                        // Edit will already be send
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
                    if(input.value != live_edit_data.last_value){
                        send_live_throttled();
                        // Inform user that
                        // data is not on server yet
                        cell_state_unsaved(get_index())
                    }
                }
                
                live_edit_data.last_value = input.value;
            }

            /* Send data, but not too often */
            function send_live_throttled(){
                var last_live_edit_send = live_edit_data.last_live_edit_send;
                var time_threshold = live_edit_data.time_threshold;
                var now = time();
                
                if(now - last_live_edit_send > time_threshold){
                    // If the right amount of time has elapsed
                    
                    // Update last send time
                    live_edit_data.last_live_edit_send = time();
                    
                    // Send
                    send_live_edit(get_index());
                    
                    // This also needed a place to be
                    // and the function already does the job
                    // of throttling
                    update_katex_input(get_index());
                    
                    live_edit_data.has_waiting_timeout = false;
                } else {
                    // Is there already a timeout waiting to happen?
                    // If so, we'll quit here and let it handle the task.
                    if(!live_edit_data.has_waiting_timeout){
                        // Postpone time
                        var postpone_time = now -
                            last_live_edit_send +
                            time_threshold;
                        
                        // Postpone with setTimeout
                        setTimeout(
                            send_live_throttled,
                            postpone_time
                        );
                        
                        // Hey, we set up a timeout,
                        // don't add a new one.
                        live_edit_data.has_waiting_timeout = true;
                    }
                }
            }
        }
        
        // Run at load
        update_katex_input(get_index());
        
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

        var on_save = cell_types[type_name].on_save || function(){};
        
        function go(){
            calculate();

            var index = get_index();

            update_katex_input(index);
            on_save(element);
            
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

    function update_katex_output(index, tex_content){
        var cell_data = find_cell(index);
        var katex_output   = cell_data.katex_output;
        katex_output.innerHTML = "";

        if( typeof renderMathInElement == "undefined" ||
            typeof katex == "undefined" ){
            // At least write the equation
            katex_output.textContent = tex_content;
            return;
        }
        
        if(content == ""){
            return;
        }
        
        var content;

        var tex_content = preprocess_katex(tex_content);
        
        var tex = "$$ "+tex_content+" $$";
        
        katex_output.innerText = tex;
        
        renderMathInElement(katex_output);
    }

    function update_katex_input(index){
        var cell_data = find_cell(index);
        var input           = cell_data.input;
        var katex_input     = cell_data.katex_input;

        if(katex_input == undefined){
            // No katex input? bye
            // example: text cells
            return;
        }

        if(cell_data.element.classList.contains("less-detail") != -1){
            // Avoid computing everyting if no details are shown
            return;
        }
        
        katex_input.innerHTML = "";
        
        if(cell_data.type != "mathjs"){
            // TODO: would this happen anyway?
            return;
        }

        if( typeof renderMathInElement == "undefined" ||
            typeof katex == "undefined" ){
            return;
        }
        
        try{
            content = math.parse(input.value);
        } catch (e){
            return;
        }

        var tex = "$$"+content.toTex()+"$$";
        
        tex = preprocess_katex(tex);
        
        katex_input.innerText = tex;

        renderMathInElement(katex_input);
    }

    var last_send = (new Date()).getTime();
    
    function send_live_edit(index){
        // Basic verification to
        // get a warning if a dev error
        // allows too short send intervals someday
        var elapsed = (new Date()).getTime() - last_send;
        last_send = (new Date()).getTime();

        if(elapsed < 350){
            console.log("Warning: sending live edits too often!");
            console.log("time: ", elapsed);
            return;
        }
        
        var cell_data = find_cell(index);
        var value = serialize(index);

        if(networked){
            net_engine.live_edit_cell(index, value);
        }
    }
    
    exports.on_live_edit = on_live_edit;
    
    function on_live_edit(data){
        var cell_data = find_cell(data.number);
        var type_name = cell_data.type;

        var input = cell_data.focus_element;

        var content = JSON.parse(data.content);
        input.value = content.value;
        
        var cell_updater =
            cell_types[type_name].on_update || function(){};
        
        cell_updater(cell_data.element);
    }
    
    function send_value(index, method){
        if(!networked){
            return;
        }

        var method = method || "append";
        
        var value = serialize(index);

        net_engine.edit_cell(index, value, method);
    }

    function cell_error(cell, error){
        var error = error.toString();
        cell.output.textContent = error;
        cell.element.classList.add("has-error");
    }
    
    function calculate_cell(index){
        var cell_data = find_cell(index);

        if(cell_data.type != "mathjs"){
            return;
        }
        
        currently_calculated_cell = cell_data;
        var cell = cell_data.element;
        var plot_el = cell_data.plot;
        var input = cell_data.input;
        var output = cell_data.output;
        var secondary_output = cell_data.secondary_output;
        var value = input.value;
        var math_value = value;

        // Remove comments
        math_value = math_value.replace(/\/\/(.*)($|\n)/g, "");
        
        plot_el.innerHTML = "";
        hide(secondary_output);

        var comment_pos = value.indexOf("//");

        var text = ee_parse(math_value);
        var has_error = false;
        var error = "";
        
        // Evaluate and display errors/result
        try{
            var result = math.eval(text, scope);
            scope["ans"] = result;
        } catch (exception){
            console.error(exception);
            error = exception.toString();
            output.textContent = error;
            has_error = true;
        }

        cell.classList.remove("has-error");
        
        // Manage level of detail
        if(has_error){
            cell.classList.add("has-error");
        }
        
        if(has_error){
            return;
        }
        
        secondary_output.innerHTML = "";
        update_katex_output(index, "");
        
        var tex_output = "";
        
        if(text == ""){
            return;
        } else if(result != undefined){
            if(typeof result == "function"){
                output.textContent = "[function]";
                tex_output = "";
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
                tex_output = final_output;
            } else {
                output.textContent = result;
                tex_output = result;
            }

            // If there is an image, render it
            if (result.isImage){
                result.appendTo(plot_el);
            }

            // If this is a result set for a multiline input
            // Render all images
            if(result.isResultSet){
                for(var i = 0; i < result.entries.length; i++){
                    var curr_entry = result.entries[i];
                    if(curr_entry.isImage){
                        curr_entry.appendTo(plot_el);
                    }
                }
            }
            
            if(tex_output != ""){
                try{
                    tex_output = math.parse(tex_output.toString()).toTex();
                } catch (e) {
                    console.error(e + "");
                }
                
                update_katex_output(index, tex_output);
            }
        
        } else {
            output.textContent = "[undefined]";
            return;
        }
        
        flash(output);
    }

    /*
      Add some useful stuff to math.js
      
      Name history: this app was once named eecalc
      (for electrical engineering calculator)
    */
    function eeify_mathjs(){
        // Make rawargs true
        plot.rawArgs = true;
        
        // Verify if we already did this
        if(math.LC_TWEAKED){
            return;
        }

        function shader_func(args, math, scope){
            var cell = currently_calculated_cell;
            
            var canvas = new Image();

            var exp;
            
            if( args[0].items != undefined &&
                args[0].items.length == 3 ){
                // this is an array rgb
                exp = [
                    parse_arg(args[0].items[0]),
                    parse_arg(args[0].items[1]),
                    parse_arg(args[0].items[2])
                ];
            } else {
                // this is only an expression
                exp = parse_arg(args[0]);
            }

            shader(
                exp,
                eval_arg(args[1], math, scope),
                eval_arg(args[2], math, scope),
                canvas
            );
            
            return canvas;
        }

        function zfractal_func(args, math, scope){
            var canvas = new Image();
            
            zfractal(
                parse_arg(args[0]), // Expression
                eval_arg(args[1], math, scope), // Iterations
                eval_arg(args[2], math, scope),  // size
                canvas
            );
            
            return canvas;
        }
        
        shader_func.rawArgs = true;
        zfractal_func.rawArgs = true;
        
        var custom_functions = {
            /* Parallel resistors */
            LC_TWEAKED: true,
            LL: function(a,b){
                var num = 0;
                for(i in arguments){
                    var arg = arguments[i];
                    num += 1/arg;
                }
                return 1 / num;
            },
            rule: function(number, size){
                var cell = currently_calculated_cell;
                
                var canvas = new Image();
                
                rule(number, size, canvas)
                
                return canvas;
            },
            shader: shader_func,
            plot: plot,
            pplot: pplot,
            zfractal: zfractal_func,
            "π": math.pi
        };

        custom_functions.zfractal.toTex = function(node, options){
            var exp =  parse_arg(node.args[0]);
            exp = exp.replace(/"/g,"");
            exp = ee_parse(exp);
            return "z \\rightarrow " + exp;
        };

        // Import what we just created
        math.import(custom_functions);
    }
    
    /*
      Cellular automata
     */
    function rule(number, size, canvas){
        var number = parseInt(number);
        
        if(number < 0 || number > 255){
            throw "Number should be between 0 and 255";
        }

        var grid_size = size || 100;
        
        var pixel_size = 4;

        if(size > 100){
            pixel_size = 2;
        }
        if(size > 200){
            pixel_size = 1;
        }
        
        var width = grid_size;
        var height = grid_size;
        
        var can = canvas.getCanvas();
        var ctx = canvas.getContext();
        
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

    /*
      Tool to be able to parse both plot(sin(x)) and plot("sin(x)")
      
      (works with rawArgs={true or false})
      
      @param arg an argument
      @return expression, a string
      
     */
    function parse_arg(arg){
        var expression;
        if(arg.valueType == "string"){
            expression = arg.value;
        } else {
            expression = arg.toString();
        }
        return expression;
    }

    /*
      Tool to be able to evaluate func(variable) and func("variable") and func(40)
      
      (works with rawArgs={true or false})
      
      @param arg an argument
      @param math a math.js instance
      @param scope the scope
      @return a value
      
     */
    function eval_arg(arg, math, scope){
        var expression;

        if(arg == undefined){
            return; // return undefined
        }
        
        if(arg.valueType == "string"){
            expression = arg.value;
        } else {
            expression = arg.toString();
        }

        return math.eval(expression, scope);
    }

    
    /*
      Shader
    */
    function shader(expression, width, height, canvas){
        var number = parseInt(number);
        var width = width;
        var height = height || width;
        var has_colors = Array.isArray(expression);
                
        width = parseInt(width) || 200;
        height = parseInt(height) || 200;
        
        can = canvas.getCanvas();
        var ctx = can.getContext("2d");
        
        can.width = width;
        can.height = height;
        
        var imgdata = ctx.createImageData(width, height);

        // Draw one actual canvas pixel
        function set_one_pixel(i,j,val){
            var index = 4 * (j * can.width + i);

            var r,g,b;

            // Is this color or gray?
            if(val.length == 3){
                r = val[0];
                g = val[1];
                b = val[2];
            } else {
                r = g = b = val[0];
            }
            
            // Set value
            imgdata.data[index + 0] = r;
            imgdata.data[index + 1] = g;
            imgdata.data[index + 2] = b;
            imgdata.data[index + 3] = 255;
        }
        
        if(has_colors){
            var exp = expression.map(function(e){
                return math.compile(e);
            });
        } else {
            var exp = math.compile(expression);
        }

        var zerox = width / 2;
        var zeroy = height / 2;

        /*
          
          The canvas (x,y):
          
             i ->
          j
          |
          v
                 zerox
          |-----------------|
          |-1,1          1,1|
          |                 |
          |       0,0       | zeroy
          |                 |
          |                 |
          |-1,-1         1,1|
          |-----------------|
          
         */
        
        // Parse screen and follow the rule to create new line
        for(var i = 0; i < width; i++){
            for(var j = 0; j < height; j++){
                scope.x = (i - zerox)/zerox;
                scope.y = (zeroy - j)/zerox;

                if(has_colors){
                    // Evaluate each (r,g,b) colors' expression
                    var val = exp.map(function(color_exp){
                        return color_exp.eval(scope);
                    });
                } else {
                    var val = [exp.eval(scope)];
                }

                // Tweak the numbers
                var val = val.map(function(el){
                    // bring -1 to 0
                    el = el + 1;
                    
                    // Bring 2 to 1
                    el = el / 2;
                    
                    return Math.floor(el*255)
                });

                set_one_pixel(i, j, val);
            }
        }
        
        ctx.putImageData(imgdata,0,0);
        
        // We must return a value
        return "";
    }
    
    // Normal plot
    // ex: plot("sin(x)")
    function plot(args, math, scope){
        var functions_data = [];

        for(var i in args){
            var expression = args[i];
            var fn;
            var valueType = expression.valueType || "";
            
            if(valueType == "string"){
                // String was given
                fn = expression.value;
            } else {
                // rawArg was given
                fn = expression.toString();
            }
            
            functions_data.push({
                sampler: 'builtIn', /* To use math.js */
                graphType: 'polyline', /* To use math.js */
                fn: fn,
                scope: scope
            });
        }

        plot_system(functions_data, {
            title: expression
        });
    }

    // Polar plot
    // ex: pplot("sin(theta)")
    function pplot(){
        var functions_data = [];
        var args = [];

        // Copy arguments
        for(var i = 0; i < arguments.length; i++){
            args.push(arguments[i]);
        }
        
        var plot_range = [-Math.PI,Math.PI];

        // If 2 last args evaluate to a number, use them as
        // range and remove from args
        // (so that we don't plot them as 2 functions)
        try{
            var r1 = math.eval(args[args.length - 2], scope);
            var r2 = math.eval(args[args.length - 1], scope);

            // Ok we have a range
            plot_range[0] = r1;
            plot_range[1] = r2;

            // Remove these elements
            args.splice(args.length - 2, 2);
        } catch (e){
            console.log(e);
            // do nothing
            // keep default range
        } finally {
            for(i in args){
                var expression = args[i];
                
                functions_data.push({
                    sampler: 'builtIn', /* To use math.js */
                    graphType: 'polyline', /* To use math.js */
                    fnType: 'polar',
                    range: plot_range,
                    r: expression,
                    scope: scope
                });
            }
        
            return plot_system(functions_data, {
                title: expression
            });
        }
    }
    
    function plot_system(functions_data, settings){
        var plot_el = currently_calculated_cell.plot;
        var fullscreen_button = render("plot-interact-button");
        var div_width = plot_el.clientWidth;
        var settings = {};

        var title = settings.title || "Plot";
        
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
            fullscreen(title, function(content){
                functionPlot({
                    target: content,
                    width: window.innerWidth,
                    height: window.innerHeight - 100,
                    disableZoom: false,
                    data: functions_data,
                    grid: true
                });
            });
        }
        
        // We must return a value
        return "";
    }

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

    function zfractal(expression, iterations, size, canvas){
        var iterations = iterations || 10;

        var pixel_ratio = 1;

        var size = size || 200;

        var width = size;
        var height = size;
        
        var can = canvas.getCanvas();
        var ctx = canvas.getContext();
        
        // Make it square
        can.width = width * pixel_ratio;
        can.height = height * pixel_ratio;

        exp = math.compile(expression);
        
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
                    var input = cell.focus_element;
                    on_click(el, input,{
                        go: function(){
                            calculate_cell(current_focus);
                            
                            send_value(current_focus);
                            
                            update_katex_input(current_focus);
                            
                            // If last cell, add new cell
                            if(current_focus == cell_count - 1){
                                new_cell("", true, true, "mathjs");
                            }
                        }
                    });
                } else if (chat.has_focus){
                    on_click(el, chat.textarea);
                } else {
                    modal_inform(
                        "Nothing is selected."+
                            " Tip: Click on a cell's input "+
                            "field or on the chat, then use palette."
                    );
                }
            }
        });

        function on_click(button, input, callbacks){
            var value = button.innerText;
            var callbacks = callbacks || {};

            // Does this button have a custom action?
            if(button.hasAttribute("action")){
                // Execute it instead
                var action = button.getAttribute("action");

                if(callbacks[action] != undefined){
                    var cb = callbacks[action];
                    cb();
                }
                
                return;
            }
            
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
        };
    }
}
