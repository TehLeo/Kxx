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

var KeyInput = {
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
}

var gl = new GlobalData();

class Canvas {
	constructor(args) {
 		this.canvas = document.getElementById('mainCanvas');
		this.keyMap = {
			UP: false,
			DOWN: false,
			LEFT: false,
			RIGHT: false
		};
		this.movement = Movement.NONE;
		this.g = this.canvas.getContext('2d');
		this.mXY = new vec2(0,0);

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
		var p0 = null; //gl.game.getPlayer();
		if(p0 === null) return;
		var ball = gl.game.ball;
		switch (e.button) {
			case 0: //LEFT CLICK
				if(gl.game.hasBall()) {
					//dist();
					var len = p0.xy.dist(this.mXY);
					if(len >= 1.0) {
						len = 1.0/len;
						//Shoot
						ball.delay = 0.5;
						ball.dxy.x = len*(this.mXY.x-p0.xy.x);
						ball.dxy.y = len*(this.mXY.y-p0.xy.y);
					
						ball.xy.set(p0.xy);
						ball.player = -1;
					}
				}
				else {
					//Tackle
					if(p0.canTackle()) {
						var len = p0.xy.dist(this.mXY);
						if(len >= 1.0) {
							len = 1.0/len;
						
							p0.tackle = 1.0;
							p0.delay = 1.5;
							p0.dxy.x = len*(this.mXY.x-p0.xy.x);
							p0.dxy.y = len*(this.mXY.y-p0.xy.y);
						}	
					}
				}
				break;
			case 2: //RIGHT CLICK
				
				break;
		}
	}
	mouseUp(e) {
		log(2, "move " + JSON.stringify(e) + " " + e.button + " " + e.clientX + " " + e.clientY)
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
	testUpdate() {
		var player = gl.player;
		if(player === null) return;

		var el = 0.1; 

		log(1, JSON.stringify(this.movement) );

		var chars = gl.game.chars;
		var ball = gl.game.ball;

		for(var k = 0; k < chars.length; k++) {
		
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

		}
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
		if(p0 !== null) this.line(this.mXY.x, this.mXY.y, p0.xy.x, p0.xy.y);

		this.color("#000000");
		
		//chars
		for(var i = 0; i < chars.length; i++) {
		  	var p = chars[i];
			if(player.charId == i) {
				this.color("#eaae62");
			}
			else {
				this.color("#000000");
			}
			this.circle(p.xy.x,p.xy.y,50);
		}

		this.color("#000000");
		
		//ball
		this.circle(ball.getX(),ball.getY(),10);
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
	var chan0 = new WebSocket("ws://" + "127.0.0.1" + ":" + 5000);
	chan0.binaryType = "arraybuffer";

	gl.player = new Player(chan0, -1, "unknown");
	chan0.onopen = function() {
		chan = chan0;
    };	
	chan0.onmessage = function(msg) {
  		console.log(msg);
		if(msg.data instanceof ArrayBuffer) { 
			var buf = wrap(msg.data);
			console.log("char data " + buf.dataU8);
			
			while(buf.pos < buf.limit) {
				var type = buf.getByte();
				switch(type) {
					case MSG_CHAR_DATA:
						gl.game.setChar(buf);
					break;
					case MSG_GET_ALL_CHAR:
						gl.game.setAllChars(buf);
					break;
					case MSG_PLAYER_DATA:
						gl.player.fromBuf(buf);
					break;
					default:
						buf.pos = buf.limit;
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
	//send input

	if(chan !== null && chan.readyState == 1) {
		if(lastMovement.id !== canvas.movement.id) {
			lastMovement = canvas.movement;
	
			chan.send(Movement.toBuf(lastMovement, _tmp()).flip());
		}
	}
	
	canvas.testUpdate();
}
var loop = null;
function startLoop() {
	if(loop !== null) return;
	loop = setInterval(updateLoop, 100);
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



