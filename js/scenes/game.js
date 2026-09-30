/*

   A game involving defending a plant from incoming drones with 
   a hovering robot representing EVE from Wall-E present
   - Point a controller and pull the trigger to shoot drones
   - Shoot 20 drones to win; the plant loses 10 points per drone that reaches it

*/

import * as global from "../global.js";
import { ControllerBeam } from "../render/core/controllerInput.js";
import { Gltf2Node } from "../render/nodes/gltf2.js";


window.objInfo = {           // SHARED STATE       
   xyz: [0.4, 0.3, -0.5]     // STARTING POSITION                      
}

export const init = async model => {

   // LOADS THE GLTF MODELS OF THE PLANT AND DRONES AND SETS PLANT VARIABLES

   let plant = new Gltf2Node({ url: './media/gltf/plant/plant.glb' });
   plant.scale = [0.01, 0.01, 0.01];
   plant.translation = [-0.2, 1.15, 0];
   let plantPos = [-0.2, 1.15, 0];
   let spawnTimer = 0;
   let spawnInterval = 2; 
   let lastTime = null;
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
      drone.scale = [0.000025, 0.000025, 0.000025];
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
   model.add('instructions').move(-2, 5, 4).turnY(Math.PI-1).color(0, .25, .5).scale(5);

   let status = clay.defineTextMesh('status', `Score: 0, Plant Health: 100`);
   model.add('status').move(-2, 4.5, 4).turnY(Math.PI-1).color(0, .25, .5).scale(5);

   let gameOver = clay.defineTextMesh('game_over', ``);
   model.add('game_over').move(-2, 4, 4).turnY(Math.PI-1).color(0, .25, .5).scale(5);
   
   // SPAWNS THE DRONES AT RANDOM ANGLES

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

   // MOVES ACTIVE DRONES TOWARDS THE PLANT

   function updateDrones(dt) {
      for (let i = 0; i < drones.length; i++) {
         let drone = drones[i];
         if (!drone.active) {
            continue;
         }

         // DIRECTIONS FROM DRONE TO PLANT


         let dx = plantPos[0] - drone.pos[0]; 
         let dy = plantPos[1] - drone.pos[1];
         let dz = plantPos[2] - drone.pos[2];
         let distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

         // CHECKS FOR IMPACT AND IF THE DRONE HAS REACHED, PLANT LOSES 10 HEALTH AND DRONE IS INACTIVE

         if (distance < 0.1) {
            plantHealth -= 10;
            drone.active = false;
            drone.pos = [0, -100, 0];
            drone.drone.translation = drone.pos;
            continue;
         }

         // MOVING TOWARDS THE PLANT

         let step = Math.min(1, drone.speed * dt / distance);
         drone.pos[0] += dx * step;
         drone.pos[1] += dy * step;
         drone.pos[2] += dz * step;

         // UPDATES THE DRONE'S POSITION IN THE WORLD

         drone.drone.translation = drone.pos;

      }
   }

   let hit_radius = 1;

   // RETURNS POSITION OF THE BEAM ORIGIN BASED ON THE HAND

   function beamOrigin(hand) {
      let beam;
      if (hand == 'left'){
         beam = LBeam;
      }
      else{
         beam = RBeam;
      }
      let bm = beam.beamMatrix();
      
      // X, Y, Z POSITIONS OF THE CONTROLLER IN WORLD SPACE

      return [bm[12], bm[13], bm[14]];
   }

   // RETURNS THE DIRECTION OF THE BEAM BASED ON THE HAND

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

      // NORMALIZE THE DIRECTION VECTOR

      let length = Math.sqrt(z[0] * z[0] + z[1] * z[1] + z[2] * z[2]);
      return [-z[0] / length, -z[1] / length, -z[2] / length];
   }

   // SHOOT A BEAM FROM THE CONTROLLER AND CHECK FOR HITS ON DRONES

   function shoot(origin, direction) {
      let closest = null;
      let closestDist = Infinity;

      if (gameWon || gameLost) {
         return;
      }

      for (let i = 0; i < drones.length; i++){
         let drone = drones[i];
         if (!drone.active) {
            continue;
         }

         // VECTOR FROM THE BEAM ORIGIN TO THE DRONE

         let dx = drone.pos[0] - origin[0];
         let dy = drone.pos[1] - origin[1];
         let dz = drone.pos[2] - origin[2];

         // DRONE'S POSITION PROJECTED ONTO THE RAY

         let t = dx * direction[0] + dy * direction[1] + dz * direction[2];

         // SKIP DRONES BEHIND THE CONTROLLER

         if (t < 0){
            continue;
         }

         // CALCULATE THE CLOSEST POINT ON THE RAY TO THE DRONE

         let px = (origin[0] + direction[0] * t) - drone.pos[0];
         let py = (origin[1] + direction[1] * t) - drone.pos[1];
         let pz = (origin[2] + direction[2] * t) - drone.pos[2];
         let miss = Math.sqrt(px * px + py * py + pz * pz);

         // CHECK IF THE DRONE IS WITHIN HIT RADIUS AND CLOSEST SO FAR

         if (miss < hit_radius && t < closestDist) {
            closest = drone;
            closestDist = t
         }
      }  

         // IF A CLOSEST DRONE WAS FOUND, HIT IT AND PUT THAT DRONE OUT OF PLAY AND ADD 1 TO THE SCORE

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

       // MOVE TO HER POSITION AND SHRINK

       model.identity().move(objInfo.xyz[0], objInfo.xyz[1], objInfo.xyz[2]).scale(0.15).turnY(Math.PI+1).move(0, 0, 1);

       LBeam.update();
       RBeam.update();

       
   });
}

