/**
 * Layout editor and persistence model for the canvas deck.
 *
 * LayoutManager intentionally works with generic layout items:
 * { key, x, y, w, h, moveTo() }. It does not know about sliders,
 * visualizers, DOM buttons, or p5 controls; the sketch provides those
 * adapters and the manager owns panel movement, resizing, and ownership.
 */
class LayoutManager {
    static getDefaultPanels() {
        // Add new deck panels here. This is the single source for default
        // panel geometry; saved layouts may override these values at runtime.
        const panels = [
            { key: "nowPlaying", x: 25, y: 43, w: 370, h: 165, label: "NOW PLAYING", accent: "line" },
            { key: "source", x: 24, y: 280, w: 235, h: 125, label: "SOURCE", accent: "pink" },
            { key: "transport", x: 401, y: 44, w: 145, h: 150, label: "TRANSPORT", accent: "amber" },
            { key: "spectrum", x: 13, y: 519, w: 220, h: 144, label: "SPECTRUM", accent: "line" },
            { key: "waveform", x: 239, y: 519, w: 220, h: 144, label: "WAVEFORM", accent: "pink" },
            { key: "position", x: 25, y: 215, w: 480, h: 55, label: "POSITION", accent: "amber" },
            { key: "vuMeters", x: 626, y: 517, w: 124, h: 149, label: "VU METERS", accent: "line" },
            { key: "level", x: 555, y: 27, w: 90, h: 245, label: "LEVEL", accent: "amber" },
            { key: "fxBus", x: 653, y: 26, w: 420, h: 215, label: "FX BUS", accent: "line" },
            { key: "phase", x: 465, y: 518, w: 156, h: 145, label: "PHASE", accent: "pink" },
            { key: "browser", x: 270, y: 280, w: 280, h: 235, label: "BROWSER", accent: "pink" },
            { key: "queue", x: 557, y: 279, w: 280, h: 235, label: "QUEUE", accent: "line" },
            { key: "layoutTools", x: 848, y: 247, w: 104, h: 210, label: "USER CONTROL", accent: "amber" }
        ];

        // Return fresh objects so runtime edits never mutate the defaults.
        return panels.map((panel) => ({ ...panel }));
    }

    constructor(panelLayout, options = {}) {
        // Panels are the actual mutable layout rectangles. Default panel
        // geometry comes from getDefaultPanels(), then this manager owns
        // runtime edits to it.
        this.panelLayout = panelLayout;

        // The sketch supplies live adapters because only it knows the concrete
        // components. LayoutManager only asks for generic bounds/moveTo items.
        this.getMovableLayoutItems = options.getMovableLayoutItems;
        this.getPanelBoundLayoutItems = options.getPanelBoundLayoutItems;
        this.getPanelBoundComponent = options.getPanelBoundComponent;
        this.isMovePanelsEnabled = options.isMovePanelsEnabled;
        this.isMoveElementsEnabled = options.isMoveElementsEnabled;

        // Panel-bound components such as spectrum and waveform must re-fit
        // themselves whenever their panel changes size or position.
        this.onPanelChanged = options.onPanelChanged || (() => {});
        this.onSaveRequested = options.onSaveRequested || (() => {});

        // Active drag state. dragChildren stores the panel-owned elements that
        // should move together with a dragged panel.
        this.dragItem = null;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.dragChildren = [];

        // Explicit ownership prevents overlapping panels from stealing controls
        // just because their rectangles intersect during a move.
        this.itemPanelOwners = {};

        // Active resize state for panel lower-right handles.
        this.resizePanel = null;
        this.resizeStartMouseX = 0;
        this.resizeStartMouseY = 0;
        this.resizeStartW = 0;
        this.resizeStartH = 0;
    }

    getPanels() {
        return this.panelLayout;
    }

    // Drawable panels are the panels whose bound component is active. This lets
    // a visualizer hide its whole panel by exposing isInactive(), while normal
    // control panels keep drawing because they have no inactive-aware component.
    getDrawablePanels() {
        return this.panelLayout.filter((panel) => !this.isPanelInactive(panel));
    }

    // Interactive panels follow the same rule as drawable panels: if the user
    // cannot see a visualizer panel, layout editing should not grab or resize it.
    getInteractivePanels() {
        return this.getDrawablePanels();
    }

    // LayoutManager does not own component state. It asks the sketch for the
    // component bound to a panel, then trusts that component's inactive flag.
    isPanelInactive(panel) {
        const component = this.getPanelBoundComponent ? this.getPanelBoundComponent(panel) : null;
        return this.isComponentInactive(component);
    }

    isComponentInactive(component) {
        return !!(component && typeof component.isInactive === "function" && component.isInactive());
    }

    isLayoutEditMode() {
        return this.isMovePanelsOn() || this.isMoveElementsOn();
    }

    isMovePanelsOn() {
        return !!(this.isMovePanelsEnabled && this.isMovePanelsEnabled());
    }

    isMoveElementsOn() {
        return !!(this.isMoveElementsEnabled && this.isMoveElementsEnabled());
    }

    getStatusText() {
        if (this.isMovePanelsOn() && this.isMoveElementsOn()) {
            return "LAYOUT: move panels and elements";
        }
        if (this.isMovePanelsOn()) {
            return "LAYOUT: move panels";
        }
        if (this.isMoveElementsOn()) {
            return "LAYOUT: move elements";
        }
        return "LAYOUT LOCKED";
    }

    drawOverlay() {
        if (!this.isLayoutEditMode()) {
            return;
        }

        push();
        noFill();
        strokeWeight(1);

        if (this.isMovePanelsOn()) {
            stroke(UI.line[0], UI.line[1], UI.line[2], 145);
            // Inactive visualizer panels are omitted from the edit overlay so
            // the visible layout matches the actual editable surface.
            for (const panel of this.getDrawablePanels()) {
                rect(panel.x, panel.y, panel.w, panel.h, 4);
            }
        }

        if (this.isMoveElementsOn()) {
            stroke(UI.amber[0], UI.amber[1], UI.amber[2], 135);
            for (const item of this.getMovables()) {
                rect(item.x, item.y, item.w, item.h, 3);
            }
        }

        if (this.isMovePanelsOn() && this.isMoveElementsOn()) {
            stroke(UI.pink[0], UI.pink[1], UI.pink[2], 120);
        }
        for (const item of this.getPanelBoundItems()) {
            rect(item.x, item.y, item.w, item.h, 3);
        }

        noStroke();
        fill(246, 200, 95);
        textSize(11);
        textAlign(RIGHT, TOP);
        text(this.getStatusText(), width - 24, 8);
        pop();
    }

    isResizablePanel(panel) {
        // Resizing an inactive visualizer panel would be invisible and
        // confusing, so hidden panels are treated as non-interactive.
        return panel && !this.isPanelInactive(panel) &&
            (panel.key === "spectrum" || panel.key === "waveform" || panel.key === "vuMeters" || panel.key === "phase");
    }

    isPointInResizeHandle(mx, my, panel) {
        return this.isResizablePanel(panel) &&
            mx >= panel.x + panel.w - 22 &&
            mx <= panel.x + panel.w &&
            my >= panel.y + panel.h - 22 &&
            my <= panel.y + panel.h;
    }

    handleResizeMousePressed(mx, my) {
        if (!this.isMovePanelsOn()) {
            return false;
        }

        // Search from topmost to bottommost panel so overlapping panels behave
        // like the drawn stack.
        const panels = this.getInteractivePanels();
        for (let i = panels.length - 1; i >= 0; i--) {
            const panel = panels[i];
            if (this.isPointInResizeHandle(mx, my, panel)) {
                this.resizePanel = panel;
                this.resizeStartMouseX = mx;
                this.resizeStartMouseY = my;
                this.resizeStartW = panel.w;
                this.resizeStartH = panel.h;
                return true;
            }
        }

        return false;
    }

    handleResizeMouseDragged(mx, my) {
        if (!this.isMovePanelsOn() || !this.resizePanel) {
            return false;
        }

        // Minimum sizes are delegated to the panel-bound component whenever
        // possible, so component-specific geometry stays in that module.
        const minSize = this.getResizablePanelMinSize(this.resizePanel);
        this.resizePanel.w = Math.round(constrain(this.resizeStartW + mx - this.resizeStartMouseX, minSize.w, width - this.resizePanel.x));
        this.resizePanel.h = Math.round(constrain(this.resizeStartH + my - this.resizeStartMouseY, minSize.h, height - this.resizePanel.y));
        this.onPanelChanged(this.resizePanel);
        return true;
    }

    getResizablePanelMinSize(panel) {
        const component = this.getPanelBoundComponent ? this.getPanelBoundComponent(panel) : null;
        if (component && typeof component.getMinPanelSize === "function") {
            return component.getMinPanelSize();
        }

        return { w: 220, h: 120 };
    }

    handleResizeMouseReleased() {
        if (!this.isMovePanelsOn() || !this.resizePanel) {
            return false;
        }

        console.log("Panel resized:", this.resizePanel.key, {
            x: this.resizePanel.x,
            y: this.resizePanel.y,
            w: this.resizePanel.w,
            h: this.resizePanel.h
        });
        this.logFullLayout();
        this.resizePanel = null;
        return true;
    }

    createMovableItem(key, bounds, moveTo, data = null) {
        // Generic shape used everywhere in the layout editor. Any component can
        // participate as long as the sketch can provide bounds and a moveTo.
        return {
            key,
            x: bounds.x,
            y: bounds.y,
            w: bounds.w,
            h: bounds.h,
            moveTo,
            data
        };
    }

    getMovablePanelItems() {
        // Panel dragging uses only interactive panels. Hidden visualizer panels
        // keep their saved/default coordinates, but they cannot be grabbed.
        return this.getInteractivePanels().map((panel) => this.createMovableItem(`panel:${panel.key}`, panel, (x, y, item) => {
            this.movePanelTo(item.data, x, y);
        }, panel));
    }

    getAllPanelLayoutItems() {
        // Full-layout serialization must include hidden panels too, otherwise
        // toggling Skinny mode on could accidentally erase their layout defaults.
        return this.panelLayout.map((panel) => this.createMovableItem(`panel:${panel.key}`, panel, (x, y, item) => {
            this.movePanelTo(item.data, x, y);
        }, panel));
    }

    movePanelTo(panel, x, y) {
        panel.x = x;
        panel.y = y;
        this.onPanelChanged(panel);
    }

    handleItemMousePressed(mx, my) {
        if (!this.isLayoutEditMode()) {
            return false;
        }

        if (this.isMovePanelsOn()) {
            // Panel headers win over controls inside the same panel. This keeps
            // compact panels draggable even when their content fills the body.
            const panelItems = this.getMovablePanelItems();
            const headerPanelItem = this.findPanelHeaderLayoutItem(mx, my, panelItems);
            if (headerPanelItem) {
                this.startDrag(headerPanelItem, mx, my);
                return true;
            }
        }

        if (!this.isMoveElementsOn()) {
            return false;
        }

        const items = this.getMovables();
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (mx >= item.x && mx <= item.x + item.w && my >= item.y && my <= item.y + item.h) {
                this.startDrag(item, mx, my);
                return true;
            }
        }

        if (this.isMovePanelsOn()) {
            const panelItems = this.getMovablePanelItems();
            for (let i = panelItems.length - 1; i >= 0; i--) {
                const item = panelItems[i];
                if (mx >= item.x && mx <= item.x + item.w && my >= item.y && my <= item.y + item.h) {
                    this.startDrag(item, mx, my);
                    return true;
                }
            }
        }

        return false;
    }

    findPanelHeaderLayoutItem(mx, my, items) {
        for (let i = items.length - 1; i >= 0; i--) {
            const item = items[i];
            if (!item.key || item.key.indexOf("panel:") !== 0) {
                continue;
            }

            const inHeader = mx >= item.x && mx <= item.x + item.w && my >= item.y && my <= item.y + 22;
            if (inHeader) {
                return item;
            }
        }

        return null;
    }

    startDrag(item, mx, my) {
        this.dragItem = item;
        this.dragOffsetX = mx - item.x;
        this.dragOffsetY = my - item.y;
        this.dragStartX = item.x;
        this.dragStartY = item.y;
        this.dragChildren = this.getDragChildren(item);
    }

    getDragChildren(item) {
        if (!item.key || item.key.indexOf("panel:") !== 0) {
            return [];
        }

        // Children are selected by persisted ownership, not visual overlap.
        // This is the key rule that makes panels behave like containers.
        const panelKey = item.key.slice("panel:".length);
        return this.getMovables()
            .filter((candidate) => this.itemPanelOwners[candidate.key] === panelKey)
            .map((candidate) => ({
                item: candidate,
                startX: candidate.x,
                startY: candidate.y
            }));
    }

    initializeOwners(savedOwners = null) {
        this.itemPanelOwners = {};
        if (savedOwners && typeof savedOwners === "object") {
            this.itemPanelOwners = { ...savedOwners };
        }

        // New controls introduced after an older saved layout get assigned to
        // the panel that currently contains their center.
        for (const item of this.getMovables()) {
            if (!(item.key in this.itemPanelOwners)) {
                this.itemPanelOwners[item.key] = this.getContainingPanelKey(item);
            }
        }
    }

    getContainingPanelKey(item) {
        // Topmost matching panel wins when an element is centered inside
        // overlapping panels.
        const panels = this.getInteractivePanels();
        for (let i = panels.length - 1; i >= 0; i--) {
            const panel = panels[i];
            const panelItem = { x: panel.x, y: panel.y, w: panel.w, h: panel.h };
            if (this.isLayoutItemInsidePanel(item, panelItem)) {
                return panel.key;
            }
        }

        return null;
    }

    updateItemPanelOwner(item) {
        if (!item || !item.key || item.key.indexOf("panel:") === 0) {
            return;
        }

        this.itemPanelOwners[item.key] = this.getContainingPanelKey(item);
    }

    isLayoutItemInsidePanel(item, panelItem) {
        const centerX = item.x + item.w / 2;
        const centerY = item.y + item.h / 2;
        return centerX >= panelItem.x &&
            centerX <= panelItem.x + panelItem.w &&
            centerY >= panelItem.y &&
            centerY <= panelItem.y + panelItem.h;
    }

    handleItemMouseDragged(mx, my) {
        if (!this.isLayoutEditMode() || !this.dragItem) {
            return false;
        }

        // Drag coordinates are clamped to the current canvas. Saved fullscreen
        // layouts can still restore outside a smaller viewport; this clamp only
        // applies while actively editing in the current viewport.
        const x = Math.round(constrain(mx - this.dragOffsetX, 0, width - this.dragItem.w));
        const y = Math.round(constrain(my - this.dragOffsetY, 0, height - this.dragItem.h));
        this.dragItem.moveTo(x, y, this.dragItem);
        this.dragItem.x = x;
        this.dragItem.y = y;

        if (this.dragChildren.length > 0) {
            const dx = x - this.dragStartX;
            const dy = y - this.dragStartY;
            // Preserve each child's original offset relative to the panel at
            // the moment the panel drag started.
            for (const child of this.dragChildren) {
                const childX = Math.round(constrain(child.startX + dx, 0, width - child.item.w));
                const childY = Math.round(constrain(child.startY + dy, 0, height - child.item.h));
                child.item.moveTo(childX, childY, child.item);
                child.item.x = childX;
                child.item.y = childY;
            }
        }

        return true;
    }

    handleItemMouseReleased() {
        if (!this.isLayoutEditMode() || !this.dragItem) {
            return false;
        }

        console.log("Layout item moved:", this.dragItem.key, {
            x: this.dragItem.x,
            y: this.dragItem.y,
            w: this.dragItem.w,
            h: this.dragItem.h
        });
        this.updateItemPanelOwner(this.dragItem);
        this.logFullLayout();
        this.dragItem = null;
        this.dragChildren = [];
        return true;
    }

    getPanelLayout() {
        return this.panelLayout.map((panel) => ({
            key: panel.key,
            x: panel.x,
            y: panel.y,
            w: panel.w,
            h: panel.h
        }));
    }

    logPanelLayout() {
        console.log("Panel layout JSON:", JSON.stringify(this.getPanelLayout(), null, 2));
    }

    getFullLayout() {
        // The persisted layout combines panel rectangles and movable item
        // rectangles. Runtime-only callbacks/data are intentionally omitted.
        return this.getAllPanelLayoutItems().concat(this.getMovables()).map((item) => ({
            key: item.key,
            x: Math.round(item.x),
            y: Math.round(item.y),
            w: Math.round(item.w),
            h: Math.round(item.h)
        }));
    }

    logFullLayout() {
        console.log("Full layout JSON:", JSON.stringify(this.getFullLayout(), null, 2));
    }

    getMovables() {
        return this.getMovableLayoutItems ? this.getMovableLayoutItems() : [];
    }

    getPanelBoundItems() {
        const items = this.getPanelBoundLayoutItems ? this.getPanelBoundLayoutItems() : [];
        // Panel-bound component hitboxes are used for overlay/hit testing.
        // Skip inactive visualizers so hidden plots do not leave ghost handles.
        return items.filter((item) => {
            const panel = this.panelLayout.find((candidate) => candidate.key === item.key);
            return !panel || !this.isPanelInactive(panel);
        });
    }
}
