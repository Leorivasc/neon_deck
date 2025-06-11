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