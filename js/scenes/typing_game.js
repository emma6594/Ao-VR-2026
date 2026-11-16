/*

   A typing game to practice typing words before they reach the player.
   - Hold space, press k, then enter to start the game
   - When a word is being typed, that word will turn yellow to signal to the player
   - Once a word is correctly typed in time, it will disappear and the player will score a point
   - Once the 90 second timer is up, the game will end and the final score will be displayed
   - The instructions will be displayed after, and the player can start a new round by repeating the first step

*/
import {split} from "../render/core/cg.js";
// CONTAINS LIST OF ACTIVE WORDS, TYPED STRING, SCORE, STARTED FLAG, END TIME, AND FINAL SCORE FOR THE TYPING GAME
window.typingGame = { active: [], typed: '', score: 0, started: false, endTime: 0, finalScore: null};

export const init = async model => {

    // CONSTANTS FOR WORD SIZE, START AND END Z POSITIONS, AND SLOW AND FAST SPEEDS
    const SIZE = 2;
    const START_Z = -4;
    const END_Z = -1.8;
    const SECONDS_SLOW = 22;
    const SECONDS_FAST = 9;

    // BACKDROP BEHIND THE WORDS
    let background = model.add('cube').move(0, 1.5, -4.5).scale(7, 5, 0.01).color(0, 0, 0.8).opacity(1);

    // ADDING A PANEL TO DISPLAY SCORE/TYPED WORDS/TIME LEFT/FINAL SCORE
    let panel = model.add().move(-0.45, 2.15, -1.5).scale(1.25);
    let lastPanelText = null;

    // FUNCTION TO UPDATE THE PANEL TEXT ONLY IF IT HAS CHANGED
    const show = str => {
        if (str == lastPanelText){
            return;
        } 
        lastPanelText = str;
        while (panel.nChildren()){
            panel.remove(0);
        }
        panel.add(clay.text(split(str, 40))).color(1, 1, 1);
    }

    // EASY AND HARD VOCABULARY LISTS
    let e_vocab = 'pie,lip,wear,poll,fish,star,rain,kite,high,moon,fire'.split(',');
    let h_vocab = 'conjugate,symbol,terracotta,issue,constraint,illiterate,birdhouse,pendulum,omega,delegate,apricot,boring'.split(',');
    let vocab = e_vocab.concat(h_vocab);

    // FLAG TO DETERMINE IF THE CURRENT CLIENT IS CONTROLLING THE GAME
    let isController = false;

    // RENDERING TEXT OBJECTS FOR EACH WORD IN THE VOCABULARY LISTS
    let objs = vocab.map((word, idx) => {
        clay.defineTextMesh('word' + idx, word);
        return model.add('word' + idx);
    });

    // FUNCTION TO DETERMINE THE CURRENT LEVEL BASED ON THE SCORE
    const level = () => Math.min(1, typingGame.score / 20);

    // FUNCTION TO DETERMINE THE MAXIMUM NUMBER OF ACTIVE WORDS BASED ON THE CURRENT LEVEL
    const maxActive = () => Math.round(2 * level()) + 2;

    // TIMER VARIABLE TO CONTROL THE SPAWN LOOP
    let timer = null;
    // ROUND LENGTH IN SECONDS
    const GAME_SECONDS = 90;

    // DEFINING SLOTS FOR WORDS TO SPAWN
    const COLS = [-1.5, 0, 1.5];
    const ROWS = [1.0, 1.6, 2.2];
    const SLOTS = [];
    for (const y of ROWS){
        for (const x of COLS){
            SLOTS.push({x, y});
        }
    }

    // FUNCTION TO SPAWN A NEW WORD BASED ON THE CURRENT LEVEL AND ACTIVE WORDS
    const spawn = () => {
        let now = Date.now();
        let lvl = level();

        typingGame.active = typingGame.active.filter(w => (START_Z + (now - w.born) * w.speed) < END_Z);
    
        // DETERMINE IF THE NEW WORD SHOULD BE FROM THE HARD VOCABULARY BASED ON THE CURRENT LEVEL
        let isHard = Math.random() < lvl;

        // CHOOSE A WORD THAT IS NOT ALREADY ACTIVE
        let pool = vocab.map((_, idx) => idx)
            .filter(idx => (idx >= e_vocab.length) == isHard)
            .filter(idx => !typingGame.active.some(w => w.idx == idx));

        // FIND SLOTS THAT ARE NOT ALREADY USED BY ACTIVE WORDS
        const used = typingGame.active.map(w => w.slot);
        const free = SLOTS.map((_, idx) => idx).filter(idx => !used.includes(idx));
        
        // SPAWN A WORD IF THERE IS ONE AVAILABLE AND SETS ITS POSITION, SPEED, AND SPAWN TIME
        if (pool.length > 0 && free.length > 0 && typingGame.active.length < maxActive()) {
            let seconds = SECONDS_SLOW + (SECONDS_FAST - SECONDS_SLOW) * lvl;
            const slot = free[Math.random() * free.length >> 0];
            typingGame.active.push({
                idx: pool[Math.random() * pool.length >> 0],
                x: SLOTS[slot].x + (Math.random() - 0.5) * 0.2,
                y: SLOTS[slot].y + (Math.random() - 0.5) * 0.2,
                speed: (END_Z - START_Z) / (seconds * 1000),
                born: now,
                slot: slot
            });
        
            // BROADCAST THE UPDATED TYPINGGAME TO ALL CLIENTS
        server.broadcastGlobal('typingGame');
        }
    };
      
    // SPAWNS WORD AND SCHEDULES ITSELF (FASTER AS LEVEL RISES) AND ENDS GAME WHEN TIME IS UP
    const loop = () => {
        if (!typingGame.started || Date.now() > typingGame.endTime){
            if (typingGame.started){
                stop();
            }
            return;
        }
        spawn();
        timer = setTimeout(loop, 2000 - 1000 * level());
    };

    // FUNCTION TO REMOVE WORDS THAT HAVE REACHED THE END Z POSITION AND BROADCAST THE UPDATED typingGame TO ALL CLIENTS
    const expire = () => {
        let now = Date.now();
        let before = typingGame.active.length;
        typingGame.active = typingGame.active.filter(w => (START_Z + (now - w.born) * w.speed) < END_Z);
        if (typingGame.active.length < before) {
            server.broadcastGlobal('typingGame');
        }
    };

    // FUNCTION TO STOP THE GAME: SAVE FINAL SCORE, CLEAR THE TIMER, RESET THE STATE, AND BROADCAST THE UPDATE TO ALL CLIENTS
    const stop = () => {
        typingGame.finalScore = typingGame.score;
        clearTimeout(timer);
        timer = null;
        typingGame.started = false;
        typingGame.typed = '';
        typingGame.active = [];
        server.broadcastGlobal('typingGame');
    };

    //'KEYDOWN' TO PROCESS TYPING INPUT
    window.keydown = e => {

        if (e.repeat) return;
        isController = true;
        
        // ENTER STARTS OR RESTARTS A ROUND: CLEARS OLD TIMER, SETS END TIME, RESETS TYPED/SCORE/ACTIVE, STARTS SPAWN LOOP
        if (e.key == 'Enter'){
            clearTimeout(timer);
            timer = null;
            typingGame.endTime = Date.now() + GAME_SECONDS * 1000;
            typingGame.started = true;
            typingGame.typed = '';
            typingGame.score = 0;
            typingGame.active = [];
            loop();
        }

        // IF THE KEY PRESSED IS A SINGLE CHARACTER (NOT SPACE), APPEND IT TO THE TYPED STRING
        if (e.key.length == 1 && e.key != ' ' && typingGame.typed.length < 20 ){
            typingGame.typed += e.key.toLowerCase();
        }

        // IF THE BACKSPACE/DELETE KEY IS PRESSED, REMOVE THE LAST CHARACTER FROM THE TYPED STRING 
        if (e.key == 'Backspace' || e.key == 'Delete') {
            typingGame.typed = typingGame.typed.slice(0, -1);
        }

        //  CHECKS IF TYPED TEXT MATCHES ACTIVE WORD --> SCORE IT AND REMOVE IT
        let hit = typingGame.active.findIndex(w => vocab[w.idx] == typingGame.typed);

        if (hit >= 0) {
            typingGame.score++;
            typingGame.typed = '';
            typingGame.active.splice(hit, 1);
        }
        server.broadcastGlobal('typingGame');
    };

    // ADDING AN EVENT LISTENER FOR KEYDOWN EVENTS TO HANDLE TYPING INPUT
    window.addEventListener('keydown', e => {
        if (!typingGame.started) return;

        const isLetter = e.key.length == 1 && e.key != ' ';
        const isDelete = e.key == 'Backspace' || e.key == 'Delete';

        if (isLetter || isDelete) {
            e.stopImmediatePropagation();
            e.preventDefault();          
            window.keydown(e);
        }
    }, true);

    // ANIMATION LOOP
    model.animate(() => {

        // SYNCHRONIZE STATE FROM THE SERVER IF NOT CONTROLLER
        if (!isController){
            typingGame = server.synchronize('typingGame');
        }
        // NO ACTIVE TYPING GAME OR THE ACTIVE PROPERTY IS NOT AN ARRAY, RETURN
        if (!typingGame || !Array.isArray(typingGame.active)) return;

        // CLIENT IS CONTROLLER AND GAME HAS STARTED, EXPIRE WORDS AND STOP THE GAME IF TIME IS UP
        if (isController && typingGame.started) {
            expire();
            if (Date.now() > typingGame.endTime) {
                stop();
            }
        }

        // UPDATE THE PANEL ON WHETHER GAME HAS STARTED OR NOT, SHOWING SCORE, TYPED WORDS, TIME LEFT, OR FINAL SCORE
        if (typingGame.started) {
            const left = Math.max(0, Math.ceil((typingGame.endTime - Date.now()) / 1000));
            show('Score: ' + typingGame.score + '\nTyping: ' + typingGame.typed + '\nTime Left: ' + left + 's');
        }
        else{
            let last = '';
            if (typingGame.finalScore !== null) {
                last = 'Final Score: ' + typingGame.finalScore + '\n\n';
            }
            show(last + 'Typing Game\n\nHold Space and press k,\n then press enter to start.\n\nType the words before they reach you!');
        }
        let now = Date.now();

        // UPDATE THE POSITION/COLOR OF EACH WORD BASED ON WHETHER IT IS ACTIVE AND IF IT MATCHES THE TYPED STRING
        for (let i = 0; i < vocab.length; i++) {
            let w = typingGame.active.find(w => w.idx == i);
            if (w) {
                let z = START_Z + (now - w.born) * w.speed;
                let typing = typingGame.typed.length > 0 && vocab[i].startsWith(typingGame.typed);
                objs[i].identity().move(w.x, w.y, z).scale(SIZE);
                if (typing) {
                    objs[i].color('yellow');
                } else {
                    objs[i].color('red');
                }
            } else {
                objs[i].identity().scale(0); // not active so hidden
            }
        }
    });
}
