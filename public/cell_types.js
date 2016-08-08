var cell_types = {
    "mathjs":{
        button_html: "+",
        on_create: function(element){
            var extension_content = subqsa(
                element,
                ".extension-content"
            )[0];
            
            element.classList.add("mathjs-cell-type");
            
            var cell_state = "less-detail"
            
            element.classList.add("less-detail");
                        
            // Render content
            var content = render("mathjs-cell-type");
            extension_content.appendChild(content);


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

        }
    },
}
