var cell_types = cell_types || {};

(function(){
    var calc;
    
    function switch_state(element, to_state){
        // Get state
        var state = element.getAttribute("data-state");

        if(to_state != undefined){
            state = to_state;
        } else {
            if(state == "editing"){
                state = "not-editing";
            } else {
                state = "editing";
            }
        }
        
        element.setAttribute("data-state",state);
    }
    
    function update_preview(element){
        // Find elements
        var textarea = subqsa(element, "textarea")[0];
        var viewer = subqsa(element, ".tct-viewer")[0];
        var val = textarea.value;
        var input = subqsa(element, ".livecalc-input")[0];
        
        // Update preview
        input.value = val;
        viewer.innerHTML = "";

        viewer.innerText = val;
        
        if( typeof renderMathInElement == "undefined" ||
            typeof katex == "undefined" ){
            return;
        }

        val = val.replace(
                /\$\$((.|\n)*)\$\$/g,
            function(val){
                val.replace(/\n/g,"");
                return preprocess_katex(val);
            }
        );
        
        viewer.innerText = val;

        try{
            // Render equations $$ 1+1 $$
            renderMathInElement(viewer);
        } catch (e){
            // do nothing
        }
    }

    cell_types["text"] = {
        require_shift: true,
        button_html: "text",
        on_save: function(element){
            switch_state(element);
            update_preview(element);
        },
        on_update: function(element){
            update_preview(element);
        },
        on_create: function(element, content, calc_param){
            calc = calc_param;

            var extension_content = subqsa(
                element,
                ".extension-content"
            )[0];
            
            element.classList.add("text-cell");
            
            var dom_content = render("text-cell-type");
            extension_content.appendChild(dom_content);
            
            var input = subqsa(element, ".livecalc-input")[0];
            var textarea = subqsa(element, "textarea")[0];
            var edit_button = subqsa(element, "button[name='tct-edit']")[0];

            var viewer = subqsa(element, ".tct-viewer")[0];

            textarea.addEventListener("focus",function(){
                switch_state(element, "editing");
            });

            // Show editor on viewer click
            // & on edit button click
            viewer.onclick = 
                edit_button.onclick = function(){
                    switch_state(element);
                    textarea.focus();
                };
            
            // Initialize content
            textarea.value = content.value;

            // Show editor on create if content is empty
            if(content.value.length == 0){
                switch_state(element, "editing");
            } else {
                switch_state(element, "not-editing");
            }
            
            // Make data updatable
            textarea.addEventListener("change", onchange);
            textarea.addEventListener("keyup", onchange);
            
            onchange();
            
            // Update data
            function onchange(){
                var val = textarea.value;
                input.value = val;
                update_preview(element);
            }

            // Render any equation that was there initially
            update_preview(element);
        },
        get_value: function(element){
            var textarea = subqsa(element, "textarea")[0];
            return textarea.value;
        }
    };
})();
