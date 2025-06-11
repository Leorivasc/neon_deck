/**
 * Class representing a spectrum visualizer using p5.js.
 * Draws a real-time frequency spectrum as a bar graph.
 *
 * @class
 * @property {string} name - The name of the visualizer ("spectrum").
 * @property {p5.FFT} fourier - The p5.FFT instance for frequency analysis.
 * @property {number} zoomfactor - The zoom factor for scaling the visualization.
 * @property {number} width - The width of the spectrum visualization.
 * @property {number} height - The height of the spectrum visualization.
 * @property {number} x - The x-coordinate of the visualization's position.
 * @property {number} y - The y-coordinate of the visualization's position.
 * @property {number} round - The border radius for the visualization background.
 * @property {number} steps - The step size for sampling spectrum bins (affects bar width and CPU usage).
 *
 * @constructor
 * @param {number} x - The x-coordinate for the visualization.
 * @param {number} y - The y-coordinate for the visualization.
 * @param {number} width - The width of the visualization.
 * @param {number} height - The height of the visualization.
 *
 * @method draw - Renders the spectrum visualization on the canvas.
 * @method setZoom - Sets the zoom factor for the visualization.
 * @param {number} val - The new zoom factor.
 * @method setSteps - Sets the step size for spectrum bin sampling.
 * @param {number} val - The new step size.
 */
class Spectrum{

    constructor(x,y,width,height){
	this.name = "spectrum";
    this.fourier = new p5.FFT();
    this.zoomfactor = 0.3;
    this.width = width;
    this.height = height;
    this.x = x;
    this.y = y;
    this.round = 5/this.zoomfactor;
    this.steps = 20;

    }

	draw(){
		push();

        translate(this.x, this.y)
        scale(this.zoomfactor);
        
        //gray background
        fill(75);
        rect(0,0,this.width,this.height,this.round);
        
		var spectrum = this.fourier.analyze();
        
        //Bars
		noStroke();
		for (var i = 0; i< spectrum.length; i+=this.steps){   //Every N steps to save cpu               
            //colors R=0-255, G=255-0, no need to map green, just 255-spectrum[i] does it
            fill(0,255,0);
                   
            var x = map(i, 0, spectrum.length, 0, this.width);
		    var h = -map(spectrum[i], 0, 255, 0, this.height);
		    //rect(x, this.height, this.width/spectrum.length, h);
            rect(x+5, this.height-2, this.steps, h); //width related to the loop step above

  		}
        
        //black border
        stroke(0);
        strokeWeight(1/this.zoomfactor);
        noFill();
        rect(0,0,this.width,this.height,this.round);

		pop();
	};

    setZoom(val){
        this.zoomfactor = val;
    }

    setSteps(val){
        this.steps = val;
    }


}
