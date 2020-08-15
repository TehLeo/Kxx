//const http = require('http');
//const net = require('net');

const lib = require('./client/lib/lib');
const A = lib.A;
const vec2 = lib.vec2;
const Char = lib.Char;
const Ball = lib.Ball;
const Game = lib.Game;
const Player = lib.Player;
const Buf = lib.Buf;
const Movement = lib.Movement;

const RECT_L = lib.RECT_L;
const RECT_R = lib.RECT_R;
const RECT_T = lib.RECT_T;
const RECT_B = lib.RECT_B;

const wrap = lib.wrap;

class Global {
	constructor() {
		this.games = [];
		this.players = [];

		var testGame = new Game();
		for(var i = 0; i < 8; i++) {
			var ch = testGame.chars[i];
			ch.xy.x = 25.0+i*100.0-(i>>2)*200.0;
			ch.xy.y = 400.0 - (i>>2)*300;
		}
		testGame.startTime = Date.now();
		testGame.started = true;
		this.games.push(testGame);
	}
}



const express = require('express');
const PORT = process.env.PORT || 3000;
const INDEX = 'index.html';

const server = express()
  //.use((req, res) => res.sendFile(INDEX, { root: __dirname+"/client/" }))
  .use('/client', express.static(__dirname + '/client'))
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

const gl = new Global();
const WebSocket = require("ws");
//const wss = new WebSocket.Server({ port: 5000 });
const wss = new WebSocket.Server({ server });

var playerIndex = 0;

wss.on("connection", ws => {
	var id = playerIndex++;
	var p = new Player(ws, id, "player"+id);
	ws.binaryType = 'arraybuffer';
	gl.players.push(p);
	ws.player = p;
  	console.log('connected ' + id + " " + p.username);
  	//ws.send(Date.now());
	
	p.game = gl.games[0];
	p.game.playersA.push(p);
	p.charId = Math.min(id%8, 7);

	p.chan.send(p.game.getGameTime(lib._tmp()).flip());

	p.chan.send(p.game.getAllChars(lib._tmp()).flip());

	p.chan.send(p.game.ball.toBuf(lib._tmp()).flip());

	p.chan.send(p.toBuf(lib._tmp()).flip());



	
  	ws.on("message", data => {
		//...
		//console.log('message ' + data + "  " + ws.player.id);

		if(data instanceof ArrayBuffer) { 
			var buf = wrap(data);
			//console.log("char data " + buf.dataU8);
			
			while(buf.pos < buf.limit) {
				var type = buf.getByte();
				switch(type) {
					case lib.MSG_CLIENT_MOVEMENT:
						var movement = Movement.fromBuf(buf);

						//find which chara this player controls
						if(p.game != null && p.charId >= 0) {
							var ch = p.game.chars[p.charId];
							if(ch.canMove() && ch.movementId !== movement.id) {
								ch.dxy.set2(movement.dx, movement.dy);
								ch.setMovementId(movement.id);
								ch.movUpdateNeeded = true;
							}
						}
					break;
					case A.MSG_CLIENT_DASH:
						if(p.game != null && p.charId >= 0) {
							var ch = p.game.chars[p.charId];
							if(ch.canDash()) {
								if(ch.movementId === Movement.NONE.id) {
									ch.setMovementId(Movement.UP.id);
									//ch.movementId = Movement.DOWN.id;
								}
								var movement = Movement.fromId(ch.movementId);
								ch.dxy.set2(movement.dx, movement.dy);
								ch.dash = ch.game.gameStep + A.DASH_STEPS;
								ch.dashDelay = ch.dash + A.DASH_DELAY_STEPS;
								ch.dashFlag = true;
								ch.dashUpdateNeeded = true;
							}
						}
					break;
					case A.MSG_CLIENT_PASS_START:
					case A.MSG_CLIENT_VOLLEY_START:
						if(p.game != null && p.charId >= 0) {
							var ch = p.game.chars[p.charId];
							if(p.game.ball.charId === p.charId && ch.canPass()) {
								ch.passStart = type;
								ch.passStep = ch.game.gameStep;
								ch.passUpdateNeeded = true;
							}
						}
					break;
					case A.MSG_CLIENT_PASS_END:
					case A.MSG_CLIENT_VOLLEY_END:
						var passEndStep = buf.getChar();
						var passA = lib.decompA(buf.getChar());
						if(p.game != null && p.charId >= 0) {
							var ch = p.game.chars[p.charId];
							console.log(" pass " + (p.game.ball.charId === p.charId) + " " + (ch.passStart === type-1));
							if(p.game.ball.charId === p.charId && ch.passStart === type-1) {
								ch.passEndStep = Math.max(ch.passStep, Math.min(passEndStep, ch.game.gameStep));
								ch.passA = passA;
								ch.passEndUpdateNeeded = true;
							}
						}
					break;
					case lib.MSG_CLIENT_TACKLE:
						var tackleA = Movement.fromBufTackle(buf);
						if(p.game != null && p.charId >= 0) {
							var ch = p.game.chars[p.charId];
							//if can tackle
							if(ch.canTackle() && p.charId !== p.game.ball.charId) {
								ch.tackle = ch.game.gameStep+lib.TCK_STEPS;
								ch.delay = ch.game.gameStep+A.TCK_DELAY_STEPS;
								ch.dxy.set2(Math.sin(tackleA), Math.cos(tackleA));
								ch.tackleFlag = true;
								ch.tckUpdateNeeded = true;
								ch.tckUpdateA = tackleA;
							}
						}
					break;
				}
			}
		}

  	});

	ws.on('close', function() {
 	 console.log('disconnected');
	});

});

function updateLoop() {
	//var el = 0.1; 
	var el = lib.TICK_MS*0.001;
	var gs = gl.games;
	for(var i = 0; i < gs.length; i++) {
		var g = gs[i];
		if(!g.started) continue;
		var ball = g.ball;

		var elTotal = Date.now()-g.startTime;
		//if(el < 0.0)
		var step = elTotal*lib.TICK_MS_INV; 
		g.lastGameStep = g.gameStep;
		g.gameStep = lib.toInt(step); // could also round

		var chars = g.chars;
		var buf = lib._tmp();

		var testStep = chars[0].gameStep;
		for(var k = 1; k < chars.length; k++) {
			var chara = chars[k];
			if(testStep !== chara.gameStep) {
				throw "not equal step " + testStep + " !== " + chara.gameStep;
			}
		}

		var VAR_RUN_SPEED = 50;
		var VAR_TCK_SPEED = 200;

		var spd = VAR_RUN_SPEED;
		var ballSpd = A.BALL_SPD;

		//var charaStepEl = g.gameStep-chara.gameStep;

		var charaStepEl = g.gameStep - chars[0].gameStep;

		for(var s = 0; s < charaStepEl; s++) {

			if(!ball.isFree()) {
				var p0 = chars[ball.charId];
				if(p0.passEndUpdateNeeded && p0.passEndStep <= p0.gameStep) {s
					p0.passEndUpdateNeeded = false;
					p0.ballDelay = p0.gameStep+A.BALL_DELAY_STEPS;
					ball.pickDelay = p0.gameStep+A.BALL_PICK_DELAY_STEPS;
					ball.updateNeeded = true;
					ball.charId = -1;
					ball.xy.set(p0.xy);
					ball.dxy.set2(Math.sin(p0.passA), Math.cos(p0.passA));
					p0.passStart = 0;
					p0.movUpdateNeeded = true;
				}
			}

			for(var k = 0; k < chars.length; k++) {
				var p0 = chars[k];
				if(p0.isTackling()) {
					spd = VAR_TCK_SPEED;
					p0.xy.x += p0.dxy.x*spd*el;
					p0.xy.y += p0.dxy.y*spd*el;
					p0.clampXY();
				}
				else if(p0.isDashing()) {
					spd = A.DASH_SPD;
					p0.xy.x += p0.dxy.x*spd*el;
					p0.xy.y += p0.dxy.y*spd*el;
					p0.clampXY();
				}
				else if(p0.isPassing()) {
					spd = A.PLAYER_PASS_SPD;
					p0.xy.x += p0.dxy.x*spd*el;
					p0.xy.y += p0.dxy.y*spd*el;
					p0.clampXY();
				}
				else {
					if(p0.dashFlag) {
						p0.dashFlag = false;
						var movement = Movement.fromId(p0.movementId);
						p0.dxy.set2(movement.dx, movement.dy);
						p0.movUpdateNeeded = true;
					}
					if(p0.tackleFlag) {		
						p0.tackleFlag = false;
						if(p0.movementId !== Movement.TACKLED.id) {
							p0.setMovementId(Movement.NONE.id);
						}
						p0.dxy.set2(0.0, 0.0);
						p0.movUpdateNeeded = true;
					}
					else if(p0.movementId !== Movement.NONE.id && p0.canMove()) {
						var el = charaStepEl*lib.TICK_MS*0.001;
						p0.xy.x += p0.dxy.x*spd*el;
						p0.xy.y += p0.dxy.y*spd*el;
						p0.clampXY();
					}
				}
			}

			//check ball
			if(ball.isFree()) {
				if(ball.dxy.x != 0.0 || ball.dxy.y != 0.0) { 
					ball.xy.x += ball.dxy.x*ballSpd*el;
					ball.xy.y += ball.dxy.y*ballSpd*el;

					//ball bounds
					if(ball.xy.x <= RECT_L) {
						ball.dxy.x = -ball.dxy.x;		
						ball.xy.x = RECT_L + (RECT_L-ball.xy.x);
						ball.updateNeeded = true;
					}
					else if(ball.xy.x >= RECT_R) {
						ball.dxy.x = -ball.dxy.x;		
						ball.xy.x = RECT_R - (ball.xy.x-RECT_R);
						ball.updateNeeded = true;
					}

					if(ball.xy.y <= RECT_T) {
						ball.dxy.y = -ball.dxy.y;		
						ball.xy.y = RECT_T + (RECT_T-ball.xy.y);
						ball.updateNeeded = true;
					}
					else if(ball.xy.y >= RECT_B) {
						ball.dxy.y = -ball.dxy.y;		
						ball.xy.y = RECT_B - (ball.xy.y-RECT_B);
						ball.updateNeeded = true;
					}
				}

				var minDist = 10000.0;
				var minK = -1;
				for(var k = 0; k < chars.length; k++) {
					var p0 = chars[k];
					if(p0.canBall()) {
						var distSq = ball.xy.distSq(p0.xy);
						if(distSq < minDist) {
							minDist = distSq;
							minK = k;
						}
					}
				}
				if(minK !== -1 && minDist < A.BALL_PICK_DIST_SQ) {
					var p0 = chars[minK];
					if(p0.isTackling()) {
						var tackleBallSpeed = 2;

						ball.dxy.x = tackleBallSpeed*(Math.sin(p0.tckUpdateA));
						ball.dxy.y = tackleBallSpeed*(Math.cos(p0.tckUpdateA));
						p0.ballDelay = p0.game.gameStep+A.BALL_DELAY_STEPS;
						ball.updateNeeded = true;
						/*var len = Math.sqrt(minDist);
						if(len < 1.0) {
							ball.dxy.x = 0.0;
							ball.dxy.y = -1.0;
							p0.ballDelay = p0.game.gameStep+A.BALL_DELAY_STEPS;
							ball.updateNeeded = true;
						}
						else {
							len = 1.0/len;
							p0.ballDelay = p0.game.gameStep+A.BALL_DELAY_STEPS;
							ball.dxy.x = len*(ball.xy.x-p0.xy.x);
							ball.dxy.y = len*(ball.xy.y-p0.xy.y);
							//ball.dxy.x = len*(this.mXY.x-p0.xy.x);
							//ball.dxy.y = len*(this.mXY.y-p0.xy.y);
							ball.updateNeeded = true;
						}*/
					}	
					else {
						if(ball.isPickable()) {
							console.log("BALL PICKED " + minK);
							ball.charId = minK;
							ball.updateNeeded = true;
						}
					}
				}

				
			}


			//check tackling
			for(var k = 0; k < chars.length; k++) {
				var p0 = chars[k];
				if(p0.isTackling()) {
					//anyone to tackle?
					for(var k2 = 0; k2 < chars.length; k2++) {
						if(k === k2) continue;
						var p2 = chars[k2];
						//order specific code... could be refactored 
						//to check 
						if(p0.xy.distSq(p2.xy) <= A.TCK_DIST_SQ) {
							p2.setMovementId(Movement.TACKLED.id);
							p2.dxy.set2(0.0, 0.0);
							p2.delay = p2.game.gameStep+A.TACKLED_DELAY_STEPS;
							p2.movUpdateNeeded = true;
							if(ball.charId === k2) {
								p2.passStart = 0;
								ball.charId = k;
								p0.delay = Math.min(p0.delay, p0.gameStep+A.TCK_GOT_BALL_MAX_DELAY_STEPS);
								ball.updateNeeded = true;
							}
						}
					}
				}
			}
	
			//if(p0.tackle > 0) {
			//	p0.tackle = p0.tackle-el;
			//	if(p0.tackle <= 0.0) {
			//		p0.tackle = 0.0;
			//		p0.dxy.x = this.movement.dx;
			//		p0.dxy.y = this.movement.dy;
			//	} 
			//}
			//if(p0.delay > 0) p0.delay = Math.max(0, p0.delay-el);

			ball.gameStep++;
			for(var k = 0; k < chars.length; k++) {
				chars[k].gameStep++;
			}
			
		}

		for(var k = 0; k < chars.length; k++) {
			var chara = chars[k];		

			if(chara.passUpdateNeeded) {
				chara.passUpdateNeeded = false;
				if(chara.passStart === A.MSG_CHAR_PASS_START || chara.passStart === A.MSG_CHAR_VOLLEY_START) {
					g.getPass(buf, chara.passStart);
				}
			}	

			if(chara.tckUpdateNeeded) {
				chara.movUpdateNeeded = false;
				chara.tckUpdateNeeded = false;
				chara.dashUpdateNeeded = false;
				g.getTck(buf, k, chara.tckUpdateA);
			}
			else if(chara.dashUpdateNeeded) {
				chara.movUpdateNeeded = false;
				chara.dashUpdateNeeded = false;
				g.getDash(buf, k);
			}
			else if(chara.movUpdateNeeded) {
				chara.movUpdateNeeded = false;
				g.getChar(buf, k);
			}
		}

		

		if(ball.updateNeeded) {
			ball.updateNeeded = false;
			ball.toBuf(buf);
		}

		/*
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
		}*/

		if(buf.pos > 0) {
			var data = buf.flip();
			//console.log("sending " + data);
			for(var k = 0; k < g.playersA.length; k++) {
				var chan = g.playersA[k].chan;
				chan.send(data);
			}
			for(var k = 0; k < g.playersB.length; k++) {
				var chan = g.playersB[k].chan;
				chan.send(data);
			}
			for(var k = 0; k < g.spectators.length; k++) {
				var chan = g.spectators[k].chan;
				chan.send(data);
			}
		}
	}

	/*
	var ps = gl.players;
	for(var i = 0; i < ps.length; i++) {
		var p = ps[i];
		if(p.game !== null && p.charId !== -1) {
			var ch = p.game.chars[p.charId];
			var b = lib._tmp();

			b.putByte(A.MSG_DEBUG_POS);

			b.putChar(lib.compX(p.game.ball.xy.x));
			b.putChar(lib.compY(p.game.ball.xy.y));
			//b.putChar(lib.compX(ch.xy.x));
			//b.putChar(lib.compY(ch.xy.y));

			p.chan.send(b.flip());
		}
	}
	*/
	
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
startLoop();

console.log('Node server started');
