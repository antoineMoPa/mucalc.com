var cell_types = {
    "mathjs":{
        button_html: "+",
        on_create: function(element){
            var extension_content = subqsa(
                element,
                ".extension-content"
            )[0];
            
            element.classList.add("text-cell");

            var content = render("mathjs-cell-type");
            
            extension_content.appendChild(content);
        }
    },
    "text":{
        button_html: "text",
        on_create: function(element, content){
            var extension_content = subqsa(
                element,
                ".extension-content"
            )[0];
            
            element.classList.add("text-cell");

            var dom_content = render("text-cell-type");
            extension_content.appendChild(dom_content);
            
            var input = subqsa(element, ".livecalc-input")[0];
            var textarea = subqsa(element, "textarea")[0];

            // Initialize content
            textarea.value = content.value;

            // Make data updatable
            textarea.addEventListener("change", onchange);
            textarea.addEventListener("keyup", onchange);

            onchange();

            // Update data
            function onchange(){
                input.value = textarea.value;
            }
        },
        get_value: function(element){
            var textarea = subqsa(element, "textarea")[0];
            return textarea.value;
        }
    },
}
