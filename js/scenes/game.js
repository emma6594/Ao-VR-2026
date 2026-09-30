/*

   A game involving defending a plant from incoming drones with 
   a hovering robot representing EVE from Wall-E present
   - Point a controller and pull the trigger to shoot drones
   - Shoot 20 drones to win; the plant loses 10 points per drone that reaches it

*/

import * as global from "../global.js";
import { quat } from "../render/math/gl-matrix.js";
import { ControllerBeam } from "../render/core/controllerInput.js";
import { Gltf2Node } from "../render/nodes/gltf2.js";


window.objInfo = {           // SHARED STATE       
   xyz: [0, -0.5, -0.5]      // STARTING POSITION                      
}

export const init = async model => {

   // LOADS THE GLTF MODELS OF THE PLANT AND DRONES

   let plant = new Gltf2Node({ url: './media/gltf/plant/plant.glb' });
   let q = quat.create();
   plant.scale = [0.05, 0.05, 0.05];
   plant.translation = [0, 0.5, -0.5];
   let plantPos = [0, 0.5, -0.5];
   let spawnTimer = 0;
   let spawnInterval = 2; 
   let lastTime = null;
   quat.fromEuler(q, 0, 180, 0);
   plant.rotation = q;
   global.gltfRoot.addNode(plant);

   // GAME VARIABLES: SCORE, PLANT HEALTH, AND WIN/LOSS FLAGS

   let score = 0;
   let plantHealth = 100;
   let targetScore = 20;
   let gameWon = false;
   let gameLost = false;

   // ARRAY OF ACTIVE DRONES; INACTIVE ONES ARE OFF SCREEN

   const drones = [];
   for (let i = 0; i < 5; i++) {
      let drone = new Gltf2Node({ url: './media/gltf/drone/scene.gltf'});
      drone.scale = [0.00005, 0.00005, 0.00005];
      drone.translation = [0, -100, 0];
      global.gltfRoot.addNode(drone);
      drones.push({drone, active: false, pos: [0, -100, 0], speed: 0.5});
   }

   // SHAPES TO MAKE UP EVE

   let head = model.add('sphere');
   let body = model.add('sphere');
   let belly = model.add('sphere');
   let right_shoulder = model.add();
   let left_shoulder = model.add();
   let face = model.add('sphere');
   let right_eye = model.add('sphere');
   let left_eye = model.add('sphere');

   // CONTROLLER BEAMS

   let LBeam = new ControllerBeam(model, 'left');
   let RBeam = new ControllerBeam(model, 'right');


   // TRIGGER PRESS SHOOTS ALONG THE CONTROLLER BEAM

   inputEvents.onPress = hand => {
      shoot(beamOrigin(hand), beamDirection(hand));
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

   // INSTRUCTIONS, STATUS (UPDATED EVERY FRAME), AND GAME OVER (EMPTY UNTIL GAME ENDS) TEXT MESSAGES

   let text = clay.defineTextMesh('instructions', `EVE's Plant Defense\nDrones are coming - shoot them before they get to the plant `);
   model.add('instructions').move(0, 3.1, 0).turnY(Math.PI-1).color(0, .25, .5);

   let status = clay.defineTextMesh('status', `Score: 0, Plant Health: 100`);
   model.add('status').move(0, 3, 0).turnY(Math.PI-1).color(0, .25, .5);

   let gameOver = clay.defineTextMesh('game_over', ``);
   model.add('game_over').move(0, 2.9, 0).turnY(Math.PI-1).color(0, .25, .5);
   
   // SPAWNS THE DRONES AT A RANDOM ANGLE AND MOVES ACTIVE ONES TOWARDS THE PLANT

   function spawnDrone() {
    
      let d = null;
      for (let i = 0; i < drones.length; i++) {
         if (!drones[i].active) {
            d = drones[i];
            break;
         }
      }
      
      if (d == null) {
         return;
      }

      let angle = - Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
      let dist = 10;

      d.pos = [
         plantPos[0] + Math.cos(angle) * dist,
         1 + Math.random() * 2,
         plantPos[2] + Math.sin(angle) * dist
      ];
      d.speed = 0.9 + Math.random() * 0.5;
      d.active = true;
      d.drone.translation = d.pos;


   }

   function updateDrones(dt) {
      for (let i = 0; i < drones.length; i++) {
         let drone = drones[i];
         if (!drone.active) {
            continue;
         }

         let dx = plantPos[0] - drone.pos[0];
         let dy = plantPos[1] - drone.pos[1];
         let dz = plantPos[2] - drone.pos[2];
         let distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

         if (distance < 0.1) {
            plantHealth -= 10;
            drone.active = false;
            drone.pos = [0, -100, 0];
            drone.drone.translation = drone.pos;
            continue;
         }

         let step = Math.min(1, drone.speed * dt / distance);
         drone.pos[0] += dx * step;
         drone.pos[1] += dy * step;
         drone.pos[2] += dz * step;
         drone.drone.translation = drone.pos;

      }
   }

   let hit_radius = 3;

   function beamOrigin(hand) {
      let beam;
      if (hand == 'left'){
         beam = LBeam;
      }
      else{
         beam = RBeam;
      }
      let bm = beam.beamMatrix();
      return [bm[12], bm[13], bm[14]];
   }

   function beamDirection(hand) {
      let beam;
      if (hand == 'left'){
         beam = LBeam;
      }
      else{
         beam = RBeam;
      }
      let bm = beam.beamMatrix();
      let z = [bm[8], bm[9], bm[10]];
      let len = Math.sqrt(z[0] * z[0] + z[1] * z[1] + z[2] * z[2]);
      return [-z[0] / len, -z[1] / len, -z[2] / len];
   }

   // t = DISTANCE ALONG THE RAY TO THE POINT CLOSEST TO THE DRONE
   // SKIP DRONES BEHIND THE CONTROLLER
   // miss = DISTANCE FROM THE RAY TO THE DRONE'S CENTER
   // KEEP THE CLOSES DRONE WITHIN hit_radius

   function shoot(origin, direction) {
      let closest = null;
      let closestDist = Infinity;

      for (let i = 0; i < drones.length; i++){
         let drone = drones[i];
         if (!drone.active) {
            continue;
         }
         let dx = drone.pos[0] - origin[0];
         let dy = drone.pos[1] - origin[1];
         let dz = drone.pos[2] - origin[2];

         let t = dx * direction[0] + dy * direction[1] + dz * direction[2];

         if (t < 0){
            continue;
         }

         let px = origin[0] + direction[0] * t - drone.pos[0];
         let py = origin[1] + direction[1] * t - drone.pos[1];
         let pz = origin[2] + direction[2] * t - drone.pos[2];
         let miss = Math.sqrt(px * px + py * py + pz * pz);

         if (miss < hit_radius && t < closestDist) {
            closest = drone;
            closestDist = t
         }
      }  

         if (closest) {
            closest.active = false;
            closest.pos = [0, -100, 0];
            closest.drone.translation = closest.pos;
            score ++;
         }
      
   }
   

   // ANIMATION FRAMEWORK

   model.animate(() => {

       let dt;
       if (lastTime === null) {
         dt = 0;
       }
       else {
         dt = model.time - lastTime;
       }

       lastTime = model.time;
   
       // CHECKS IF GAME IS STILL ACTIVE
       if (!gameWon && !gameLost) {
         if (plantHealth <= 0) {
             gameLost = true;
         }
         else if (score >= targetScore) {
            gameWon = true;
         }
         else {
            spawnTimer += dt;
            if (spawnTimer >= spawnInterval) {
               spawnTimer = 0;
               spawnDrone();
            }
            updateDrones(dt);
         }
            clay.defineTextMesh('status', `Score: ${score} Plant Health: ${plantHealth}`);
            clay.defineTextMesh('game_over', ``);
         }
      else if (gameWon) {
            clay.defineTextMesh('status', `Final Score: ${score} | You Saved The Plant!`);
         clay.defineTextMesh('game_over', `You Win!`);
         }
         else {
            clay.defineTextMesh('status', `Final Score: ${score} | Plant Destroyed!`);
            clay.defineTextMesh('game_over', `Game Over! You lost!`);
         }
       
       // BEGIN ANIMATE BY SYNCHRONIZING STATE

       objInfo = server.synchronize('objInfo');

       // MOVE TO HER POSITION, SHRINK, THEN SPIN AROUND HER MIDDLE

       model.identity().move(objInfo.xyz[0], objInfo.xyz[1], objInfo.xyz[2]).scale(0.15).turnY(Math.PI+1).move(0, 0, 1);

       LBeam.update();
       RBeam.update();

       
   });
}

