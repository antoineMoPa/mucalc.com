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
  Load a template
 */
function load_template(name){
    var content = qsa("template[name="+name+"]")[0].innerHTML;
    return content;
}

/*
  Create a dom element
 */
function new_el(html){
    var node = document.createElement("div");
    node.innerHTML = html;
    return node.children[0];
}

/*
  Add some useful stuff for electrical engineering
 */
function eeify_mathjs(){
    math.import({
	/* Parallel resistors */
	LL: function(a,b){
	    var num = 0;
	    for(i in arguments){
		var arg = arguments[i];
		num += 1/arg;
	    }	
	    return 1 / num;
	}
    });
}

function appear(el,step){
    max = 5;
    if(step == undefined){
	step = max;
	el.style.position = "relative"
    }
    if(step < 0){
	el.style.position = ""
	return;
    }

    var ratio = step / max;
    el.style.opacity = "0.0";
    el.style.opacity = 1.0 - ratio;

    el.style.left = -100 * ratio + "px";
    console.log(ratio);
    setTimeout(
	function(){
	    appear(el, step - 1);
	},
	33
    );
}

function eecalc(root_el){
    eeify_mathjs();
    
    var scope = {};
    root_el.innerHTML = load_template("eecalc");
    var cells = subqsa(root_el,".eecalc-cells")[0];
    var cell_count = 0;

    new_eecalc_cell(cells);

    function new_eecalc_cell(cells){
	var index = cell_count;
	cell_count++;
	var cell = new_el(load_template("eecalc-cell"));
	cells.appendChild(cell);
	
	var input = subqsa(cell,".eecalc-input")[0];
	var button = subqsa(cell,".eecalc-go-button")[0];
	var output = subqsa(cell,".eecalc-output")[0];

	appear(cell);
	input.focus();
	
	function calculate(){
	    var text = input.value;
	    var result = math.eval(text, scope);

	    if(text == ""){
		return;
	    } else if(result != undefined){
		output.innerHTML = result;
	    } else {
		output.innerHTML = result;
		return;
	    }
	    
	    // If last cell, add new cell
	    if(index == cell_count - 1){
		new_eecalc_cell(cells);
	    }
	    // Or move focus to next cell
	    else {
		subqsa(cells,".eecalc-input")[index + 1].focus();
	    }
	}
	
	input.onkeydown = function(e){
	    if(e.key == "Enter"){
		calculate();
	    }
	};
	
	button.onclick = calculate;
    }
}

eecalc(qsa("eecalc")[0]);
