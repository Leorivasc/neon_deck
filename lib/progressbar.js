
/**
 * A horizontal progress bar for visualizing progress in a given range [0, 1].
 * 
 * @class
 * @param {number} x - The x-coordinate of the progress bar.
 * @param {number} y - The y-coordinate of the progress bar.
 * @param {number} width - The width of the progress bar.
 * @param {number} height - The height of the progress bar.
 * @param {number} [prefill=0] - The initial progress value (default is 0).
 */
class ProgressBarH{

    constructor(x,y,width,height,prefill=0){
        this.x=x;
        this.y=y;
        this.width=width;
        this.height=height;
        this.progress=prefill;
        this.changed=false; // Flag to indicate if the progress was changed

    }

    draw(){
        push();
        let fillx = map(this.progress,0,1,0,this.width);
        let round = 3;

        //back to prevent traces when not refreshing the full bg color
        fill(180);
        noStroke();
        rect(this.x-5, this.y-5, this.width+10, this.height+10)

        fill(75);
        //background
        rect(this.x,this.y,this.width,this.height,round);
        //progress
        fill(0,255,0);
        rect(this.x,this.y,fillx,this.height,round);
        //border
        noFill();
        stroke(0)
        strokeWeight(1);
        rect(this.x,this.y,this.width,this.height,round);
        //pointer
        fill(200)
        rectMode(CENTER);
        rect(this.x+fillx,this.y+this.height/2, 5 , this.height+5,5);

        pop();
    }

    setValue(val){
        if(val<=1.0){
            this.progress=val;
        }else{
            //console.log("Progress bar overflown!");
        }
    }

    getValue() {
        return this.progress;
    }

    isChanged() {
        return this.changed;
    }

    resetChanged() {
        this.changed = false; // Reset the changed flag
    }
 
    handleMouse(mx, my) {
        if (mx >= this.x && mx <= this.x + this.width &&
            my >= this.y && my <= this.y + this.height) {
            let newProgress = (mx - this.x) / this.width;
            this.setValue(newProgress);
            this.changed = true; // Set the changed flag to true
        }
        else {
            this.changed = false; // Reset the changed flag if outside the bar
            return;
        }
    }

}
