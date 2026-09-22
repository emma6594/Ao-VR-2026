/*

   A hovering robot representing EVE from Wall-E with interactions such as waving, moving, and twirling
   - Point either controller at her white stomach region: the controller hums and that side's arm waves
   - Left trigger while pointing: she twirls once
   - Right trigger while pointing, then drag: she follows your hand

*/

import * as cg from "../render/core/cg.js";
import { ControllerBeam } from "../render/core/controllerInput.js";

window.objInfo = {           // SHARED STATE
   twirlNum: 0,              // INCREMENTS BY ONE EACH TIME SHE TWIRLS
   xyz: [0, 1, 0]            // STARTING POSITION AT Y = 1                        
}

export const init = async model => {

   // SHAPES TO MAKE UP EVE

   let head = model.add('sphere');
   let body = model.add('sphere');
   let belly = model.add('sphere');
   let right_shoulder = model.add();
   let left_shoulder = model.add();
   let face = model.add('sphere');
   let right_eye = model.add('sphere');
   let left_eye = model.add('sphere');

   // CONTROLLER BEAMS AND RECTANGLE TARGET AS DEFAULT WHITE TO BE INVISIBLE

   let LBeam = new ControllerBeam(model, 'left');
   let RBeam = new ControllerBeam(model, 'right');
   let rect = model.add('square').move(0, 1.4, -.6).scale(0.25, 0.25, 0.25);

   // POINTING FOR PRESS

   let pointing = {
       left: false,
       right: false,
   }

   // VARIABLES FOR DRAG AND TWIRL

   let grabbed = false; 
   let lastTwirl = null;
   let twirlStart = -50;   // IN THE PAST SO SHE DOESN'T TWIRL WHEN THE SCENE OPENS

   // TRIGGER PRESS TWIRLS EVE WHEN LEFT CONTROLLER POINTS AT TARGET

   inputEvents.onPress = hand => {
       if (!pointing[hand]) {
          return;
       }
       if (hand == 'left') {
          objInfo.twirlNum++;
          server.broadcastGlobal('objInfo');
       }
       if (hand == 'right') {
          grabbed = true;
       }
   };

   // TRIGGER DRAG SETS THE OBJECT POSITION AND BROADCASTS THE NEW
   // OBJECT STATE WHEN RIGHT CONTROLLER POINTS AT TARGET

   inputEvents.onDrag = hand => {
       if (hand == 'right' && grabbed) {
          objInfo.xyz = inputEvents.pos('right');
          server.broadcastGlobal('objInfo');
       }
   };

   // TRIGGER RELEASE KEEPS EVE IN UPDATED POSITION

   inputEvents.onRelease = hand => {
       if (hand == 'right') {
          grabbed = false;
       }
   }; 
         
   // ASSIGNING COLORS AND SIZES TO EACH OBJECT, MOVING THEM, AND ADDING JOINTS

   head.move(0, 2.15, -1).scale(.55,.5,.55).color(1, .6, .75);
   body.move(0, 1.5, -1).scale(.55, 0.85, 0.55).color(1, 0.6, 0.75);
   belly.move(0, 1.45, -.5).scale(0.3, 0.35, .06);
   
   // INVISIBLE JOINTS TO ALLOW ROTATION OF THE ARM

   right_shoulder.add('sphere').move(0, -0.6, 0).scale(0.1, 0.6, 0.1).color(1, 0.6, 0.75);
   left_shoulder.add('sphere').move(0, -0.6, 0).scale(0.1, 0.6, 0.1).color(1, 0.6, 0.75);
   
   right_shoulder.move(0.286, 1.96, -0.85).turnZ(.55);
   left_shoulder.move(-0.286, 1.96, -0.85).turnZ(-.55);

   face.move(0, 2.155, -.58).scale(0.33, 0.23, 0.15).color(0, 0, 0);
   right_eye.move(0.11, 2.15, -.441).turnY(.15).turnZ(-1.1).scale(0.05, 0.07, 0.005).color(0, 0.2, 1);
   left_eye.move(-0.11, 2.15, -.441).turnY(-.15).turnZ(1.1).scale(0.05, 0.07, 0.005).color(0, 0.2, 1);

   // ANIMATION FRAMEWORK

   model.animate(() => {

       // BEGIN ANIMATE BY SYNCHRONIZING STATE

       objInfo = server.synchronize('objInfo');

       // STARTS TIME IF SOMEONE TWIRLED HER 

       if (lastTwirl === null) {
          lastTwirl = objInfo.twirlNum;
       }
       else if (objInfo.twirlNum != lastTwirl) {
          lastTwirl = objInfo.twirlNum;
          twirlStart = model.time;
       }
       let t = model.time - twirlStart;
       let twirlAng;

       // TWIRLS HER 360 DEGREES LASTING ONE SECOND

       if (t < 1) {
          twirlAng = 2 * Math.PI * t;
       }
       else {
          twirlAng = 0;
       }

       // MOVE TO HER POSITION, SHRINK, THEN SPIN AROUND HER MIDDLE

       model.identity().move(objInfo.xyz[0], objInfo.xyz[1] + 0.1 * Math.sin(1.1 * model.time), objInfo.xyz[2]).scale(0.35).move(0, 0, -1).turnY(twirlAng).move(0, 0, 1);


       let isRPointing = false;
       let isLPointing = false;

       // LEFT CONTROLLER BEAM MAKES STEADY VIBRATION

       LBeam.update();
       let uvdL = LBeam.hitRect(rect.getGlobalMatrix());
       if (uvdL) {
          vibrate('left', .4);
          isLPointing = true;
       }

       // RIGHT CONTROLLER BEAM MAKES STEADY VIBRATION

       RBeam.update();
       let uvdR = RBeam.hitRect(rect.getGlobalMatrix());
       if (uvdR) {
          vibrate('right', .4);
          isRPointing = true;
       }

       pointing.left = isLPointing;
       pointing.right = isRPointing;

       // RIGHT AND LEFT ANGLES AND Y VALUES DEFINED

       let rightAng = 0.55;
       let leftAng = -0.55;

       let rightY = 1.96;
       let leftY = 1.96;
       
       // WAVES RIGHT ARM IF RIGHT CONTROLLER AND LEFT ARM IF LEFT CONTROLLER

       if (isLPointing) {
          leftAng = -(1.5 + 0.3 * Math.sin(5 * model.time));
          leftY = 1.8;
       }
       if (isRPointing) {
          rightAng = 1.5 + 0.3 * Math.sin(5 * model.time);
          rightY = 1.8;
       }
 
       // MOVES SHOULDERS EVERY FRAME USING THE RESTING OR WAVING ANGLE AND CHOSEN HEIGHT

       right_shoulder.identity().move(0.286, rightY, -0.85).turnZ(rightAng);
       left_shoulder.identity().move(-0.286, leftY, -0.85).turnZ(leftAng);

   });
}

