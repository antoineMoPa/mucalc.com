function Image(){
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
        
    // Hide by default until an height is assigned
    this.canvas.height = 0;
    this.already_appended = false;
    
    return this;
}

Image.prototype.isImage = true;

Image.prototype.toString = function(){
    return "Image";
};

Image.prototype.appendTo = function(el){
    if(this.already_appended){
        // Don't append 2 times
        return;
    }
    this.already_appended = true;
    el.appendChild(this.canvas);
};

Image.prototype.getCanvas = function(){
    return this.canvas;
};

Image.prototype.getContext = function(){
    return this.ctx;
};

math.typed.addType({
    name: "Image",
    test: function(x){
        return x && x.isImage;
    }
});

// Image + Image function
var add = math.typed('add', {
    'Image, Image': function (a, b) {
        // Create image
        var im = new Image();

        var ctx_new = im.getContext()

        // get canvas elements
        var can_new = im.getCanvas();
        var can_a = a.getCanvas();
        var can_b = b.getCanvas();

        // Establish dimensions
        can_new.height = math.max(can_a.height, can_b.height);
        can_new.width = math.max(can_a.width, can_b.width);

        // Draw
        ctx_new.drawImage(can_a,0,0);

        ctx_new.globalAlpha = 0.5;
        ctx_new.drawImage(can_b,0,0);
        ctx_new.globalAlpha = 1.0;
        
        return im;
    }
});

math.import({'add': add});

// number * Image
var multiply = math.typed('multiply', {
    'number, Image': function (a, b) {
        // Create image
        var im = new Image();

        var ctx_new = im.getContext()

        // get canvas elements
        var can_new = im.getCanvas();
        var can_b = b.getCanvas();
        var ctx_b = b.getContext();
        
        // Establish dimensions
        can_new.height = can_b.height;
        can_new.width = can_b.width;

        // Inspiration:
        // http://albertogasparin.it/articles/2011/05/html5-multiply-filter-canvas/ 
        var img_data = ctx_b.getImageData(0, 0, can_b.width, can_b.height);
        var data = img_data.data;
        
        // Loop over each pixel and change the color.
        for (var i = 0; i < data.length; i++) {
            if(i % 4 == 3){
                // Skip alpha
                continue;
            } else {
                data[i] = parseInt(a * data[i]);
            }
        }
        
        ctx_new.putImageData(img_data, 0, 0);
        
        return im;
    }
});

math.import({'multiply': multiply});

// number * Image (reverse order)
var multiply = math.typed('multiply', {
    'Image, number': function (a, b) {
        return math.multiply(b, a);
    }
});

math.import({'multiply': multiply});
                          
// * function
var multiply = math.typed('multiply', {
    'Image, Image': function (a, b) {
        // Create image
        var im = new Image();

        var ctx_new = im.getContext()

        // get canvas elements
        var can_new = im.getCanvas();
        var can_a = a.getCanvas();
        var ctx_a = a.getContext();
        var can_b = b.getCanvas();
        var ctx_b = b.getContext();
        
        // Establish dimensions
        var w = can_new.height =
            math.min(can_a.height, can_b.height);
        var h = can_new.width =
            math.min(can_a.width, can_b.width);

        // Get data
        var img_a_data = ctx_a.getImageData(0, 0, w, h);
        var img_b_data = ctx_b.getImageData(0, 0, w, h);

        // Get data.data
        var data_a = img_a_data.data;
        var data_b = img_b_data.data;
        
        // Loop over each pixel and multiply
        for (var i = 0; i < data_a.length; i++) {
            data_a[i] = parseInt((data_a[i] * data_b[i])/255);
        }
        
        ctx_new.putImageData(img_a_data, 0, 0);
        
        return im;
    }
});

math.import({'multiply': multiply});
