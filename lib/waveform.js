/**
 * Class representing a waveform visualizer using p5.js.
 * Draws a real-time waveform as a line graph.
 * @class
 * @property {string} name - The name of the visualizer ("wavepattern").
 * @property {p5.FFT} fourier - The p5.FFT instance for waveform analysis.
 * @property {number} zoomfactor - The zoom factor for scaling the visualization.
 * @property {number} width - The width of the waveform visualization.
 * @property {number} height - The height of the waveform visualization.
 * @property {number} x - The x-coordinate of the visualization's position.
 * @property {number} y - The y-coordinate of the visualization's position.
 * @property {number} round - The border radius for the visualization background.
 * @property {number} steps - The step size for sampling waveform points (affects line smoothness and CPU usage).
 */
class WaveForm{

    constructor(x,y,width,height){
	this.name = "wavepattern";
    this.fourier = new p5.FFT();
    this.zoomfactor = 0.3;
    this.width = width;
    this.height = height;
    this.x = x;
    this.y = y;
    this.round = 5/this.zoomfactor;
    this.steps = 5;
    this.penstroke = 2;
    }

	//draw the wave form to the screen
	draw(){
		push();

        translate(this.x, this.y);
        scale(this.zoomfactor);
        
        //gray background
        fill(75);
        rect(0,0,this.width,this.height,this.round);
        //black border
        noFill();
        //stroke(0)
        strokeWeight(1/this.zoomfactor);
        rect(0,0,this.width,this.height,this.round);
		
		stroke(0, 255, 0);
		strokeWeight(this.penstroke);   //width of the line

		beginShape();
		//calculate the waveform from the fft.
		var wave = this.fourier.waveform();
		for (var i = 0; i < wave.length; i+=this.steps){ //Every N samples to save cpu
			//for each element of the waveform map it to screen 
			//coordinates and make a new vertex at the point.
			var x = map(i, 0, wave.length, 0, this.width);
			var y = map(wave[i], -1, 1, 0, this.height);

			vertex(x, y);
		}

		endShape();
		pop();
	}

    setZoom(val){
        this.zoomfactor = val;
    }

    setSteps(val){
        this.steps = val;
    }

    setStroke(val){
        this.penstroke = val;
    }
}