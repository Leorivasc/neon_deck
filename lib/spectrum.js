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
        
        //panel background
        fill(UI.surface[0], UI.surface[1], UI.surface[2]);
        rect(0,0,this.width,this.height,this.round);
        stroke(UI.text[0], UI.text[1], UI.text[2], 28);
        strokeWeight(1/this.zoomfactor);
        for (let y = 0; y < this.height; y += 70) {
            line(0, y, this.width, y);
        }
        
		var spectrum = this.fourier.analyze();
        
        //Bars
		noStroke();
        const barCount = Math.ceil(spectrum.length / this.steps);
        const gap = Math.max(2 / this.zoomfactor, this.width * 0.002);
        const barWidth = Math.max(2 / this.zoomfactor, (this.width - gap * (barCount + 1)) / barCount);

		for (var i = 0; i< spectrum.length; i+=this.steps){   //Every N steps to save cpu
            const barIndex = Math.floor(i / this.steps);
            const energy = spectrum[i];
            fill(UI.line[0], UI.line[1], UI.line[2], map(energy, 0, 255, 70, 235));
                   
            var x = gap + barIndex * (barWidth + gap);
		    var h = -map(spectrum[i], 0, 255, 0, this.height);
            rect(x, this.height-2, barWidth, h);

  		}
        
        //border
        stroke(UI.line[0], UI.line[1], UI.line[2], 120);
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

    fitToPanel(panel) {
        const displayW = Math.max(80, panel.w - 40);
        const displayH = Math.max(50, panel.h - 50);
        this.x = panel.x + 20;
        this.y = panel.y + 35;
        this.width = displayW / this.zoomfactor;
        this.height = displayH / this.zoomfactor;
        this.round = 5 / this.zoomfactor;
    }

    getMinPanelSize() {
        return { w: 220, h: 120 };
    }


}
