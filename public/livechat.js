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
