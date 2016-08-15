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

// + function
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
