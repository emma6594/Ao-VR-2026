
import { buttonState } from "../render/core/controllerInput.js";
import { lcb, rcb } from '../handle_scenes.js';

/* 

    A snowman decorating game
    - Point a controller beam at an item in the blue box and hold
    - Drag the item to the snowman or onto the scene
    - Release to drop it
    - The top hat and buttons will snap into position if close enough
    - The Christmas tree and bowtie are free items: they will stay wherever you place them
*/

export const init = async model => { 

    // SPHERES FOR THE BODY OF THE SNOWMAN
    const node0 = model.add("sphere"); 
    node0.identity().move(0, 1, -2).scale(0.6, 0.6, 0.6).color(1, 1, 1); 
    
    const node1 = model.add("sphere"); 
    node1.identity().move(0, 1.7, -2).scale(0.45, 0.45, 0.45).color(1, 1, 1); 

    const node2 = model.add("sphere"); 
    node2.identity().move(0, 2.25, -2).scale(0.3, 0.3, 0.3).color(1, 1, 1); 
    
    // EYES OF THE SNOWMAN
    const node3 = model.add("sphere"); 
    node3.identity().move(-0.08, 2.32, -1.72).scale(0.03, 0.03, 0.03).color(0, 0, 0); 
    
    const node4 = model.add("sphere"); 
    node4.identity().move(0.08, 2.32, -1.72).scale(0.03, 0.03, 0.03).color(0, 0, 0); 
    
    // NOSE OF THE SNOWMAN
    const nose = model.add("coneY"); 
    nose.identity().move(0, 2.25, -1.7).turnX(Math.PI / 2).scale(0.05, 0.2, 0.05).color(1, 0.5, 0); 

    // ARMS OF THE SNOWMAN
    const left_arm = model.add("tubeY");
    left_arm.identity().move(-0.5, 1.85, -1.8).turnZ(Math.PI / 4).scale(0.025, 0.25, 0.025).color(0.25, 0.13, 0.05);
    
    const right_arm = model.add("tubeY");
    right_arm.identity().move(0.5, 1.85, -1.8).turnZ(-Math.PI / 4).scale(0.025, 0.25, 0.025).color(0.25, 0.13, 0.05);

    // TOP HAT FOR THE SNOWMAN
    const hat = model.add();
    hat.add("tubeY").identity().move(0, 0, 0).scale(0.14, 0.01, 0.14).color(0, 0, 1); 
    hat.add("tubeY").identity().move(0, 0.084, 0).scale(0.08, 0.08, 0.08).color(0, 0, 1);

    // CHRISTMAS TREE FOR THE SCENE
    const tree = model.add();
    tree.add("tubeY").identity().move(0, 0, 0).scale(0.015, 0.1, 0.015).color(0.4, 0.2, 0); 
    tree.add("coneY").identity().move(0, 0.05, 0).scale(0.07, 0.08, 0.07).color(0, 0.5, 0); 
    tree.add("coneY").identity().move(0, 0.12, 0).scale(0.055, 0.07, 0.055).color(0, 0.6, 0.1); 
    tree.add("coneY").identity().move(0, 0.18, 0).scale(0.04, 0.06, 0.04).color(0, 0.7, 0.1); 
    tree.add("octahedron").identity().move(0, 0.25, 0).scale(0.02, 0.03, 0.02).color(1, 0.9, 0.2);

    // BOWTIE FOR THE SNOWMAN
    const bow = model.add();
    bow.add("sphere").identity().move(0, 0, 0).scale(0.015, 0.015, 0.015).color(0.8, 0, 0); 
    bow.add("pyramidZ").identity().move(-0.03, 0, 0).turnY(Math.PI / 2).scale(0.015, 0.015, 0.015).color(0.8, 0, 0); 
    bow.add("pyramidZ").identity().move(0.03, 0, 0).turnY(-Math.PI / 2).scale(0.015, 0.015, 0.015).color(0.8, 0, 0); 

    // BUTTONS FOR THE SNOWMAN
    const buttons = model.add();
    buttons.add("sphere").identity().move(0, 0.065, 0).scale(0.015, 0.015, 0.015).color(0, 0, 0);     
    buttons.add("sphere").identity().move(0, 0, 0).scale(0.015, 0.015, 0.015).color(0, 0, 0); 
    buttons.add("sphere").identity().move(0, -0.065, 0).scale(0.015, 0.015, 0.015).color(0, 0, 0);   

    // GROUND
    const ground = model.add("cube");
    ground.identity().move(0, 0.2, 4).scale(20, 0.2, 10).color(1, 1, 1).opacity(1);

    // SKY
    const sky = model.add("cube");
    sky.identity().move(0, 5.4, -6).scale(20, 5, 0.1).color(0.6, 0.75, 1.0).opacity(1);

    // BIG BLUE BOX TO CONTAIN THE ACCESSORIES
    const box = model.add("cube");
    box.identity().move(1.9, 1.5, -2.1).scale(0.8, 0.8, 0.005).color(0, 0, 1);

    // INSTRUCTIONS
    let text = clay.defineTextMesh('instructions', `Decorate the Scene! \nPress the trigger and drag to dress the snowman and place the Christmas tree!`);
    model.add('instructions').move(-2, 3.5, -2).color(0, 0, 0).scale(3);


    // LIST OF DRAGGABLE ITEMS
    // SCALE: SIZE IN THE BOX, BIGSCALE: SIZE ONCE TAKEN OUT OF BOX
    // FREE: TRUE MEANS IT STAYS WHEREVER ITS DROPPED, FALSE MEANS IT SNAPS INTO PLACE
    // DRAGZ: OPTIONAL DEPTH TO HOLD THE ITEM AT WHILE DRAGGING
    // START: SPOT IN THE BOX, TARGET: SPOT ON THE SNOWMAN
    const accessories = [
        { name: "top hat", node: hat, scale: 1.5, bigScale: 1.5, free: false, start: [1.45, 1.8, -2], target: [0, 2.55, -2]},
        { name: "tree", node: tree, scale: 1.7, bigScale: 5.7, free: true, start: [1.45, 1.1, -2], target: [0, 0, 0]},
        { name: "bow", node: bow, scale: 5.0, bigScale: 5.0, free: true, dragZ: -1.75, start: [2.2, 1.9, -2], target: [0, 0, 0]},
        { name: "buttons", node: buttons, scale: 2.0, bigScale: 3.5, free: false, dragZ: -1.45, start: [2.2, 1.3, -2], target: [0, 1.6, -1.5]}

    ];

    // EACH ITEM STARTS AT ITS ORIGINAL LOCATION
    for (const item of accessories) {
        item.pos = [item.start[0], item.start[1], item.start[2]];
        item.baseScale = item.scale;
    };

    // CALCULATES DISTANCE BETWEEN TWO POINTS
    const distance = (a,b) => {
        const dx = a[0] - b[0];
        const dy = a[1] - b[1];
        const dz = a[2] - b[2];
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    };

    // MOVES AN ITEM TO ITS CURRENT POSITION AND SIZE
    const place = item => {
        item.node.identity().move(item.pos[0], item.pos[1], item.pos[2]).scale(item.scale, item.scale, item.scale);
    };

    // PLACES EACH ITEM IN THE BOX WHEN THE SCENE LOADS
    for (const item of accessories){
        place(item);
    }

    // ITEM CURRENTLY HELD AND HELD BY WHICH HAND
    let held = null;
    let heldBy = null;

    // EACH HAND'S BEAM AND TRIGGER
    const hands = [
        { beam: lcb, trigger: buttonState.left[0]},
        { beam: rcb, trigger: buttonState.right[0]}
    ];

    // SNOWFLAKES STARTING AT RANDOM POSITIONS, SIZES, AND SPEEDS
    const snowflakes = [];  
    const flakeCount = 60;  
    for (let i = 0; i < flakeCount; i++) {    
        const flake = model.add("sphere");    
        const x = (Math.random() - 0.5) * 6;    
        const y = 0.5 + Math.random() * 3.5;    
        const z = -1 + Math.random() * -4;    
        const s = 0.02 + Math.random() * 0.05;    
        flake.identity().move(x, y, z).scale(s, s, s).color(1, 1, 1).opacity(1);    
        snowflakes.push({ node: flake, x, y, z, s, speed: 0.1 + Math.random() * 0.2 });  
    }  
    
    model.animate(() => {    

        // MAKE EACH SNOWFLAKE FALL AND RESPAWN ONCE IT REACHES BOTTOM
        for (let i = 0; i < snowflakes.length; i++) {      
            const f = snowflakes[i];      
            f.y -= f.speed * 0.01;      
            if (f.y < 0.25) {        
                f.y = 4 + Math.random() * 1;        
                f.x = (Math.random() - 0.5) * 6;        
                f.z = -1 + Math.random() * -4;      
            }      
            f.node.identity().move(f.x, f.y, f.z).scale(f.s, f.s, f.s).color(1, 1, 1).opacity(1);    
        }  

        // CHECK BOTH CONTROLLERS EVERY FRAME
        for (const hand of hands){
        const pressed = hand.trigger.pressed;

        if (held == null){
            // NOT CURRENTLY HOLDING AN ITEM SO GRAB THE ITEM THE BEAM IS POINTING AT
            if (pressed) {
                let best = null; 
                let closest = 0.3; // HOW CLOSE THE BEAM MUST BE TO CONSIDERED CLOSE ENOUGH
                for (const item of accessories) {
                    const point = hand.beam.projectOntoBeam(item.pos);
                    const d = distance(point, item.pos);
                    if(d < closest){
                        best = item;
                        closest = d;
                    }
                }
                held = best;
                heldBy = hand;
                if (held != null) {
                    // ITEMS ENLARGES ONCE TAKEN OUT OF THE BOX
                    held.scale = held.bigScale;
                }
            }
        }
        else if (heldBy == hand){
            // ALREADY HOLDING AN ITEM SO MOVE IT TO CLOSEST POINT ON BEAM
            if (pressed) {
                held.pos = hand.beam.projectOntoBeam(held.pos);
                // IT ITEM HAS DRAG DEPTH, KEEP AT THAT DEPTH
                if (held.dragZ !== undefined) {
                    held.pos[2] = held.dragZ;
                }
                place(held);
            }
            else {
                // LET GO OF THE TRIGGER SO ATTACH TO SNOWMAN IF CLOSE ENOUGH OR GO BACK
                // FREE ITEMS SKIP THIS PART
                if (!held.free){
                    const d = distance(held.pos, held.target);
                    if (d < 0.5){
                        held.pos = [held.target[0], held.target[1], held.target[2]];
                    }
                    else{
                        held.pos = [held.start[0], held.start[1], held.start[2]];
                    }
                }
                place(held);
                // NOTHING BEING HELD ANYMORE
                held = null;
                heldBy = null;
            }
        }
    }
    });
}
