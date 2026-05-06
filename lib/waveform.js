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
        
        //panel background
        fill(UI.surface[0], UI.surface[1], UI.surface[2]);
        rect(0,0,this.width,this.height,this.round);
        stroke(UI.text[0], UI.text[1], UI.text[2], 28);
        strokeWeight(1/this.zoomfactor);
        for (let y = 0; y < this.height; y += 70) {
            line(0, y, this.width, y);
        }
        for (let x = 0; x < this.width; x += 100) {
            line(x, 0, x, this.height);
        }
        noFill();
        const trace = UI.waveformTrace || UI.pink;
        stroke(trace[0], trace[1], trace[2], 150);
        strokeWeight(1/this.zoomfactor);
        rect(0,0,this.width,this.height,this.round);
		
		stroke(trace[0], trace[1], trace[2]);
		strokeWeight(this.penstroke * 1.25);   //width of the line

		beginShape();
		//calculate the waveform from the fft.
		var wave = this.fourier.waveform();
		for (var i = 0; i < wave.length; i+=this.steps){ //Every N samples to save cpu
			//for each element of the waveform map it to screen 
			//coordinates and make a new vertex at the point.
			var x = map(i, 0, wave.length, 0, this.width);
			var y = map(wave[i], -0.8, 0.8, 0, this.height); //plot amplitude from -0.8 to 0.8

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
