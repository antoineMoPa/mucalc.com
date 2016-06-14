function qsa(sel){
    return document.querySelectorAll(sel);
}

function subqsa(el,sel){
    return el.querySelectorAll(sel);
}

function load_template(name){
    var content = qsa("template[name="+name+"]")[0].innerHTML;
    return content;
}

function eecalc(root_el){
    root_el.innerHTML = load_template("eecalc");
    
    var input = subqsa(root_el,".eecalc-input")[0];
    var button = subqsa(root_el,".eecalc-go-button")[0];
    var output = subqsa(root_el,".eecalc-output")[0];
    
    function calculate(){
	var text = input.value;
	var result = math.eval(text)
	output.innerHTML = result;
    }
    
    input.onkeydown = function(e){
	if(e.key == "Enter"){
	    calculate();
	}
    };
    
    button.onclick = calculate;
}

eecalc(qsa("eecalc")[0]);
