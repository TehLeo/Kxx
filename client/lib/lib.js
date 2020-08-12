const RECT_L = 0;
const RECT_R = 500;
const RECT_T = 0;
const RECT_B = 400;

const MAX_UINT = 65535;


const MSG_PLAYER_DATA = 9;
const MSG_GET_ALL_CHAR = 10;
const MSG_CHAR_DATA = 20;


const MSG_CLIENT_MOVEMENT = 70;

function clamp(x, min, max) {
  return x <= min ? min : x >= max ? max : x;
}
function compX(x) {
	return clamp(((x-RECT_L)/(RECT_R-RECT_L))*MAX_UINT, 0, MAX_UINT);
}
function compY(x) {
	return clamp(((x-RECT_T)/(RECT_B-RECT_T))*MAX_UINT, 0, MAX_UINT);
}
function compA(x) {
	return clamp((x/Math.PI)*MAX_UINT, 0, MAX_UINT);
}

function decompX(x) {
	return (x/MAX_UINT)*(RECT_R-RECT_L)+RECT_L;
}
function decompY(x) {
	return (x/MAX_UINT)*(RECT_B-RECT_T)+RECT_T;
}
function decompA(x) {
	return (x/MAX_UINT)*Math.PI;
}

var tmp_arrayBuf = new ArrayBuffer(8);
var tmp_arrayBufU8 = new Uint8Array(tmp_arrayBuf);
var tmp_arrayBufU16 = new Uint16Array(tmp_arrayBuf);

function allocateBuf(size) {
	return new Buf(new ArrayBuffer(size));
}
function wrap(arrBuf) {
	return new Buf(arrBuf, arrBuf.byteLength);
}
class Buf {
	constructor(buf, size) {
		this.data = buf;
		this.dataU8 = new Uint8Array(buf);
		this.pos = 0;
		this.limit = size;
		this.capacity = size;
	}
	clear() { this.pos = 0; this.limit = this.capacity; return this; }
	flip() { this.limit = this.pos; this.pos = 0; return this.dataU8.subarray(this.pos,this.limit); }
	rewind() { this.pos = 0; }
	checkSize(x, size) {
		if(x < 0 || x >= size) throw "Out of bounds " + x + " " + " " + size;
	}	
	putByte(b) {
		this.checkSize(b, 256);
		this.checkSize(this.pos, this.limit);
		this.dataU8[this.pos++] = b;
		return this;
	}
	putChar(ch) {
		this.checkSize(ch, 65536);
		this.checkSize(this.pos+1, this.limit);
		tmp_arrayBufU16[0] = ch;
		this.dataU8[this.pos++] = tmp_arrayBufU8[0];
		this.dataU8[this.pos++] = tmp_arrayBufU8[1];
		return this;
	}
	getByte() {
		this.checkSize(this.pos, this.limit);
		return this.dataU8[this.pos++];
	}
	getChar() {
		this.checkSize(this.pos+1, this.limit);
		tmp_arrayBufU8[0] = this.dataU8[this.pos++];
		tmp_arrayBufU8[1] = this.dataU8[this.pos++];
		return tmp_arrayBufU16[0];
	}
}
class vec2 {
	constructor(xx = 0.0, yy = 0.0) {
		this.x = 0.0;
		this.y = 0.0;
	}
	distSq(b) {
		var x = this.x-b.x;
		var y = this.y-b.y;
		return x*x+y*y;
	}
	dist(b) {
		return Math.sqrt(this.distSq(b));
	}
	set(b) {
		this.x = b.x;
		this.y = b.y;
	}
	set2(xx,yy) {
		this.x = xx;
		this.y = yy;
	}
	addLocal(b) {
		this.x = this.x + b.x;
		this.y = this.y + b.y;
	}
	subLocal(b) {
		this.x = this.x - b.x;
		this.y = this.y - b.y;
	}
	mulLocal(b) {
		this.x = this.x * b.x;
		this.y = this.y * b.y;
	}
	zero() { this.x = 0.0; this.y = 0.0; return this; }
	isZero() { return this.x == 0.0 && this.y == 0.0;}
}

var Movement = {
	NONE:   		{id:0,  dx: 0.0,  dy: 0.0},
	UP:    		 	{id:2,  dx: 0.0,  dy:-1.0},
	UP_LEFT:   	  	{id:10, dx:-1.0,  dy:-1.0},
	UP_RIGHT:     	{id:18, dx: 1.0,  dy:-1.0},
	DOWN:   		{id:4,  dx: 0.0,  dy: 1.0},
	DOWN_LEFT:   	{id:12, dx:-1.0,  dy: 1.0},
	DOWN_RIGHT:   	{id:20, dx: 1.0,  dy: 1.0},
	LEFT:   		{id:8,  dx:-1.0,  dy: 0.0},
	RIGHT:  		{id:16, dx: 1.0,  dy: 0.0},
	
	MASK_X: 24,
	MASK_Y: 6,
	fromId: function(id) {
		switch(id) {
			case 0: return Movement.NONE;
			case 2: return Movement.UP;
			case 10: return Movement.UP_LEFT;
			case 18: return Movement.UP_RIGHT;
			case 4: return Movement.DOWN;
			case 12: return Movement.DOWN_LEFT;
			case 20: return Movement.DOWN_RIGHT;
			case 8: return Movement.LEFT;
			case 16: return Movement.RIGHT;
		}
		err("should not happen Movement.fromId(" + id + ")");
		return Movement.NONE;	
	}, 
	toBuf: function(m, buf) {
		buf.putByte(MSG_CLIENT_MOVEMENT);
		buf.putByte(m.id);
		return buf;
	},
	fromBuf: function(buf) {
		return Movement.fromId(buf.getByte());
	} 
};	

class Char {
	constructor(x, y) {
		this.xy0 = new vec2(x,y);
		this.xy = new vec2(x,y);
		this.dxy = new vec2(0,0);
		this.movementId = Movement.NONE.id;
		this.delay = 0;
		this.tackle = 0;
		this.movUpdateNeeded = false;
	}
	angle() { return 0.0; }
	canMove() { return this.delay == 0 || this.isTackling(); }
	canTackle() { return this.delay == 0 && this.tackle == 0; }
	isTackling() { return this.tackle != 0; }
}
class Ball {
	constructor(args) {
		this.xy = new vec2(0,0);
		this.dxy = new vec2(0,0);
		this.delay = 0;
		this.player = -1;
	}
	isFree() {
		return this.player === -1;
	}
	getX() {
		return this.isFree()?this.xy.x:gl.game.players[this.player].xy.x;
	}
	getY() {
		return this.isFree()?this.xy.y:gl.game.players[this.player].xy.y;
	}
}
class Game {
	constructor() {
		this.timeLimit = 240.0; //4min
		this.gameTick = 0;
		this.maxPlayers = 8;
		this.allowSpectators = true;
		this.started = false;
		this.playersA = [];
		this.playersB = [];
		this.spectators = [];
		this.chars = [];
		this.ball = new Ball();
		for(var i = 0; i < 8; i++) {
			var ch = new Char(0.0, 0.0);
			this.chars.push(ch);
		}
	}
	
	getChar(b, id) {
		b.putByte(MSG_CHAR_DATA);
		var ch = this.chars[id];
		b.putByte(id);
		b.putByte(ch.movementId);
		b.putChar(compX(ch.xy.x));
		b.putChar(compY(ch.xy.y));
		return b;
	}
	setChar(b) {
		var ch = this.chars[b.getByte()];
		var movement = Movement.fromBuf(b);
		ch.movementId = movement.id;
		ch.dxy.set2(movement.dx, movement.dy);
		ch.xy.x = decompX(b.getChar());
		ch.xy.y = decompY(b.getChar());
	} 

	getAllChars(b) {
		b.putByte(MSG_GET_ALL_CHAR);
		for(var i = 0; i < this.chars.length; i++) {
			var ch = this.chars[i];
			b.putChar(compX(ch.xy.x));
			b.putChar(compY(ch.xy.y));
			b.putChar(compA(ch.angle()));
		}
		return b;
	}
	setAllChars(b) {
		for(var i = 0; i < this.chars.length; i++) {
			var ch = this.chars[i];
			ch.xy.x = decompX(b.getChar());
			ch.xy.y = decompY(b.getChar());
			var angle = decompA(b.getChar());
			//...
		}
	}
}
class Player {
	constructor(chan0, id0, username0) {
		this.chan = chan0;
		this.id = id0; //server id, from 0 to max players
		this.username = username0;
		this.game = null;
		this.charId = -1;
		this.spectating = false;
	}
	toBuf(buf) {
		buf.putByte(MSG_PLAYER_DATA);
		buf.putByte(this.charId);
		buf.putChar(this.id);
		return buf;
	}
	fromBuf(buf) {
		this.charId = buf.getByte();
		this.id = buf.getChar();
	} 
}

var _tmp0 = allocateBuf(1024);
function _tmp() {
	return _tmp0.clear();
}

if (typeof module !== 'undefined') {
	module.exports.vec2 = vec2;
	module.exports.Buf = Buf;


	module.exports.Char = Char;
	module.exports.Ball = Ball;
	module.exports.Game = Game;
	module.exports.Player = Player;
	module.exports.Movement = Movement;

	module.exports.RECT_L = RECT_L;
	module.exports.RECT_R = RECT_R;
	module.exports.RECT_T = RECT_T;
	module.exports.RECT_B = RECT_B;

	module.exports.compX = compX;
	module.exports.compY = compY;
	module.exports.compA = compA;
	module.exports.allocateBuf = allocateBuf;
	module.exports.wrap = wrap;
	module.exports.MSG_GET_ALL_CHAR = MSG_GET_ALL_CHAR;
	module.exports.MSG_CLIENT_MOVEMENT = MSG_CLIENT_MOVEMENT;
	module.exports._tmp = _tmp;
}

