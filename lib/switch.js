class Switch {
    constructor(x, y, w = 30, h = 60, label) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.isOn = false;
        this.label = label;
    }

    draw() {
        push();
        stroke(this.isOn ? color(UI.line[0], UI.line[1], UI.line[2]) : color(UI.muted[0], UI.muted[1], UI.muted[2]));
        fill(this.isOn ? color(UI.line[0], UI.line[1], UI.line[2], 54) : color(UI.field[0], UI.field[1], UI.field[2]));
        rect(this.x, this.y, this.w, this.h, this.w / 2);

        let handleY = this.isOn ? this.w/2 : this.w/2+this.h - this.w;
        fill(UI.text[0], UI.text[1], UI.text[2]);
        stroke(this.isOn ? color(UI.line[0], UI.line[1], UI.line[2]) : color(UI.muted[0], UI.muted[1], UI.muted[2]));
        ellipse(this.x+this.w/2, this.y+handleY, this.w * 0.8);

        fill(UI.text[0], UI.text[1], UI.text[2]);
        textSize(10);
        textAlign(CENTER, CENTER);
        noStroke();
        text(this.label, this.x + this.w / 2, this.y + this.h+15);

        pop();
    }

    handleMouse(mx, my) {
        if (
            mx > this.x && mx < this.x + this.w &&
            my > this.y && my < this.y + this.h
        ) {
            this.isOn = !this.isOn;
        }
    }

    // Query methods
    getState() {
        return this.isOn;
    }

    isEnabled() {
        return this.isOn;
    }

    isDisabled() {
        return !this.isOn;
    }

    setState(val) {
        this.isOn = !!val;
    }

    getLayoutBounds() {
        return { x: this.x, y: this.y, w: this.w, h: this.h + 20 };
    }

    moveTo(x, y) {
        this.x = x;
        this.y = y;
    }
}
