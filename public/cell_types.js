var cell_types = {
    "mathjs":{
        button_html: "+",
        on_create: function(element){
            var extension_content = subqsa(
                element,
                ".extension-content"
            )[0];
            
            element.classList.add("mathjs-cell");

            var content = render("mathjs-cell-type");
            
            extension_content.appendChild(content);
        }
    },
}
