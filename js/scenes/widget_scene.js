/* 
  Ice Volley Game:
  - Goal: Don't let the snowball hit the ground on your side 10 times
  - If the snowball reaches the icy ground on one player's side, the other player gets a point
  - First to 10 points wins
  - Can adjust background to daytime or nighttime
*/
import { G2 } from "../util/g2.js";
import { loadSound, playSoundAtPosition } from "../util/positional-audio.js";

export const init = async model => {

   let frame = 0;

   // SHARED STATE FOR ALL PLAYERS
   server.init('ice', {state: 'off', night: false, L: 0, R: 0, winner: '', done: 0})

   const me = Math.random();
   let myBump = false;
   
   // STARS AND MOON (ONLY FOR NIGHT)
   const stars = [];
   for (let i = 0; i < 50; i++) {
      stars.push({
         node: model.add("sphere"),
         x: (Math.random() - 0.5) * 30,
         y: 3 + Math.random() * 6.5,
         s: 0.03 + Math.random() * 0.05,
         glow: Math.random() * 6.28
      });
   }
   const moon = model.add("sphere");


   // FLOOR
   const floor = model.add('cube');
   floor.identity().move(0, -0.05, -2.5).scale(20, 0.05, 7.5).color(0.6, 0.8, 1.0).opacity(1);

   // DAY SKY
   const day = model.add("cube");
   day.identity().move(0, 5, -10.1).scale(20, 5, 0.1).color(0.3, 0.65, 1.0);

   // FENCE 
   const fence = model.add("group");

   const n0 = fence.add("cube");
   n0.identity().move(-1.5, 1.3, -2).scale(0.06, 0.6, 0.06).color(0.4, 0.22, 0.08);

   const n1 = fence.add("cube");
   n1.identity().move(-0.9, 1.3, -2).scale(0.06, 0.6, 0.06).color(0.4, 0.22, 0.08);

   const n2 = fence.add("cube");
   n2.identity().move(-0.3, 1.3, -2).scale(0.06, 0.6, 0.06).color(0.4, 0.22, 0.08);

   const n3 = fence.add("cube");
   n3.identity().move(0.3, 1.3, -2).scale(0.06, 0.6, 0.06).color(0.4, 0.22, 0.08);

   const n4 = fence.add("cube");
   n4.identity().move(0.9, 1.3, -2).scale(0.06, 0.6, 0.06).color(0.4, 0.22, 0.08);

   const n5 = fence.add("cube");
   n5.identity().move(1.5, 1.3, -2).scale(0.06, 0.6, 0.06).color(0.4, 0.22, 0.08);

   const n6 = fence.add("cube");
   n6.identity().move(0, 1.45, -2).scale(1.5, 0.08, 0.05).color(0.34, 0.187, 0.068);

   const n7 = fence.add("cube");
   n7.identity().move(0, 1.3, -2).scale(1.5, 0.08, 0.05).color(0.34, 0.187, 0.068);

   const n8 = fence.add("cube");
   n8.identity().move(0, 1.15, -2).scale(1.5, 0.08, 0.05).color(0.34, 0.187, 0.068);

   const t0 = fence.add("pyramidY");
   t0.identity().move(-1.5, 1.9, -2).scale(0.09, 0.12, 0.09).color(0.45, 0.25, 0.12);
   const t1 = fence.add("pyramidY");
   t1.identity().move(-0.9, 1.9, -2).scale(0.09, 0.12, 0.09).color(0.45, 0.25, 0.12);
   const t2 = fence.add("pyramidY");
   t2.identity().move(-0.3, 1.9, -2).scale(0.09, 0.12, 0.09).color(0.45, 0.25, 0.12);
   const t3 = fence.add("pyramidY");
   t3.identity().move(0.3, 1.9, -2).scale(0.09, 0.12, 0.09).color(0.45, 0.25, 0.12);
   const t4 = fence.add("pyramidY");
   t4.identity().move(0.9, 1.9, -2).scale(0.09, 0.12, 0.09).color(0.45, 0.25, 0.12);
   const t5 = fence.add("pyramidY");
   t5.identity().move(1.5, 1.9, -2).scale(0.09, 0.12, 0.09).color(0.45, 0.25, 0.12);

   fence.identity().move(0, -1.5, -7).scale(11, 2, 1);

   // FUNCTION TO CREATE A PERSON IN THE SCENE
   const makePerson = (bodyColor, offsetX = 0) => { 
   const person = model.add("group"); 

   const head = person.add("sphere"); 
   head.identity().move(offsetX, 1.8, -2).scale(0.35, 0.35, 0.35).color(0.96, 0.8, 0.64); 
   const body = person.add("coneY"); 
   body.identity().move(offsetX, 1.1, -2).scale(0.4, 0.6, 0.4).color(bodyColor[0], bodyColor[1], bodyColor[2]); 
   const armL = person.add("tubeX"); 
   armL.identity().move(offsetX - 0.3, 1.35, -2).scale(0.25, 0.06, 0.06).color(0.96, 0.8, 0.64); 
   const armR = person.add("tubeX"); 
   armR.identity().move(offsetX + 0.3, 1.35, -2).scale(0.25, 0.06, 0.06).color(0.96, 0.8, 0.64); 
   const legL = person.add("tubeY"); 
   legL.identity().move(offsetX - 0.15, 0.55, -2).scale(0.05, 0.35, 0.05).color(0.15, 0.15, 0.15); 
   const legR = person.add("tubeY");
   legR.identity().move(offsetX + 0.15, 0.55, -2).scale(0.05, 0.35, 0.05).color(0.15, 0.15, 0.15); 

   return person;
   };

   makePerson([0, 1, 0.9], 0).move(-3.5, 0, -4).turnY(-Math.PI/2).scale(0.5, 0.5, 0.5);
   makePerson([1, 0.9, 0], 0).move(3.5, 0, -4).turnY(Math.PI/2).scale(0.5, 0.5, 0.5); 

   // SHARED THEME AMONG WIDGETS
   const widget = (w, title) => {
      w.setColor([0.25, 0.05, 0.4]).fillRect(-1, -1, 2, 2);        
      w.setColor([0.8, 0.90, 1.0]).fillRect(-0.92, -0.92, 1.84, 1.84); 
      w.setColor([0.1, 0.15, 0.35]).fillRect(-0.92, 0.55, 1.84, 0.37);  
      w.setColor('white').textHeight(0.11);
      w.text(title, 0, 0.68, 'center');
   }

   // BALL FOR THE GAME
   const ball = model.add("sphere");
   let ball_height = 0.25;
   let ball_speed = 0;
   let ball_xspeed = 0;
   let ball_x = 0;
   let stagnant = true;

   const WIN_SCORE = 10;

   // RESETTING VALUES FOR NEW GAME
   const reset = () => {
      stagnant = true;
      ball_speed = 0;
      ball_xspeed = 0;
      ball_height = 0.25;
      ball_x = 0;
   }
   
   // LOADING BUMP SOUND
   let bumpSound;
   await loadSound('../../media/sound/bounce/4.wav', buffer => bumpSound = buffer);

   // DAY/NIGHT WIDGET
   let g2DayWidget = new G2();
   model.txtrSrc(3, g2DayWidget.getCanvas());
   let objDayWidget = model.add('square').txtr(3).move(8, 5, -8).scale(1);

   // SCOREBOARD WIDGETS
   let g2Lscoreboard = new G2();
   model.txtrSrc(4, g2Lscoreboard.getCanvas());
   let objLScoreboard = model.add('square').txtr(4).move(-4, 1.5, -7.5).scale(1);

   let g2Rscoreboard = new G2();
   model.txtrSrc(5, g2Rscoreboard.getCanvas());
   let objRScoreboard = model.add('square').txtr(5).move(4, 1.5, -7.5).scale(1);

   // GAME WIDGET
   let g2game = new G2();
   model.txtrSrc(6, g2game.getCanvas());
   let objgame = model.add('square').txtr(6).move(0, 3, -5.5).scale(1); 

   // RENDER FUNCTIONS
   g2DayWidget.render = function(){
      widget(this, 'DAY/NIGHT')
   }

   g2game.render = function(){
      widget(this, 'GAME');
      this.setColor([0.1, 0.15, 0.35]).textHeight(0.1);
      if (ice.state === 'over'){
         this.text(ice.winner + ' wins!', 0, .35, 'center')
         this.text('New game starting...', 0, .1, 'center');
      } else{
         this.text('Press "Volley" ', 0, .25, 'center');
      }
   }
   
   // LEFT AND RIGHT SCOREBOARD WIDGETS
   g2Lscoreboard.render = function(){
      widget(this, 'PLAYER 1');
      this.setColor([0.1, 0.15, 0.35]).textHeight(0.1);
      this.text('P1: ' + ice.L + '  P2: ' + ice.R, 0, .25, 'center');
   }

   g2Rscoreboard.render = function(){
      widget(this, 'PLAYER 2');
      this.setColor([0.1, 0.15, 0.35]).textHeight(0.1);
      this.text('P1: ' + ice.L + '  P2: ' + ice.R, 0, .25, 'center');
   }

   // BUTTONS: ONLY SEND MESSAGES
   g2DayWidget.addWidget(objDayWidget, 'button'  , 0, -.11 , '#e9e279', ['              Day              ', '                   Night                   '], () => {
      server.send('ice', {op: 'night'});
   }, 5.5);

   g2game.addWidget(objgame, 'button'  , 0, -.3 , '#79e995', ['                      Volley                      ', '                      Hide                      '], () => {
      server.send('ice', {op: 'toggle'})
   }, 5.5);

   // LEFT AND RIGHT SCOREBOARD WIDGETS

   g2Lscoreboard.addWidget(objLScoreboard, 'button'  , 0, -.3 , '#79a4e9', ['                      Bump!                      ', '                      Bump!                      '], () => {
      if (ice.state !== 'on' || ball_x > 0) return;
      server.send('ice', {op: 'bump', side: 'L', from: me})
   }, 5.5);

   g2Rscoreboard.addWidget(objRScoreboard, 'button'  , 0, -.3 , '#e99179', ['                      Bump!                      ', '                      Bump!                      '], () => {
      if (ice.state !== 'on' || ball_x < 0) return;
      server.send('ice', {op: 'bump', side: 'R', from: me})
   }, 5.5);


   // DAY/NIGHT TOGGLE WIDGET
   let isNight = false;

   // SNOWFLAKES STARTING AT RANDOM POSITIONS, SIZES, AND SPEEDS
   const snowflakes = [];  
   const flakeCount = 60;  
   for (let i = 0; i < flakeCount; i++) {    
      const flake = model.add("sphere");    
      const x = (Math.random() - 0.5) * 20;    
      const y = 0.5 + Math.random() * 3.5;    
      const z = -1 + Math.random() * -10;    
      const s = 0.02 + Math.random() * 0.05;    
    
      snowflakes.push({ node: flake, x, y, z, s, speed: 0.1 + Math.random() * 0.2 });  
   }  

   model.animate(() => {
      g2DayWidget.update();
      g2Lscoreboard.update();
      g2Rscoreboard.update();
      g2game.update();

      frame++;

      server.sync('ice', msgs => {
         for (let msg in msgs){
            const m = msgs[msg];

            if(m.op === 'toggle'){
               reset();
               ice.L = 0;
               ice.R = 0;
               ice.winner = '';
               if(ice.state === 'off'){
                  ice.state = 'on';
               }
               else{
                  ice.state = 'off';
               }
            }
            else if(m.op === 'bump' && ice.state === 'on'){
               stagnant = false;
               ball_speed = 0.06;
               if(m.side === 'L'){
                  ball_xspeed = 0.04;
               }
               else{
                  ball_xspeed = -0.04;
               }
               myBump = (m.from === me);
               if(bumpSound){
                  playSoundAtPosition(bumpSound, [ball_x, ball_height, -4]);
               }
            }
            else if(m.op === 'score' && ice.state === 'on'){
               if(m.side === 'L'){
                  ice.L++;
               }
               else{
                  ice.R++;
               }
               if(ice.L >= WIN_SCORE || ice.R >= WIN_SCORE){
                  if(ice.L >= WIN_SCORE){
                     ice.winner = 'Player 1';
                  }
                  else{
                     ice.winner = 'Player 2';
                  }
                  ice.state = 'over';
                  ice.done = Date.now();
               }
            }
            else if(m.op === 'night'){
               if(ice.night){
                  ice.night = false;
               }
               else{
                  ice.night = true;
               }
            }
         
         }
      });

      isNight = ice.night;

      // WINNER SCREEN LASTS 3 SECONDS, THEN NEW GAME STARTS
      if (ice.state === 'over' && Date.now() - ice.done > 3000){
         ice.state = 'on';
         ice.winner = '';
         ice.L = 0;
         ice.R = 0;
      }

      // UPDATE DAY/NIGHT SCENE BASED ON TOGGLE STATE
      if (isNight){
         day.identity().move(0, 5, -10.1).scale(20, 5, 0.1).color(0.1, 0.1, 0.3)
      } 
      else {
         day.identity().move(0, 5, -10.1).scale(20, 5, 0.1).color(0.3, 0.65, 1.0)
      }

      // UPDATE STARS BASED ON NIGHT STATE
      for (const s of stars) {
         if (isNight) {
            const twinkle = s.s * (0.8 + 0.2 * Math.sin(frame * 0.05 + s.glow));
            s.node.identity().move(s.x, s.y, -9.8).scale(twinkle).color(1, 0.85, 0.2);
         } 
         else {
            s.node.identity().move(0, -10, 0).scale(0.001);
         }
      }
      
      // UPDATE MOON BASED ON NIGHT STATE
      if (isNight) {
      moon.identity().move(-8, 7.5, -9.7).scale(0.9).color(1, 1, 0.85);
      } 
      else {
      moon.identity().move(0, -10, 0).scale(0.001);
      }

      // PHYSICS OF BALL
      if (!stagnant && ice.state === 'on') {
         ball_speed = ball_speed - 0.003;
         ball_height = ball_height + ball_speed;
         ball_x = ball_x + ball_xspeed;

         if (ball_height <= 0.25){
            if(myBump){
               let scorer = 'L';
               if (ball_x < 0){
                  scorer = 'R';
               }
               server.send('ice', {op: 'score', side: scorer});
               myBump = false;
            }
            reset();
         }
      }

      if (ice.state !== 'off'){
         ball.identity().move(ball_x, ball_height, -4).scale(0.25).color(1, 1, 0.99);
      }
      else{
         ball.identity().move(0, -10, 0).scale(0.25);
      }

      // MAKE EACH SNOWFLAKE FALL AND RESPAWN ONCE IT REACHES BOTTOM
      for (let i = 0; i < snowflakes.length; i++) {      
         const f = snowflakes[i]; 
         
         if (isNight){
            f.node.identity().move(0, -10, 0).scale(0.001);
            continue;
         }
         f.y -= f.speed * 0.01;      
         if (f.y < 0.25) {        
            f.y = 4 + Math.random() * 1;        
            f.x = (Math.random() - 0.5) * 20;        
            f.z = -1 + Math.random() * -10;
         }      
         f.node.identity().move(f.x, f.y, f.z).scale(f.s, f.s, f.s).color(1, 1, 1).opacity(1);    
      }  

   });


};