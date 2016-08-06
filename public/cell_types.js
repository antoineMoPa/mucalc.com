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
                        
            // Manage cell state (more / less details)
            function switch_state(){
                if(cell_state == "less-detail"){
                    cell_state = "more-detail";
                    element.classList.remove("less-detail");
                    element.classList.add("more-detail");
                } else {
                    cell_state = "less-detail";
                    element.classList.add("less-detail");
                    element.classList.remove("more-detail");
                }
            }

            // Render content
            var content = render("mathjs-cell-type");
            extension_content.appendChild(content);


            // Enable toggle detail button
            var toggle_button = subqsa(element, ".toggle-detail")[0];
            console.log(subqsa(element, "*"));
            toggle_button.addEventListener("click", switch_state);

        }
    },
}
