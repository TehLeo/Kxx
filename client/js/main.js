"use strict";

function err(text) {
	console.log("Error: " + text);
}
function log(pos, text) {
	document.getElementById("log"+pos).innerHTML = text;
}
function distSq(a, b) {
	return a.xy.distSq(b.xy);
}
function dist(a, b) {
	return a.xy.dist(b.xy);
}
var INTER_MAX_SPD_CHAR = 50;
var INTER_MAX_SPD_BALL = 300;
function interpolate(v, tx, ty, t, maxSpeed) {
	var dist = v.dist2(tx,ty);
	var max = t*maxSpeed;
	if(dist <= max) {
		v.set2(tx, ty);
	}
	else {
		dist = max/dist;
		v.set2(v.x+dist*(tx-v.x), v.y+dist*(ty-v.y));
	}
}

var KeyInput = {
	SPACE: 32,
	W: 87,
	S: 83,
	A: 65,
	D: 68,
	UP: 38,
	DOWN: 40,
	LEFT: 37,
	RIGHT: 39
};


/*
class Game {
	constructor(p) {
		this.players = p;
		this.ball = new Ball();
		this.player = -1;
		this.ball.xy.x = 50;
	}
	getPlayer() {
		if(this.player === -1) return null;
		return this.players[this.player];
	}
	hasBall() {
		return this.ball.player === this.player;
	}
}
*/

class GlobalData {
	constructor() {
		this.game = new Game();
		this.player = null;
		//this.game.player = 0;
	}
	hasBall() {
		return this.game.ball.charId === this.player.charId;
	}
	getChar() {
		if(this.player === null || this.player.charId === -1) return null;
		return this.game.chars[this.player.charId];
	}
}

var gl = new GlobalData();

class Canvas {
	constructor(args) {
 		this.canvas = document.getElementById('mainCanvas');
		this.keyMap = {
			UP: false,
			DOWN: false,
			LEFT: false,
			RIGHT: false,
		};
		this.movement = Movement.NONE;
		this.doPass = 0;
		this.didPass = 0;
		this.endPass = 0;
		this.passA = 0;
		this.dash = false;
		this.doTackle = false;
		this.tackleA = 0;
		this.lastUpdateStep = 0;
		this.g = this.canvas.getContext('2d');
		this.mXY = new vec2(0,0);
		this.debugPos = new vec2(0.0,0.0);

		log(0, "UP " + this.keyMap );
		log(0, "UP " + this.keyMap );

		//this.canvas.addEventListener('keydown', this.keyDown.bind(this), false);
        //this.canvas.addEventListener('keyup', this.keyUp.bind(this), false);
		document.body.addEventListener('keydown', this.keyDown.bind(this), false);
		document.body.addEventListener('keyup', this.keyUp.bind(this), false);
 		this.canvas.addEventListener('mousemove', this.mouseMove.bind(this), false);
		this.canvas.addEventListener('mousedown', this.mouseDown.bind(this), false);
		this.canvas.addEventListener('mouseup', this.mouseUp.bind(this), false);
		window.addEventListener('resize', this.resize.bind(this), false);
		this.resize();
	} 
	mouseMove(e) {
		log("mouse", "move " + JSON.stringify(e) + " " + e.clientX + " " + e.clientY)
		this.mXY.x = e.clientX;
		this.mXY.y = e.clientY;
	}
	mouseDown(e) {
		this.mXY.x = e.clientX;
		this.mXY.y = e.clientY;
		var p0 = gl.getChar();
		if(p0 === null) return;
		var ball = gl.game.ball;
		switch (e.button) {
			case 0: //LEFT CLICK
				if(gl.hasBall()) {
					//dist();
					//var len = p0.xy.dist(this.mXY);
					//if(len >= 1.0) {
					//	len = 1.0/len;
						//Shoot
						//ball.delay = 0.5;
						//ball.dxy.x = len*(this.mXY.x-p0.xy.x);
						//ball.dxy.y = len*(this.mXY.y-p0.xy.y);
					
						//ball.xy.set(p0.xy);
						//ball.player = -1;
					//}
					if(p0.canPass()) {
						this.doPass = A.MSG_CLIENT_PASS_START;
						this.didPass = A.MSG_CLIENT_PASS_START;
					}
				}
				else {
					//Tackle
					if(p0.canTackle()) {
						var len = p0.xy.dist(this.mXY);
						this.doTackle = true;

						if(len >= 1.0) {
							//len = 1.0/len;
						
							//p0.tackle = 1.0;
							//p0.delay = 1.5;
							//p0.dxy.x = len*(this.mXY.x-p0.xy.x);
							//p0.dxy.y = len*(this.mXY.y-p0.xy.y);
							this.tackleA = atan2PI(this.mXY.x-p0.xy.x,this.mXY.y-p0.xy.y);
						}	
						else {
							this.tackleA = 0;
						}
					}
				}
				break;
			case 2: //RIGHT CLICK
				if(gl.hasBall()) {
					if(p0.canPass()) {
						this.doPass = A.MSG_CLIENT_VOLLEY_START;
						this.didPass = A.MSG_CLIENT_VOLLEY_START;
					}
				}
				else {

				}
				break;
		}
	}
	mouseUp(e) {
		this.mXY.x = e.clientX;
		this.mXY.y = e.clientY;
		var p0 = gl.getChar();
		if(p0 === null) return;
		var ball = gl.game.ball;
		switch (e.button) {
			case 0:
				if(this.didPass === A.MSG_CLIENT_PASS_START) {
					this.didPass = 0;
					this.endPass = A.MSG_CLIENT_PASS_END;
					var len = p0.xy.dist(this.mXY);
					if(len >= 1.0) {
						this.passA = atan2PI(this.mXY.x-p0.xy.x,this.mXY.y-p0.xy.y);
					}	
					else {
						this.passA = 0;
					}
				}
			break;
			case 2:
				if(this.didPass === A.MSG_CLIENT_VOLLEY_START) {
					this.didPass = 0;
					this.endPass = A.MSG_CLIENT_VOLLEY_END;
					var len = p0.xy.dist(this.mXY);
					if(len >= 1.0) {
						this.passA = atan2PI(this.mXY.x-p0.xy.x,this.mXY.y-p0.xy.y);
					}	
					else {
						this.passA = 0;
					}
				}
			break;
		}
		//log(2, "move " + JSON.stringify(e) + " " + e.button + " " + e.clientX + " " + e.clientY);
	}
	keyUp(e) {
		switch (e.keyCode) {
 			case KeyInput.UP: case KeyInput.W: this.keyMap.UP = false; 
				this.movement = Movement.fromId((this.movement.id & Movement.MASK_X) | (this.keyMap.DOWN?Movement.DOWN.id:0)); 
				break;
 			case KeyInput.DOWN:	case KeyInput.S: this.keyMap.DOWN = false; 
				this.movement = Movement.fromId((this.movement.id & Movement.MASK_X) | (this.keyMap.UP?Movement.UP.id:0)); 
				break; 			
			case KeyInput.LEFT:	case KeyInput.A: this.keyMap.LEFT = false; 
				this.movement = Movement.fromId((this.movement.id & Movement.MASK_Y) | (this.keyMap.RIGHT?Movement.RIGHT.id:0)); 
				break; 			
			case KeyInput.RIGHT: case KeyInput.D: this.keyMap.RIGHT = false; 
				this.movement = Movement.fromId((this.movement.id & Movement.MASK_Y) | (this.keyMap.LEFT?Movement.LEFT.id:0)); 
				break;
			//case KeyInput.SPACE:
			//	this.keyMap.SPACE = false; 
			//	break;
			default:
				return;			
		}
		var p0 = null; //gl.game.getPlayer();
		if(p0 === null) return;
		log(0, "U " + JSON.stringify(this.keyMap) );
		if(p0.isTackling() && this.movement.dx == 0 && this.movement.dy == 0) {

		}
		else {
			p0.dxy.x = this.movement.dx;
			p0.dxy.y = this.movement.dy;
		}
	}
	keyDown(e) {
		switch (e.keyCode) {
 			case KeyInput.UP: case KeyInput.W: this.keyMap.UP = true; 
				this.movement = Movement.fromId((this.movement.id & Movement.MASK_X) | Movement.UP.id); 
				break;
 			case KeyInput.DOWN: case KeyInput.S: this.keyMap.DOWN = true; 
				this.movement = Movement.fromId((this.movement.id & Movement.MASK_X) | Movement.DOWN.id); 
				break; 			
			case KeyInput.LEFT: case KeyInput.A: this.keyMap.LEFT = true;
				this.movement = Movement.fromId((this.movement.id & Movement.MASK_Y) | Movement.LEFT.id); 
				break; 			
			case KeyInput.RIGHT: case KeyInput.D: this.keyMap.RIGHT = true; 
				this.movement = Movement.fromId((this.movement.id & Movement.MASK_Y) | Movement.RIGHT.id); 
				break;	
			case KeyInput.SPACE:
				this.dash = true; 
				break;	
			default:
				return;				
		}
		var p0 = null; //gl.game.getPlayer();
		if(p0 === null) return;
		log(0, "D " + JSON.stringify(this.keyMap) );
		p0.dxy.x = this.movement.dx;
		p0.dxy.y = this.movement.dy;
	}
	resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
	testUpdate(step) {
		var player = gl.player;
		if(player === null) return;
		var updateStepEl = step-this.lastUpdateStep;
		this.lastUpdateStep = step;

		var el = 0.1; 

		log(1, JSON.stringify(this.movement) );

		var chars = gl.game.chars;
		var ball = gl.game.ball;

		var VAR_RUN_SPEED = 50;
		var VAR_TCK_SPEED = 200;

		/*for(var k = 0; k < chars.length; k++) {
		
			var p0 = chars[k] ; //gl.game.getPlayer();

			var VAR_RUN_SPEED = 50;
			var VAR_TCK_SPEED = 200;

			var spd = VAR_RUN_SPEED;
			var ballSpd = 300;

			if(p0.isTackling()) {
				spd = VAR_TCK_SPEED;
				//etc todo exact 
			}
		
			if(p0.canMove()) {
				p0.xy.x += p0.dxy.x*spd*el;
				p0.xy.y += p0.dxy.y*spd*el;
				
				//player bounds
				if(p0.xy.x < RECT_L) {
					p0.xy.x = RECT_L;
				}
				else if(p0.xy.x > RECT_R) {
					p0.xy.x = RECT_R;
				}

				if(p0.xy.y < RECT_T) {
					p0.xy.y = RECT_T;
				}
				else if(p0.xy.y > RECT_B) {
					p0.xy.y = RECT_B;
				}
				
			}
			
			if(p0.tackle > 0) {
				p0.tackle = p0.tackle-el;
				if(p0.tackle <= 0.0) {
					p0.tackle = 0.0;
					p0.dxy.x = this.movement.dx;
					p0.dxy.y = this.movement.dy;
				} 
			}
			if(p0.delay > 0) p0.delay = Math.max(0, p0.delay-el);

		}*/
			/*
			if(p0 !== null) {

			if(ball.isFree()) {
				if(ball.dxy.x != 0.0 || ball.dxy.y != 0.0) { 
			
					ball.xy.x += ball.dxy.x*ballSpd*el;
					ball.xy.y += ball.dxy.y*ballSpd*el;

					//ball bounds
					if(ball.xy.x <= RECT_L) {
						ball.dxy.x = -ball.dxy.x;		
						ball.xy.x = RECT_L + (RECT_L-ball.xy.x);
					}
					else if(ball.xy.x >= RECT_R) {
						ball.dxy.x = -ball.dxy.x;		
						ball.xy.x = RECT_R - (ball.xy.x-RECT_R);
					}

					if(ball.xy.y <= RECT_T) {
						ball.dxy.y = -ball.dxy.y;		
						ball.xy.y = RECT_T + (RECT_T-ball.xy.y);
					}
					else if(ball.xy.y >= RECT_B) {
						ball.dxy.y = -ball.dxy.y;		
						ball.xy.y = RECT_B - (ball.xy.y-RECT_B);
					}
				}
				
				if(ball.delay > 0) {
					ball.delay = Math.max(0, ball.delay-el);
				}
				else {
					var dist = distSq(ball, p0);
					if(dist < 50*50) {
						if(p0.isTackling()) {
							//if(dist < 1.0) {
							//	ball.dxy.x = 0.0;
							//	ball.dxy.y = -1.0;
							//}
							//else {
							//	dist = 1.0/Math.sqrt(dist);
							//	ball.dxy.x = dist*(ball.xy.x-p0.xy.x);
							//	ball.dxy.y = dist*(ball.xy.y-p0.xy.y);
							//}

							var len = ball.xy.dist(this.mXY);
							if(len < 1.0) {
								ball.dxy.x = 0.0;
								ball.dxy.y = -1.0;
							}
							else {
								len = 1.0/len;

								ball.delay = 0.5;
								ball.dxy.x = len*(this.mXY.x-p0.xy.x);
								ball.dxy.y = len*(this.mXY.y-p0.xy.y);
							}
						}
						else {
							ball.player = 0;
						}
					}
				}
			}
		}*/

		this.clear();
		this.rect(RECT_L, RECT_T, RECT_R-RECT_L, RECT_B-RECT_T);
		//=====DRAW=====
		//arrow
		//if(p0 !== null) this.line(this.mXY.x, this.mXY.y, p0.xy.x, p0.xy.y);

		this.color("#aa7732");
		this.circle(this.debugPos.x,this.debugPos.y,25);

		this.color("#000000");
		
		//chars
		for(var i = 0; i < chars.length; i++) {
		  	var p = chars[i];

			var elStep = (step-p.gameStep)*TICK_MS*0.001;

			if(i == gl.player.charId) {
				
				log(5, " el " + elStep  + " " + p.dxy.x + " " + p.dxy.y );
			}

			if(player.charId == i) {
				this.color("#eaae62");
			}
			else {
				this.color("#000000");
			}

			if(!p.canMove()) {
				this.color("#552232");
			}

			var spd = VAR_RUN_SPEED;
			if(p.isTackling()) {
				spd = VAR_TCK_SPEED;
				//etc todo exact 
				this.color("#aa7732");
			}
			else if(p.isDashing()) {
				spd = A.DASH_SPD;
			}
			else if(p.isPassing()) {
				spd = A.PLAYER_PASS_SPD;
			}

			

			var xx = p.xy.x + elStep * spd * p.dxy.x;
			var yy = p.xy.y + elStep * spd * p.dxy.y;

			interpolate(p.xyI, xx, yy, updateStepEl, INTER_MAX_SPD_CHAR);
			this.circle(p.xyI.x, p.xyI.y, 50);

			if(ball.charId === i) {
				var dir = Movement.fromId(p.lookAtDir);
				ball.xyI.x = xx + dir.dx*A.BALL_POS_RAD;
				ball.xyI.y = yy + dir.dy*A.BALL_POS_RAD;
				this.circle(ball.xyI.x, ball.xyI.y, 10);
			} 		
		}

		this.color("#000000");

		if(ball.isFree()) {
			var ballSpd = A.BALL_SPD;
			var elStep = (step-ball.gameStep)*TICK_MS*0.001;

			log("ball", "ball is at " + ball.xy.x + ", " + ball.xy.y + " " +  elStep);

			var bx = ball.xy.x + elStep * ballSpd * ball.dxy.x;
			var by = ball.xy.y + elStep * ballSpd * ball.dxy.y;

			if(bx <= RECT_L) {
				//ball.dxy.x = -ball.dxy.x;		
				bx = RECT_L + (RECT_L-bx);
			}
			else if(bx >= RECT_R) {
				//ball.dxy.x = -ball.dxy.x;		
				bx = RECT_R - (bx-RECT_R);
			}

			if(by <= RECT_T) {
				//ball.dxy.y = -ball.dxy.y;		
				by = RECT_T + (RECT_T-by);
			}
			else if(by >= RECT_B) {
				//ball.dxy.y = -ball.dxy.y;		
				by = RECT_B - (by-RECT_B);
			}

			interpolate(ball.xyI, bx, by, updateStepEl, INTER_MAX_SPD_BALL);

			this.circle(ball.xyI.x, ball.xyI.y,10);
		}
		else {
			//this.circle(ball.getX(),ball.getY(),10);
		}		
	}
	clear() { var g = this.g; g.clearRect(0, 0, this.canvas.width, this.canvas.height); } color(col) { var g = this.g;         g.strokeStyle = col;}
	circle(x,y,r) { var g = this.g;	g.beginPath();			g.arc(x,y,r,0,2*Math.PI);				g.stroke();		}
	line(x,y,x2,y2) { var g = this.g;	g.beginPath();			g.moveTo(x, y);     g.lineTo(x2, y2);				g.stroke();		}
	rect(x,y,w,h) { var g = this.g;	g.beginPath();			g.rect(x, y, w, h); 				g.stroke();		}
}

//ar Canvas = require('./canvas');

var canvas = new Canvas();
var chan = null;
var reader = new FileReader();

function init() {
	//var HOST = "ws://" + "127.0.0.1" + ":" + 5000";
	var HOST = location.origin.replace(/^http/, 'ws');
	var chan0 = new WebSocket(HOST);
	chan0.binaryType = "arraybuffer";

	gl.player = new Player(chan0, -1, "unknown");
	chan0.onopen = function() {
		chan = chan0;
    };	
	chan0.onmessage = function(msg) {
  		//console.log(msg);
		if(msg.data instanceof ArrayBuffer) { 
			var buf = wrap(msg.data);
			//console.log("char data " + buf.dataU8);
			
			while(buf.pos < buf.limit) {
				var type = buf.getByte();
				switch(type) {
					case MSG_GAME_TIME:
						gl.game.setGameTime(buf);	
						gl.game.started = true;
					break;
					case MSG_CHAR_DATA:
						gl.game.setChar(buf);
					break;
					case MSG_CHAR_TCK:
						gl.game.setTck(buf);
					break;
					case A.MSG_CHAR_DASH:
						gl.game.setDash(buf);
					break;
					case A.MSG_CHAR_PASS_START:
					case A.MSG_CHAR_VOLLEY_START:
						gl.game.setPass(buf, type);
					break;
					case A.MSG_BALL:
						var prevBallId = gl.game.ball.charId;
						gl.game.ball.fromBuf(buf);
						if(prevBallId !== gl.game.ball.charId && prevBallId !== -1) {
							gl.game.chars[prevBallId].passStart = 0;
						}
					break;
					case MSG_GET_ALL_CHAR:
						gl.game.setAllChars(buf);
					break;
					case MSG_PLAYER_DATA:
						gl.player.fromBuf(buf);
					break;
					case A.MSG_DEBUG_POS:
						canvas.debugPos.x = decompX(buf.getChar());
						canvas.debugPos.y = decompY(buf.getChar());
					break;
					default:
						buf.pos = buf.limit;
						console.log("Unknown message " + type);
						break;
				}
			}
		}
		else if(msg.data instanceof Blob) { 
			console.log("bytes");
		  //processBlob(msg.data);
			reader.readAsArrayBuffer();
			
	    } else {
			console.log("text");
		  //processText(msg.data);
	    }
	};
		
}
init();


var lastMovement = Movement.NONE;
function updateLoop() {
	if(!gl.game.started) return;

	
	var el = Date.now()-gl.game.startTime;
	if(el < 0.0) return;

	var step = el*TICK_MS_INV;
	log("step", step);

	gl.game.gameStep = toInt(step);

	//find out current time
	

	//send input

	if(chan !== null && chan.readyState == 1) {
		var buf = _tmp();

		if(canvas.doPass !== 0) {
			buf.putByte(canvas.doPass);
			canvas.doPass = 0;
		}

		if(canvas.endPass !== 0) {
			buf.putByte(canvas.endPass);
			buf.putChar(gl.game.gameStep);
			buf.putChar(compA(canvas.passA));
			canvas.endPass = 0;
		}

		if(lastMovement.id !== canvas.movement.id) {
			lastMovement = canvas.movement;
			Movement.toBuf(lastMovement, buf);
		}

		if(canvas.dash) {
			canvas.dash = false;
			buf.putByte(A.MSG_CLIENT_DASH);
		}

		if(canvas.doTackle) {
			canvas.doTackle = false;
			Movement.toBufTackle(canvas.tackleA, buf);
		}

		if(buf.pos > 0) {
			var data = buf.flip();
			chan.send(data);
		}
	}
	
	canvas.testUpdate(step);
}
var loop = null;
function startLoop() {
	if(loop !== null) return;
	loop = setInterval(updateLoop, 50);
}
function pauseLoop() {
	if(loop === null) return;
	clearInterval(loop);
	loop = null;
}

function ball() {
	gl.game.ball.xy.set2(250,200);
	gl.game.ball.dxy.zero();
}


startLoop();



