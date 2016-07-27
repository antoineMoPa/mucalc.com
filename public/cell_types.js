var cell_types = {
    "mathjs":{
        button_html: "+",
        on_create: function(){
            
        }
    },
    "text":{
        button_html: "text",
        on_create: function(element){
            var extension_content = subqsa(
                element,
                ".extension-content"
            )[0];
            
            
            element.classList.add("text-cell");

            var textarea = dom("<textarea></textarea>");
            extension_content.appendChild(textarea);

        },
    },
}
