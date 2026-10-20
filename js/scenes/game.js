/*

   A game involving defending a plant from incoming drones with 
   a hovering robot representing EVE from Wall-E present
   - Pull a trigger to start
   - Point a controller and pull the trigger to shoot drones
   - Shoot 20 drones to win; the plant loses 10 points per drone that reaches it
   - Multiplayer: drones follow a fixed schedule, and players only send 'start', 'hit', and 'reset' messages
   - After the game ends, pull a trigger to reset

*/

import * as global from "../global.js";
import { ControllerBeam } from "../render/core/controllerInput.js";
import { Gltf2Node } from "../render/nodes/gltf2.js";
import { loadSound, playSoundAtPosition } from "../util/positional-audio.js"


window.objInfo = {           // SHARED STATE       
   xyz: [0.4, 0.3, -0.5]     // STARTING POSITION                      
}

 // CONSTANTS FOR DRONE SPAWNING ANGLES, HEIGHTS, AND SPEEDS

const NUM_DRONES = 40;
const DRONE_COUNT = 12;
const INTERVAL = 2;
const WIN_SCORE = 20;
const HIT_RADIUS = 1;
const PLANT_POS = [-0.2, 1.15, 0];

const ANGLES = [-0.9, -1.4, 0.2, 0.6, 0.8];
const HEIGHTS = [1.3, 2.3, 1.8, 2.0, 1.1];
const SPEEDS = [0.9, 1.9, 1.4, 1.0, 1.6];

// START POINT, SPEED, DIRECTION, DISTANCE, SPAWN TIME, ARRIVE TIME

function droneInfo(n){
   let angle = -Math.PI / 2 + ANGLES[n % 5];
   let height = HEIGHTS[n % 5];
   let speed = SPEEDS[n % 5];
   let start = [PLANT_POS[0] + Math.cos(angle) * 10, height, PLANT_POS[2] + Math.sin(angle) * 10];
   let direction =  [PLANT_POS[0] - start[0], PLANT_POS[1] - start[1], PLANT_POS[2] - start[2]];
   let distance = Math.sqrt(direction[0] * direction[0] + direction[1] * direction[1] + direction[2] * direction[2]);
   let spawn = n * INTERVAL;
   return {start, direction, distance, speed, spawn, arrive: spawn + distance / speed};
}

// POSITION OF A DRONE AT ANY GIVEN TIME

function droneAt(n, t){
   let info = droneInfo(n);
   let progress = (t -info.spawn) * info.speed / info.distance; // fraction of the trip completed
   return [info.start[0] + progress * info.direction[0],
           info.start[1] + progress * info.direction[1],
           info.start[2] + progress * info.direction[2]];
}

// SOUND PLAYED WHEN A DRONE IS SHOT

let shootSoundBuffer = null;

loadSound('../../media/sound/SFXs/demoBalls/SFX_Ball_Create_Mono_01.wav', buffer => shootSoundBuffer = buffer);



export const init = async model => {

   // LOADS THE GLTF MODELS OF THE PLANT AND DRONES AND SETS PLANT VARIABLES

   let plant = new Gltf2Node({ url: './media/gltf/plant/plant.glb' });
   plant.scale = [0.01, 0.01, 0.01];
   plant.translation = PLANT_POS;
   global.gltfRoot.addNode(plant);

   // GAME VARIABLES: SCORE, PLANT HEALTH, AND WIN/LOSS FLAGS

   let score = 0;
   let plantHealth = 100;
   let targetScore = 20;
   let gameWon = false;
   let gameLost = false;

   // GLOBAL DRONE VARIABLES --> SHARED STATE FOR ALL PLAYERS

   server.init('drones', {});

   // SECONDS SINCE GAME STARTED

   function gameTime(){
      if(drones.start == null){
         return -1;
      }
      return (Date.now() - drones.start) / 1000;
   }

   // ARRAY OF DRONE MODELS

   const droneModels = [];
   for (let i = 0; i < DRONE_COUNT; i++) {
      let drone = new Gltf2Node({ url: './media/gltf/drone/scene.gltf'});
      drone.scale = [0.000025, 0.000025, 0.000025];
      drone.translation = [0, -100, 0];
      global.gltfRoot.addNode(drone);
      droneModels.push({drone, active: false, pos: [0, -100, 0], n: -1});
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


   // TRIGGER PRESS SHOOTS ALONG THE CONTROLLER BEAM AND STARTS THE GAME IF IT HASN'T ALREADY

   inputEvents.onPress = hand => {
      if (gameWon || gameLost) {
         server.send('drones', {op: 'reset'});
         return;
      }
      if(drones.start == null){
         server.send('drones', {op: 'start', t: Date.now()});
         return;
      }
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

   let status = clay.defineTextMesh('status', `Pull a trigger to start the game`);
   model.add('status').move(-2, 4.5, 4).turnY(Math.PI-1).color(0, .25, .5).scale(5);

   let gameOver = clay.defineTextMesh('game_over', ``);
   model.add('game_over').move(-2, 4, 4).turnY(Math.PI-1).color(0, .25, .5).scale(5);


   // SHOWS EACH SCHEDULED DRONE AT ITS CURRENT POSITION AND HIDES INACTIVE ONES

   function updateDrones(t) {
      for (let i = 0; i < droneModels.length; i++) {
         droneModels[i].active = false;
      }

      if (t >= 0){
         for (let n = 0; n < NUM_DRONES; n++) {
            let info = droneInfo(n);
            let shot = drones.hits && drones.hits[n];
            // a drone should be visible if it has spawned, hasn't arrived yet, and hasn't been shot
            if (t >= info.spawn && t < info.arrive && !shot) { 
               // reusing the drone models
               let d = droneModels[n % DRONE_COUNT];
               // keeping track of the slot the drone uses
               d.n = n;
               d.active = true;
               d.pos = droneAt(n, t);
            }
         }
      }

      for (let i = 0; i < droneModels.length; i++) {
         let d = droneModels[i];
         if (!d.active) {
            d.pos = [0, -100, 0];
         }
         d.drone.translation = d.pos; 
      }
   }

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

      for (let i = 0; i < droneModels.length; i++){
         let drone = droneModels[i];
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

         if (miss < HIT_RADIUS && t < closestDist) {
            closest = drone;
            closestDist = t;
         }
      }  

         // IF A CLOSEST DRONE WAS FOUND, SENDS A HIT MESSAGE WITH THE DRONE'S INDEX AND THE CURRENT GAME TIME

         if (closest) {
            server.send('drones', {op: 'hit', n: closest.n, t: gameTime()})
         }
      
   }
   

   // ANIMATION FRAMEWORK

   model.animate(() => {
      
      // APPLY MESSAGES FROM ALL CLIENTS

      server.sync('drones', (msgs, clientID) => {
         for (let id in msgs){
            let m = msgs[id];
            if (m.op == 'start' && drones.start == null) {
               drones.start = m.t;
            }
            else if (m.op == 'hit') {
               if (!drones.hits){
                  drones.hits = {};
               }
               // if the drone hasn't been hit yet and the hit time is before it arrives, record the hit
               if (!drones.hits[m.n] && m.t < droneInfo(m.n).arrive) {
                  drones.hits[m.n] = { by: clientID, t: m.t };

                  if(shootSoundBuffer) {
                     playSoundAtPosition(shootSoundBuffer, droneAt(m.n, m.t));
                  }
               }
            }
            else if (m.op == 'reset'){
               drones.start = null;
               drones.hits = {};
               gameWon = false;
               gameLost = false;
               plantHealth = 100;
               score = 0;
               clay.defineTextMesh('game_over', ``);
            }
         }
      });

      let t = gameTime();
   
      // SCORE AND PLANT HEALTH UPDATED ACCORDINGLY

      if (t >= 0 && !gameWon && !gameLost) {
         score = 0;
         plantHealth = 100;
         for (let i = 0; i < NUM_DRONES; i++) {
            if (drones.hits && drones.hits[i]) {
               score += 1;
            }
            else if (t >= droneInfo(i).arrive) {
               plantHealth -= 10;
            }
         }
      }

      // CHECK IF GAME IS STILL ACTIVE

      if (!gameWon && !gameLost) {
         if (plantHealth <= 0) {
            gameLost = true;
         }
         else if (score >= WIN_SCORE) {
            gameWon = true;
         }
         else {
            updateDrones(t);
         }
         if (drones.start == null){
            clay.defineTextMesh('status', `Pull a trigger to start the game`);
         }
         else {
            clay.defineTextMesh('status', `Score: ${score} Plant Health: ${plantHealth}`);
     
         }
      }
      else if (gameWon) {
         updateDrones(-1);
         clay.defineTextMesh('status', `Final Score: ${score} | You Saved The Plant!`);
         clay.defineTextMesh('game_over', `You Win! Pull a trigger to play again!`);
      }
      else {
         updateDrones(-1);
         clay.defineTextMesh('status', `Final Score: ${score} | Plant Destroyed!`);
         clay.defineTextMesh('game_over', `Game Over! You lost! Pull a trigger to play again!`);
      }
       
       // BEGIN ANIMATE BY SYNCHRONIZING STATE

       objInfo = server.synchronize('objInfo');

       // MOVE TO HER POSITION AND SHRINK

       model.identity().move(objInfo.xyz[0], objInfo.xyz[1], objInfo.xyz[2]).scale(0.15).turnY(Math.PI+1).move(0, 0, 1);

       LBeam.update();
       RBeam.update();

       
   });
}

