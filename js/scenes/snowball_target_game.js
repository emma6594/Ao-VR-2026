/*

   A "Hit the Target" game with two players: GIANT and MINI
   - GIANT View: You can aim and drag to move the target and the pile of snowballs
   - MINI View: This is the gameplay mode where you throw snowballs at the target
        - Point at the snowball pile to grab a snowball, press the trigger, hold while aiming, and release to throw it at the moving target
   - Score: bullseye = 3, hit = 1, miss = 0
   - In each view, you can see where the other player is located in regards to the scene

*/

import * as cg from "../render/core/cg.js";
import { buttonState, ControllerBeam} from "../render/core/controllerInput.js";
import { loadSound, playSoundAtPosition } from "../util/positional-audio.js";

let hitSound = null;
loadSound('../../media/sound/SFXs/demoBalls/SFX_Ball_Create_Mono_01.wav', buffer => {
  hitSound = buffer;
});

export const init = async model => {
  const MINI_SCALE = 1 / 12;
  let myRole = null;

  // X AXIS, Y AXIS, Z AXIS, AND TRANSLATION
  const GIANT_WORLD = [MINI_SCALE, 0, 0, 0, 0, MINI_SCALE, 0, 0, 0, 0, MINI_SCALE, 0, 0, 1, -0.6, 1];
  const MINI_EYE = [0, 1.4, 0.36]
  const MINI_WORLD = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0 - MINI_EYE[0], 1.6 - MINI_EYE[1], 0 - MINI_EYE[2], 1];
  const GIANT_INV = cg.mInverse(GIANT_WORLD);
  const MINI_INV = cg.mInverse(MINI_WORLD);


  // CONTAINERS FOR THE WORLD
  const displayPosition = model.add("group")
  const world = displayPosition.add("group")

  // ASSIGN EACH CLIENT TO GIANT OR MINI VIEW
  const setRole = role => {
    myRole = role;
    balls.forEach(hideBall);
    held.left = held.right = null;
    dragging.left = dragging.right = null;
    if(role === 'giant') {
      displayPosition.identity().move(0, 1, -0.6);
      world.identity().scale(MINI_SCALE, MINI_SCALE, MINI_SCALE);
    } 
    else {
      displayPosition.identity();
      world.setMatrix(MINI_WORLD);
    }
  }

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

  // APPLIES MATRIX m TO POINT p
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

  // OFFSETS FOR PILE AND TARGET
  const pileOff = [0, 0, 0];
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


  // PUT PILE AND TARGET AT THEIR OFFSETS
  const applyOffsets = () => {
    snowballs.identity().move(pileOff[0], pileOff[1], pileOff[2]);
    target.identity().move(targetOff[0] + dx, targetOff[1] + dy, targetOff[2]);
  };
  applyOffsets();


  // INVISIBLE HIT AREAS
  const pileRect = snowballs.add('group').move(PILE_CENTER[0], PILE_CENTER[1], PILE_CENTER[2] - 0.15).scale(GRAB_RADIUS);
  const targetRect = target.add('group').move(0, target_y, target_z - 0.15).scale(RED_RADIUS * 0.7);
  
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

  // LIST OF OBJS THAT CAN BE GRABBED BY THE GIANT
  const drag_objs = [
    { off: pileOff, rect: pileRect },
    { off: targetOff, rect: targetRect },
  ];

  // TRACKS WHAT EACH HAND IS DRAGGING
  const dragging = {
    left: null,
    right: null
  };

  // INPUT EVENT HANDLERS
  inputEvents.onPress = hand => {
    if (myRole !== 'giant'){
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
    if (!drag || myRole !== 'giant'){
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

  // AVATAR OF OTHER PLAYER
  const avatar = world.add('group');
  const head = avatar.add('group');
  const left = avatar.add('group');
  const right = avatar.add('group');
  head.add('sphere').scale(0.08).color(1, 0.5, 0.5);

  head.child(0).add('sphere').color(0, 0, 0).turnY(-0.4).turnX(-0.2).move(0, 0, -1).scale(0.24, 0.14, 0.05);
  head.child(0).add('sphere').color(0, 0, 0).turnY(0.4).turnX(-0.2).move(0, 0, -1).scale(0.24, 0.14, 0.05);

  // CONTROLLERS FOR EACH HAND
  for (const h of [left, right]){
    h.add('tubeZ').scale(0.02, 0.02, -0.05).color(1, 1, 1);
    h.add('sphere').move(0, 0, -0.1).scale(0.03).color(0.5, 0.5, 0.5);
  }

  // RETURNS ID OF FIRST CLIENT THAT ISN'T YOU AND IN XR MODE
  const otherID = () => clients.find(id => id !== clientID && clientState.isXR(id));

  // UPDATES THE AVATAR OF THE OTHER PLAYER BASED ON THEIR CURRENT STATE
  const updateAvatar = () => {
    const id = otherID();
    if (id === undefined){
        avatar.identity().scale(0.0001); // avatar shrunk to nothing
        return;
    }

    if (myRole === 'giant'){
        avatar.setMatrix(MINI_INV);
    }
    else{
        avatar.setMatrix(GIANT_INV);
    }
 
    head.setMatrix(clientState.head(id));
    right.setMatrix(clientState.hand(id, 'right'));
    left.setMatrix(clientState.hand(id, 'left'));
  };

  // SERVER COMMUNICATION AND STATE SYNCHRONIZATION
  server.init('hitTarget', {});
  let remote = {};
  const syncState = () => {
    if (myRole === 'giant'){
        server.send('hitTarget', {from: clientID, pile: pileOff, target: targetOff});
        
    }
    else{
        const ballData = [];
        for (const ball of balls){
            if (ball.state === 'idle'){
                ballData.push(null);
            }
            else{
                const rounded = [];
                for (const x of ball.p){
                    rounded.push(Math.round(x * 1000) / 1000);
                }
                ballData.push(rounded);
            }
        }
        server.send('hitTarget', {from: clientID, score, last: lastResult, balls: ballData});  
    }

    // SYNCHRONIZE THE GAME STATE WITH THE SERVER
    server.sync('hitTarget', messages => {
        for (const id in messages){
            const message = messages[id];
            if (message && message.from !== undefined && message.from !== clientID){
                remote = message;
            }
        }
    });

    // UPDATE THE LOCAL GAME STATE BASED ON THE REMOTE STATE
    if (myRole === 'mini'){
        if (remote.pile){
            for (let i = 0; i < 3; i++){
                pileOff[i] = remote.pile[i];
            }
        }
        if (remote.target){
            for (let i = 0; i < 3; i++){
                targetOff[i] = remote.target[i];
            }
        }
    }
    else{
        if (remote.score !== undefined){
            score = remote.score;
            lastResult = remote.last;
        }
        if (remote.balls){
            balls.forEach((ball, index) => {
                if (remote.balls[index] === null){
                    hideBall(ball);
                }
                else{
                    ball.node.identity().move(remote.balls[index][0], remote.balls[index][1], remote.balls[index][2]).scale(BALL_PILE_RADIUS);
                }
            });
        }
    }
  }

  // INSTRUCTIONS FOR GIANT AND MINI PLAYER AS WELL AS DISPLAYING SCORES AND RESULTS
  clay.defineTextMesh('game_name', 'Hit the Target!');
  clay.defineTextMesh('mode_text', '');

  model.add('game_name').move(-0.4, 1.95, -0.38);
  model.add('mode_text').move(-0.4, 1.9, -0.38).scale(0.9, 0.9, 0.9);

  let lastText = '';
  const updateText = () => {
    let info;
    if(myRole === 'giant'){
        info = 'You are the GIANT. \nDrag the target and the snowball pile to make it hard for the mini player.';
    }
    else{
        info = 'You are the MINI player. \nAim at the snowball pile to pick up a snowball, then aim at the target and release. \nBullseye is 3 points, Hit is 1 point, and Miss is 0 points.';
    }
    
    const text = info + '\nScore: ' + score + '  ' + lastResult;
    if (text !== lastText){
        clay.defineTextMesh('mode_text', text);
        lastText = text;
    }  
  };
  updateText();
   
  // UPDATE BEAMS, ASSIGNS ROLE, MOVE TARGET, SYNC, DRAW AVATAR AND TEXT, THEN THROWING FOR MINI ONLY
  model.animate(() => {
    LBeam.update();
    RBeam.update();

    let role;
    if (isMasterClient()) {
        role = 'giant';
    }
    else {
        role = 'mini';
    }

    if (role !== myRole) {
        setRole(role);
    }

    const t = Date.now() / 1000;
    dx = Math.sin(t * 0.6) + Math.sin(t * 1.9) * 0.5;
    dy = Math.sin(t * 1.3) * 0.4;
    
    syncState();
    applyOffsets();
    updateAvatar();
    updateText();
    
    if (myRole === 'mini') {
        updateSnowballs();
    }

    });
};
