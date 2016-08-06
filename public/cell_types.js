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
                
            }
            
            var content = render("mathjs-cell-type");
            
            extension_content.appendChild(content);
        }
    },
}
