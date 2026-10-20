/* 
  A Christmas tree farm scene with Christmas trees, a frozen pond, a snowman, a fence, and a bunch of kids.
*/
export const init = async model => {

  // FUNCTION TO CREATE A TREE IN THE SCENE
  const makeTree = (x, z, size) => {
    const part = (shape, color, y, sx, sy, sz) => {
      const obj = model.add(shape);
      obj.color(...color);
      obj.identity()
        .move(x, y * size, z)
        .scale(sx * size, sy * size, sz * size);
    };

    part('tubeY', [0.4, 0.2, 0], 0.7, 0.1, 0.3, 0.1);
    part('coneY', [0, 0.6, 0], 1, 0.7, 0.5, 0.7);
    part('coneY', [0, 0.7, 0], 1.35, 0.5, 0.45, 0.5);
    part('coneY', [0, 0.8, 0], 1.65, 0.35, 0.4, 0.35);
    part('pyramidY', [1, 0.9, 0.1], 2.2, 0.18, 0.18, 0.18);
    part('tubeY', [0.4, 0.2, 0], 0.35, 0.15, 0.5, 0.15);

  };

  // CREATE TREES IN THE SCENE
  const trees = [
    [-0.5, -2.3, 1.2],      
    [-4.5, -3.5, 1.0],
    [-3.2, -6.0, 1.3],
    [-4.0, -8.2, 0.9],
    [-2.6, -8.8, 1.0],
    [-1.8, -4.5, 0.8],
    [-1.2, -7.5, 1.4],
    [-0.2, -5.5, 1.0],
    [0.6, -6.8, 0.8],
    [1.0, -8.5, 1.1],
    [1.6, -3.8, 0.7],
    [2.4, -6.5, 1.2],
    [3.0, -4.2, 0.9],
    [3.8, -8.0, 1.5],
    [4.5, -5.5, 1.0],
    [4.6, -3.4, 0.8],
  ];

  trees.forEach(([x, z, size]) => makeTree(x, z, size));

// FLOOR
const floor = model.add('cube');
floor.identity().move(0, -0.05, -2.5).scale(20, 0.05, 7.5).color(1, 1, 1);

// SKY
const sky = model.add("cube");
sky.identity().move(0, 5, -10.1).scale(20, 5, 0.1).color(0.6, 0.75, 1.0).opacity(1);

// FROZEN POND
const pond = model.add("tubeY"); pond.identity().move(2.5, 0.05, -1.5).scale(2, 0.02, 2).color(0.6, 0.8, 1.0).opacity(1);

// SNOWMAN
const snowman = model.add("group");

const node0 = snowman.add("sphere"); 
node0.identity().move(0, 1, -2).scale(0.6, 0.6, 0.6).color(1, 1, 1); 
    
const node1 = snowman.add("sphere"); 
node1.identity().move(0, 1.7, -2).scale(0.45, 0.45, 0.45).color(1, 1, 1); 

const node2 = snowman.add("sphere"); 
node2.identity().move(0, 2.25, -2).scale(0.3, 0.3, 0.3).color(1, 1, 1); 
    
// EYES OF THE SNOWMAN
const node3 = snowman.add("sphere"); 
node3.identity().move(-0.08, 2.32, -1.72).scale(0.03, 0.03, 0.03).color(0, 0, 0); 
    
const node4 = snowman.add("sphere"); 
node4.identity().move(0.08, 2.32, -1.72).scale(0.03, 0.03, 0.03).color(0, 0, 0); 
    
// NOSE OF THE SNOWMAN
const nose = snowman.add("coneY"); 
nose.identity().move(0, 2.25, -1.7).turnX(Math.PI / 2).scale(0.05, 0.2, 0.05).color(1, 0.5, 0); 

// ARMS OF THE SNOWMAN
const left_arm = snowman.add("tubeY");
left_arm.identity().move(-0.5, 1.85, -1.8).turnZ(Math.PI / 4).scale(0.025, 0.25, 0.025).color(0.25, 0.13, 0.05);
    
const right_arm = snowman.add("tubeY");
right_arm.identity().move(0.5, 1.85, -1.8).turnZ(-Math.PI / 4).scale(0.025, 0.25, 0.025).color(0.25, 0.13, 0.05);

// MOVING SNOWMAN TO CERTAIN POSITION
snowman.identity().move(-2, -0.5, 0.05).scale(0.8, 0.8, 0.8);

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

// PUTTING THE PEOPLE IN DIFFERENT PLACES IN THE SCENE
makePerson([1, .6, .75], 0).scale(0.7, 0.7, 0.7); 
makePerson([0.6, 0.2, 1], -1.2).move(2, 0, -6).scale(0.5, 0.5, 0.5); 
makePerson([0.1, 0.5, 1], -0.6).move(-2, 0, -3).scale(0.6, 0.6, 0.6); 
makePerson([0, 1, 0.9], 0.6).move(0, 0, -3.5).scale(0.6, 0.6, 0.6);
makePerson([1, 0.9, 0], 1.2).move(2, 0, -3.5).scale(0.6, 0.6, 0.6); 
makePerson([1, 0.5, 0], 1.8).move(-7, 0, -2.5).scale(0.7, 0.7, 0.7);
makePerson([1, 0.2, 0.8], 1.8).move(3, -0.1, -3).scale(0.7, 0.7, 0.7);


// SNOWFLAKES STARTING AT RANDOM POSITIONS, SIZES, AND SPEEDS
const snowflakes = [];  
const flakeCount = 60;  
  for (let i = 0; i < flakeCount; i++) {    
    const flake = model.add("sphere");    
    const x = (Math.random() - 0.5) * 20;    
    const y = 0.5 + Math.random() * 3.5;    
    const z = -1 + Math.random() * -10;    
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
        f.x = (Math.random() - 0.5) * 20;        
        f.z = -1 + Math.random() * -10;
      }      
      f.node.identity().move(f.x, f.y, f.z).scale(f.s, f.s, f.s).color(1, 1, 1).opacity(1);    
      }  
  });

};