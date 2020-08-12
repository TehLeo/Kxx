//const http = require('http');
//const net = require('net');

const lib = require('./client/lib/lib');
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
			testGame.chars.push(ch);
		}
		testGame.started = true;
		this.games.push(testGame);
	}
}

const gl = new Global();
const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: 5000 });

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
	p.charId = 2;
	p.chan.send(p.game.getAllChars(lib._tmp()).flip());

	p.chan.send(p.toBuf(lib._tmp()).flip());
	
  	ws.on("message", data => {
		//...
		console.log('message ' + data + "  " + ws.player.id);

		if(data instanceof ArrayBuffer) { 
			var buf = wrap(data);
			console.log("char data " + buf.dataU8);
			
			if(buf.limit > 0) {
				var type = buf.getByte();
				switch(type) {
					case lib.MSG_CLIENT_MOVEMENT:
						var movement = Movement.fromBuf(buf);

						//find which chara this player controls
						if(p.game != null && p.charId > 0) {
							var ch = p.game.chars[p.charId];
							if(ch.movementId !== movement.id) {
								ch.dxy.set2(movement.dx, movement.dy);
								ch.movementId = movement.id;
								ch.movUpdateNeeded = true;

								console.log("char id " + ch.dxy.x + " " + ch.dxy.y );						
								console.log("mov data " + movement.dx + " " + movement.dy);
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
	var el = 0.1; 
	var gs = gl.games;
	for(var i = 0; i < gs.length; i++) {
		var g = gs[i];
		var chars = g.chars;
		var buf = lib._tmp();
		for(var k = 0; k < chars.length; k++) {
			var chara = chars[k];
			
			var VAR_RUN_SPEED = 50;
			var VAR_TCK_SPEED = 200;

			var spd = VAR_RUN_SPEED;
			var ballSpd = 300;

			var p0 = chara;
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

			if(chara.movUpdateNeeded) {
				chara.movUpdateNeeded = false;
				g.getChar(buf, k);
			}
		}

		/*var ball = gl.game.ball;
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
			console.log("sending " + data);
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
