/*
  Here is a small set of dom tools
*/

/*
  Shortcut to document.querySelectorAll
 */
function qsa(sel){
    return document.querySelectorAll(sel);
}

/*
  qsa, but on an element
 */
function subqsa(el,sel){
    return el.querySelectorAll(sel);
}

/*
  Hide an element
*/
function hide(el){
    el.classList.add("hidden");
}

/*
   Determine if hidden
 */
function hidden(el){
    return el.classList.contains("hidden");
}


/*
  Show an element
 */
function show(el){
    el.classList.remove("hidden");
}


/*
  Load a template

  returns the HTML
 */
function load_template(name){
    var el = qsa("template[name="+name+"]")[0];

    if(el == undefined){
        console.error("Template "+name+" does not exist.");
    }

    var content = el.innerHTML;

    var params = el.getAttribute("data-params");

    if(params == "" || params == null){
        params = [];
    } else {
        params = params.split(",");
    }

    return {
        content: content,
        params: params
    };
}

/*
   finds template-instances

   replaces handlebars by data- attributes

   {{meow}} will be replaced by attribute data-meow

   (Sort of a preprocessor)
*/
function instanciator(el){
    var instances = subqsa(el,"template-instance");

    for(var i = 0; i < instances.length; i++){
        var instance = instances[i];
        var name = instance.getAttribute("data-name");
        var template = load_template(name);
        var content = template.content;
        var params = template.params;

        for(var j = 0; j < params.length; j++){
            var attr = "data-"+params[j];
            var value = instance.getAttribute(attr);

            // Sanitize value to avoid XSS
            value = value.replace(/[^A-Za-z0-9\-\.\_\: ]/g,"");
            var attr = attr.replace(/^data-/,"")
            var handle = "{{"+attr+"}}";

            content = content.replace(handle,value);
        }

        instance.innerHTML = content;
    }
}

/*
  Create an instance of a template and put it in to_el,
  replacing the content
  Improvement idea: manage parameters and use this in instanciator
  instead of current code.
*/
function render(template_name, to_el){
    var template = load_template(template_name).content;
    var has_to_el = false;
    
    if(to_el != undefined){
        has_to_el = true;
    }
    
    var to_el = to_el || dom("<div></div>");

    to_el.innerHTML = template;
    instanciator(to_el);

    // If we were not rendering to something
    if(!has_to_el){
        // If there is only one element,
        if(to_el.children.length == 1){
            // return it
            return to_el.children[0];
        }
    }
    
    return to_el;
}

/*
  Load a script
  Returns the content
 */
function load_script(name){
    var content = qsa("script[name="+name+"]")[0].innerHTML;
    return content;
}

/*
  Create a dom element
 */
function dom(html){
    var node = document.createElement("div");
    node.innerHTML = html;
    return node.children[0];
}

/*
  Make something disappear "smoothly"
 */
function disappear(el, effect){
    appear(el, effect, true);
}

/*
  Make something appear "smoothly"
 */
function appear(el, effect, reverse){
    var reverse = reverse || false;
    var effect = effect || "scale up";

    var effects = {
        "scale up": {
            max: 3,
            begin: function(el){
                el.style.transform = "scale(0.0)";
            },
            end: function(el){
                el.style.transform = "";
            },
            step: function(el,step,max){
                var ratio = step / max;

                if(reverse){
                    ratio = 1 - ratio;
                }

                el.style.opacity = "0.0";
                el.style.opacity = 1.0 - ratio;
                el.style.transform = "scale("+(1.0 - ratio)+")";
            }
        },
        "from top": {
            max: 6,
            begin: function(el){
                el.style.transform = "scale(1,0)";
            },
            end: function(el){
                el.style.transform = "";
            },
            step: function(el,step,max){
                var ratio = step / max;

                if(reverse){
                    ratio = 1 - ratio;
                }

                el.style.opacity = "0.0";
                el.style.opacity = 1.0 - ratio;
                el.style.transformOrigin = "top";
                el.style.transform =
                    "scale(1,"+(1.0 - ratio)+")";
            }
        }
    };

    if(effects[effect] == undefined){
        console.error("Animation '" + effect + "' does not exist.");
        return;
    }

    var effect = effects[effect];

    /* reverse begin and end */
    if(reverse == true){
        var tmp = effect.begin;
        effect.begin = effect.end;
        effect.end = function(el){
            // Hide before to prevent visual glitch
            hide(el);
            tmp(el);
        };
    }

    animate(el, effect);
}

/*
  Make something appear "smoothly"
 */
function animated_remove(el, callback){
    var options = {
        max: 10,
        begin: function(el){
            el.style.position = "relative";
            el.style.opacity = "1.0";
        },
        end: function(el){
            el.style.position = "";
            el.parentNode.removeChild(el);
            callback();
        },
        step: function(el,step,max){
            var ratio = step / max;
            el.style.opacity = ratio;
            el.style.transform = "scale("+ratio+")";
            el.style.top = 100 * (1.0 - ratio) + "px";
        }
    };
    animate(el,options);
}

/*
  Make something flash
 */
function flash(el){
    var options = {
        max: 2,
        time_step: 300,
        begin: function(el){
            el.classList.add("flashing");
        },
        end: function(el){
            el.classList.remove("flashing");
        },
        step: function(el,step,max){
        }
    };
    animate(el,options);
}

function animate(el,options,step){
    max = options.max;
    time_step = options.time_step || 33;
    if(step == undefined){
        step = max;
        options.begin(el);
    }
    if(step < 0){
        options.end(el);
        return;
    }

    options.step(el, step, max);

    setTimeout(
        function(){
            animate(el, options, step - 1);
        },
        time_step
    );
}

