class ProgressBarH{

    constructor(x,y,width,height,prefill=0){
        this.x=x;
        this.y=y;
        this.width=width;
        this.height=height;
        this.progress=prefill;

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

}
