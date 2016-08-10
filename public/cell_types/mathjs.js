var cell_types = cell_types || {};

(function(){
    cell_types["mathjs"] = {
        button_html: "+",
        on_create: function(element, content){
            var extension_content = subqsa(
                element,
                ".extension-content"
            )[0];
            
            element.classList.add("mathjs-cell-type");
            
            var cell_state = "less-detail"
            
            element.classList.add("less-detail");
                        
            // Render content
            var ext_content = render("mathjs-cell-type");
            extension_content.appendChild(ext_content);
            
            var textarea = subqsa(element, "textarea")[0];

            // Set initial content
            textarea.value = content.value;

            // Adjust number of rows
            textarea.rows = content.value.split("\n").length;

            // Enable auto resizer (external lib.)
            autosize(textarea);
            
            // Enable toggle detail button
            var toggle_button = subqsa(element, ".toggle-detail")[0];
            
            toggle_button.addEventListener("click", switch_state);

            // Manage cell state (more / less details)
            function switch_state(){
                if(cell_state == "less-detail"){
                    cell_state = "more-detail";
                    element.classList.remove("less-detail");
                    element.classList.add("more-detail");
                    toggle_button.innerText = "Show less details";
                } else {
                    cell_state = "less-detail";
                    element.classList.add("less-detail");
                    element.classList.remove("more-detail");
                    toggle_button.innerText = "Show more details";
                }
            }

        },
        get_value: function(element){
            var textarea = subqsa(element, "textarea")[0];
            return textarea.value;
        }
    };
})();
