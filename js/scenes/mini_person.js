/*

   A "Hit the Target" game with two viewpoints: edit and game
   - Edit View: You can click and drag to move the target, mini person, and the pile of snowballs
   - Game View: This is the gameplay mode where you throw snowballs at the target
   - Point at the snowball pile to grab a snowball press the trigger to grab a snowball, hold while aiming, and release to throw it at the moving target
   - Score: The number of times the target is hit by a snowball 

*/

import * as cg from "../render/core/cg.js";
import { buttonState, ControllerBeam} from "../render/core/controllerInput.js";
import { G2 } from "../util/g2.js";
import { loadSound, playSoundAtPosition } from "../util/positional-audio.js";

let hitSound = null;
loadSound('../../media/sound/SFXs/demoBalls/SFX_Ball_Create_Mono_01.wav', buffer => {
  hitSound = buffer;
});

export const init = async model => {
  const MINI_SCALE = 1 / 12;
  let inGameView = false; 

  // SCALE DOWN TO MINIATURE VIEW
  const displayPosition = model.add("group").move(0, 1, -0.6);
  const world = displayPosition.add("group").scale(MINI_SCALE, MINI_SCALE, MINI_SCALE);

  // TABLE
  const table = world.add("group");
  table.add("cube").move(0, 0.4, -1.5).scale(2.1, 0.15, 2.1).color(0.8, 0.6, 0.4);

  // THROWABLE BALLS
  const SPEED = 5; 
  let lastResult = '';
  let score = 0;

  // SNOWBALL POOL OF 20 THAT WILL GET REUSED
  const balls = [];
  for (let i = 0; i < 20; i++){
    balls.push({ 
      node: world.add("sphere").color(1, 1, 1), 
      p: [0, -100, 0], // position
      v:[0, 0, 0], // velocity
      age: 0, // seconds since it was thrown
      state:'idle' }); // unused and hidden
  }

  // HIDES SNOWBALL BY MOVING IT OUT OF VIEW
  const hideBall = b => {
    b.state = 'idle'; // marked as available
    b.node.identity().move(0, -100, 0).scale(0.0001);
  };
  balls.forEach(hideBall);

  // RECORDS WHICH BALL EACH HAND IS HOLDING AND WHETHER THE TRIGGER WAS PRESSED
  const held = {left: null, right: null};
  const wasPressed = {left: false, right: false};

  // TRANSFORMS A POINT FROM WORLD SPACE TO LOCAL SPACE OF THE GIVEN MATRIX OR VICE VERSA
  const xForm = (m, p) => [
    m[0]*p[0] + m[4]*p[1] + m[8]*p[2] + m[12],
    m[1]*p[0] + m[5]*p[1] + m[9]*p[2] + m[13],
    m[2]*p[0] + m[6]*p[1] + m[10]*p[2] + m[14],
  ];

  // SAME AS XFORM BUT ONLY DIRECTION AND NORMALIZED
  const xDirection = (m, d) => {
    const r = [
      // don't have position component so don't need translation part
      m[0]*d[0] + m[4]*d[1] + m[8]*d[2], 
      m[1]*d[0] + m[5]*d[1] + m[9]*d[2],
      m[2]*d[0] + m[6]*d[1] + m[10]*d[2],
    ];
    const length = Math.hypot(r[0], r[1], r[2]) || 1; // use 1 if length = 0
    return r.map(x => x / length); // normalizing the vectors
  };

  // TRANSFORMS A POINT FROM ROOM SPACE TO LOCAL SPACE OF THE MINIATURE WORLD
  const toLocal = p => xForm(cg.mInverse(world.getGlobalMatrix()), p);

  // OFFSETS FOR PILE, PERSON, AND TARGET
  const pileOff = [0, 0, 0];
  const personOff = [0, 0, 0.5];
  const targetOff = [0, 0, 0];

  // TARGET
  const target_z = -2.48
  const target_y = 2;
  const RED_RADIUS = 0.5
  const WHITE_RADIUS = 0.25;
  const target = world.add("group");
  target.add("diskZ").move(0, target_y, target_z).scale(RED_RADIUS, RED_RADIUS, RED_RADIUS).color(1, 0, 0);
  target.add("diskZ").move(0, target_y, target_z + 0.02).scale(WHITE_RADIUS, WHITE_RADIUS, WHITE_RADIUS).color(1, 1, 1);
  let dx = 0, dy = 0; // how far target has moved from its resting spot

  // SNOWBALL PILE
  const BALL_PILE_POS = [
    [1.5, 0.7, -2.5], 
    [1.7, 0.7, -2.5],
    [1.3, 0.7, -2.5],
    [1.4, 0.85, -2.5],
    [1.6, 0.85, -2.5],
    [1.5, 1.0, -2.5],
  ];

  const BALL_PILE_RADIUS = 0.1;

  const snowballs = world.add("group");
  BALL_PILE_POS.forEach(pos => {
    snowballs.add("sphere").move(pos[0], pos[1], pos[2]).scale(BALL_PILE_RADIUS).color(1, 1, 1);
  });

  // FIND CENTER OF SNOWBALL PILE + RADIUS BIG ENOUGH TO COVER IT FOR GRABBING
  const PILE_CENTER = [0, 1, 2].map(i => 
    BALL_PILE_POS.reduce((sum, pos) => sum + pos[i], 0) / BALL_PILE_POS.length
  );

  const PADDING_GRAB = 0.15;
  const GRAB_RADIUS = Math.max(...BALL_PILE_POS.map(pos => 
    Math.hypot(pos[0] - PILE_CENTER[0], pos[1] - PILE_CENTER[1], pos[2] - PILE_CENTER[2])
  )) + BALL_PILE_RADIUS + PADDING_GRAB;

  // MINI PERSON
  const miniPerson = world.add("group");
  miniPerson.add("coneY").move(0, 0.95, 0).scale(0.25, 0.35, 0.2).color(0.2, 0.6, 0.9);
  miniPerson.add("sphere").move(0, 1.36, 0).scale(0.16, 0.16, 0.16).color(0.96, 0.8, 0.64);
  miniPerson.add("sphere").move(-0.055, 1.4, -0.14).scale(0.025, 0.025, 0.025).color(0.05, 0.05, 0.05);
  miniPerson.add("sphere").move(0.055, 1.4, -0.14).scale(0.025, 0.025, 0.025).color(0.05, 0.05, 0.05);

  // PUT PILE, PERSON, AND TARGET AT THEIR OFFSETS
  const applyOffsets = () => {
    snowballs.identity().move(pileOff[0], pileOff[1], pileOff[2]);
    miniPerson.identity().move(personOff[0], personOff[1], personOff[2]);
    target.identity().move(targetOff[0] + dx, targetOff[1] + dy, targetOff[2]);
  };
  applyOffsets();


  // INVISIBLE HIT AREAS
  const pileRect = snowballs.add('group').move(PILE_CENTER[0], PILE_CENTER[1], PILE_CENTER[2] - 0.15).scale(GRAB_RADIUS);
  const targetRect = target.add('group').move(0, target_y, target_z - 0.15).scale(RED_RADIUS * 0.7);
  const personRect = miniPerson.add('group').move(0, 1.0, -0.2).scale(0.35);
  
  // CONTROLLER BEAMS
  const LBeam = new ControllerBeam(model, 'left');
  const RBeam = new ControllerBeam(model, 'right');

  const beamOf = hand => {
    if(hand === 'left'){
      return LBeam;
    } else {
      return RBeam;
    }
  };

  // LIST OF OBJS THAT CAN BE GRABBED IN EDIT MODE
  const drag_objs = [
    { off: pileOff, rect: pileRect },
    { off: personOff, rect: personRect },
    { off: targetOff, rect: targetRect },
  ];

  // TRACKS WHAT EACH HAND IS DRAGGING
  const dragging = {
    left: null,
    right: null
  };

  // INPUT EVENT HANDLERS
  inputEvents.onPress = hand => {
    if (inGameView){
      return;
    }

    const beam = beamOf(hand);

    let best = null;
    let bestDistance = Infinity;

    // CHECK ALL DRAGGABLE OBJECTS FOR A HIT AND SELECT THE CLOSEST ONE
    for (const o of drag_objs){
      const hit = beam.hitRect(o.rect.getGlobalMatrix());
      if (hit && hit[2] < bestDistance){
        best = o;
        bestDistance = hit[2];
      }
    }

    // IF A BEST OBJECT WAS FOUND, START DRAGGING IT
    if (best) {
      const mini_hand = toLocal(inputEvents.pos(hand));
      dragging[hand] = { 
        obj: best, 
        grab: mini_hand.map((x, i) => x - best.off[i])
      };
    }
  };
  
  // DRAG EVENT HANDLER
  inputEvents.onDrag = hand => {
    const drag = dragging[hand];
    if (!drag || inGameView){
      return;
    }
    const mini_hand = toLocal(inputEvents.pos(hand));
    for (let i = 0; i < 3; i++){
      // finds object's offset by subtracting the grab position from the current hand position
      drag.obj.off[i] = mini_hand[i] -drag.grab[i]; 
    }
    // move the object according to the drag offset
    applyOffsets();
  };

  // RELEASE EVENT HANDLER
  inputEvents.onRelease = hand => {
    dragging[hand] = null;
  };


  // TIMESTAMP OF THE PREVIOUS FRAME
  let last_time = performance.now() / 1000;

  // UPDATE SNOWBALLS: MOVE THEM, CHECK FOR HITS, AND HANDLE THROWING
  const updateSnowballs = () => {
    const now = performance.now() / 1000;

    // seconds since the last frame
    const dt = Math.min(now - last_time, 0.05);
    last_time = now;

    // matrix that converts room coordinates into the miniature world's coordinate
    const inverse = cg.mInverse(world.getGlobalMatrix());

    for (const side of ['left', 'right']){
      const m = beamOf(side).beamMatrix();
      const pressed = buttonState[side][0].pressed;
      const pos = xForm(inverse, [m[12], m[13], m[14]]); // beam's starting point
      const direction = xDirection(inverse, [-m[8], -m[9], -m[10]]);

      // GRAB: TRIGGER JUST PRESSED, HAND EMPTY, AND POINTING AT PILE HIT AREA
      if(pressed && !wasPressed[side] && !held[side] && beamOf(side).hitRect(pileRect.getGlobalMatrix())){
        const free_ball = balls.find(b => b.state === 'idle');
        if(free_ball){
          free_ball.state = 'held';
          held[side] = free_ball;
        }
      }
      // HOLD OR THROW 
      const ball = held[side];
      if(ball){
        if(pressed){
          // ball floats 0.05 units along the aim direction
          ball.p = pos.map((x, i) => x + direction[i] * 0.05);
        }
        else{
          // throw the ball along the aim direction
          ball.v = direction.map(x => x * SPEED);
          ball.state = 'thrown';
          ball.age = 0;
          held[side] = null; // frees the hand
        }
      }
      wasPressed[side] = pressed;
    }

    // BALLS: FLY AND CHECK TARGET
    for (const ball of balls){
      if( ball.state === 'thrown'){
        ball.p = ball.p.map((x, i) => x + ball.v[i] * dt); // creates new position from velocity and time
        ball.age += dt; // adds the elapsed time

        // checks if ball reached target's plane after offset is applied
        if (ball.p[2] <= target_z + targetOff[2]){
          // 2D distance from ball to target's center
          const d = Math.hypot(ball.p[0] - (dx + targetOff[0]), ball.p[1] - (target_y + dy + targetOff[1]));
          // checks if ball landed within the target and plays sound if did
          if (d <= RED_RADIUS && hitSound){
            playSoundAtPosition(hitSound, xForm(world.getGlobalMatrix(), ball.p));
          }
          // assigns points based on hitting white section, red section, or outside of the target
          if (d <= WHITE_RADIUS){
            score += 3;
            lastResult = 'BULLSEYE!';
          }
          else if (d <= RED_RADIUS){
            score += 1;
            lastResult = 'HIT!';
          }
          else{
            lastResult = 'MISS';
          }
          hideBall(ball); // returns ball to the pool
        }
        else if(ball.age > 3){
          hideBall(ball);
        }
      }
      if (ball.state != 'idle'){
        ball.node.identity().move(ball.p[0], ball.p[1], ball.p[2]).scale(BALL_PILE_RADIUS);
      }
    }
  };

  // SHARED THEME AMONG WIDGETS
   const widget = (w, title) => {
      w.setColor([0.25, 0.05, 0.4]).fillRect(-1, -1, 2, 2);        
      w.setColor([0.8, 0.90, 1.0]).fillRect(-0.92, -0.92, 1.84, 1.84); 
      w.setColor([0.1, 0.15, 0.35]).fillRect(-0.92, 0.55, 1.84, 0.37);  
      w.setColor('white').textHeight(0.11);
      w.text(title, 0, 0.68, 'center');
  }
  
  // VIEW WIDGET FOR SWITCHING BETWEEN THE EDIT AND GAME VIEWS
  let ViewWidget = new G2();
  model.txtrSrc(3, ViewWidget.getCanvas());
  let objViewWidget = model.add('square').txtr(3).move(0.2, 1.5, -0.18).scale(0.05);
  const placeNormal = () => objViewWidget.identity().move(0.2, 1.5, -0.18).scale(0.05);
  
  ViewWidget.render = function(){ 
    widget(this, inGameView ? 'EDIT' : 'GAME')
    this.setColor('black').textHeight(0.09);
    this.text('Score: ' + score, 0, 0.15, 'center');
    this.text(lastResult, 0, 0.35, 'center');
  };

  // INVISIBLE MARKER PLACED AT MINI PERSON'S EYE LEVEL
  const eyePoint = miniPerson.add("group").move(0, 1.4, -0.18);

  // ROOT NODE OF THE SCENE
  const root = clay.root();

  // TEXT FOR THE GAME NAME AND MODE TEXT
  clay.defineTextMesh('game_name', 'Hit the Target!');
  clay.defineTextMesh('mode_text', '');

  model.add('game_name').move(-0.4, 1.95, -0.38);
  model.add('mode_text').move(-0.4, 1.9, -0.38).scale(0.9, 0.9, 0.9);

  const updateText = () => {
    if (inGameView) {
      clay.defineTextMesh('mode_text', 'You\'re currently in Game mode. \nAim at the snowball pile and press and hold and then aim at the target. \nBullseye is 3 points, Hit is 1 point, and Miss is 0 points. \nPress Edit to go into Edit mode.');
    } 
    else {
      clay.defineTextMesh('mode_text', 'You\'re currently in Edit mode. \nFeel free to move the person, target, and snowball pile. \nPress Game to go into Game mode.');
    }
  };
  updateText();

  // SWITCH VIEW BETWEEN EDIT AND GAME MODES
  const switchView = () => {

    balls.forEach(hideBall);
    held.left = held.right = null;
    dragging.left = dragging.right = null;
    
    // edit mode, switch to game mode if click on game
    if (!inGameView) {
      // eye's position relative to the world itself
      const eyeLocal = cg.mMultiply(cg.mInverse(world.getGlobalMatrix()), eyePoint.getGlobalMatrix());
      const hp = root.inverseViewMatrix(0);   // headset position
      const headMove = [1,0,0,0, 0,1,0,0, 0,0,1,0, hp[12], hp[13], hp[14], 1]; // moves to where the head is

      // puts world at full size with the person's eye at your head
      displayPosition.setMatrix([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
      world.setMatrix(cg.mMultiply(headMove, cg.mInverse(eyeLocal)));

      // widget floats in front at normal size
      const scale = 0.1;
      objViewWidget.setMatrix([scale,0,0,0, 0,scale,0,0, 0,0,scale,0, hp[12]+.3, hp[13]+.05, hp[14]-.7, 1]);
      inGameView = true;
    } 
    // game mode, switch to edit mode if click on edit
    else {
      displayPosition.identity().move(0, 1, -0.6);
      world.identity().scale(MINI_SCALE, MINI_SCALE, MINI_SCALE);
      placeNormal();
      inGameView = false;
      dx = 0; 
      dy = 0;
      applyOffsets();
  }
  updateText();
  };

  // ADD VIEW WIDGET TO THE SCENE
  ViewWidget.addWidget(objViewWidget, 'button', 0, -.35,'#e9e279', ['                    Game                    ', '                   Edit                   '], switchView, 5.5);
   
  // UDPATE WIDGET/BEAMS, THEN RUN GAME LOGIC IN GAME MODE
  model.animate(() => {
    ViewWidget.update();
    LBeam.update();
    RBeam.update();

    // move the target and update the snowballs in game mode
    if(inGameView) {
      const t = performance.now() / 1000;
      dx = Math.sin(t * 0.6) + Math.sin(t * 1.9) * 0.5;
      dy = Math.sin(t * 1.3) * 0.4;
      applyOffsets();
      updateSnowballs();
    }
});
};
