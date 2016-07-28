var cell_types = {
    "mathjs":{
        button_html: "+",
        on_create: function(element){
            var extension_content = subqsa(
                element,
                ".extension-content"
            )[0];
            
            element.classList.add("text-cell");

            var content = render("math-cell-type");
            
            extension_content.appendChild(content);
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

            var content = render("text-cell-type-editor");
            
            extension_content.appendChild(content);
        },
    },
}
