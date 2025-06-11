
class scrollList{

    constructor(x,y,width, height,fontsize){
        this.x=x;
        this.y=y;
        this.width=width;
        this.height=height;
        this.fontsize=fontsize;
        this.textControl = new textList();
        
    }

    setList(items){
        this.textControl.setList(items);
    }

    additem(text,value){
        this.textControl.additem(text,value);
    }

    draw(){
        push();

        translate(this.x,this.y);
        fill(255);
        stroke(0);
        rect(0,0,this.width,this.height);
        
        this.textControl.draw();

        pop();
    }

    

}

class textList{
    constructor(){
        this.x=0;
        this.y=0;
        this.data=[]; //data here
    }

    setList(list){
        for (var i=0;i<list.length;i++ ){
            this.data.push(new itemText(i,list[i],0));
        }
    }

    additem(text,value){
        this.data.push(new itemText(this.data.length,text,value));
    }

    setPosition(x,y){
        this.x=x;
        this.y=y;
    }

    moveUp(val){
        this.y-=val;
    }

    moveDown(val){
        this.y+=val;
    }

    draw(){
        push();
        //translate(this.x,this.y);
        let y=10;
        textSize(13);
        fill(0);
        for(var i=0;i<this.data.length;i++){
            text(this.data[i].text,this.x+5,this.y+y);
            y+=12;
        }
    }
}



class itemText{
    constructor(id,text,value){
        this.id=id;
        this.text=text;
        this.value=value;
    }

    
}