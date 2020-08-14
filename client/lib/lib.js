const TICK_MS = 100;
const TICK_MS_INV = 1.0/TICK_MS;

const TCK_STEPS = 10;

const RECT_L = 0;
const RECT_R = 500;
const RECT_T = 0;
const RECT_B = 400;

const MAX_UINT = 65535;

const MSG_GAME_TIME = 7;
const MSG_PLAYER_DATA = 9;
const MSG_GET_ALL_CHAR = 10;
const MSG_CHAR_DATA = 20;
const MSG_CHAR_TCK = 21;

const MSG_CLIENT_MOVEMENT = 70;
const MSG_CLIENT_TACKLE = 71;

const SQRT_2_INV = 0.7071067811865476;

class A { }

A.DASH_STEPS = 10;
A.DASH_DELAY_STEPS = 20;
A.DASH_SPD = 300;
	
A.TCK_DELAY_STEPS = 17;
A.TCK_GOT_BALL_MAX_DELAY_STEPS = 5;
A.TACKLED_DELAY_STEPS = 20;
A.BALL_DELAY_STEPS = 5;

A.PLAYER_RAD = 50;
A.TCK_DIST = A.PLAYER_RAD*0.9;

A.BALL_PICK_DIST = A.PLAYER_RAD;
A.BALL_SPD = 300;
A.BALL_POS_RAD = A.PLAYER_RAD*0.75;
A.BALL_PICK_DELAY_STEPS = 10;

A.PLAYER_PASS_SPD = 10;

A.MSG_CHAR_DASH = 22;
A.MSG_CHAR_PASS_START = 73;
A.MSG_CHAR_VOLLEY_START = 75;
A.MSG_BALL = 30;

A.MSG_CLIENT_DASH = 72;
A.MSG_CLIENT_PASS_START = 73;
A.MSG_CLIENT_PASS_END = 74;
A.MSG_CLIENT_VOLLEY_START = 75;
A.MSG_CLIENT_VOLLEY_END = 76;
A.MSG_DEBUG_POS = 100;


A.TCK_DIST_SQ = A.TCK_DIST*A.TCK_DIST;
A.BALL_PICK_DIST_SQ = A.BALL_PICK_DIST*A.BALL_PICK_DIST;



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
	return clamp((x*0.5/Math.PI)*MAX_UINT, 0, MAX_UINT);
}

function decompX(x) {
	return (x/MAX_UINT)*(RECT_R-RECT_L)+RECT_L;
}
function decompY(x) {
	return (x/MAX_UINT)*(RECT_B-RECT_T)+RECT_T;
}
function decompA(x) {
	return (x/MAX_UINT)*2.0*Math.PI;
}
function atan2PI(y0,x0) {
	var x = Math.atan2(y0,x0);
	return (x < 0 ? 2.0*Math.PI + x : x);
}

var tmp_arrayBuf = new ArrayBuffer(8);
var tmp_arrayBufU8 = new Uint8Array(tmp_arrayBuf);
var tmp_arrayBufU16 = new Uint16Array(tmp_arrayBuf);
var tmp_arrayBufI32 = new Int32Array(tmp_arrayBuf);
var tmp_arrayBufI64 = new BigInt64Array(tmp_arrayBuf);
var tmp_arrayBufF32 = new Float32Array(tmp_arrayBuf);
			
var isBigEndian = false;
function initBuf0() {
	tmp_arrayBufU16[0] = 0xAABB;
	if(tmp_arrayBufU8[0] === 0xAA) {
		isBigEndian = true;
	}
	else if(tmp_arrayBufU8[0] === 0xBB) {
		isBigEndian = false;
	}
	else {
		console.log("end error");
	}	
}
initBuf0();

function toInt(num) {
	tmp_arrayBufI32[0] = num;
	return tmp_arrayBufI32[0];
}

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
	getByte() {
		this.checkSize(this.pos, this.limit);
		return this.dataU8[this.pos++];
	}
	putChar(ch) {
		this.checkSize(ch, 65536);
		this.checkSize(this.pos+1, this.limit);
		tmp_arrayBufU16[0] = ch;
		if(isBigEndian) {
			this.dataU8[this.pos++] = tmp_arrayBufU8[0];
			this.dataU8[this.pos++] = tmp_arrayBufU8[1];
		}
		else {
			this.dataU8[this.pos++] = tmp_arrayBufU8[1];
			this.dataU8[this.pos++] = tmp_arrayBufU8[0];
		}
		return this;
	}
	getChar() {
		this.checkSize(this.pos+1, this.limit);
		if(isBigEndian) {
			tmp_arrayBufU8[0] = this.dataU8[this.pos++];
			tmp_arrayBufU8[1] = this.dataU8[this.pos++];
		}
		else {
			tmp_arrayBufU8[1] = this.dataU8[this.pos++];
			tmp_arrayBufU8[0] = this.dataU8[this.pos++];
		}
		return tmp_arrayBufU16[0];
	}
	putFloat(ch) {
		this.checkSize(this.pos+3, this.limit);
		tmp_arrayBufF32[0] = ch;
		if(isBigEndian) {
			this.dataU8[this.pos++] = tmp_arrayBufU8[0];
			this.dataU8[this.pos++] = tmp_arrayBufU8[1];
			this.dataU8[this.pos++] = tmp_arrayBufU8[2];
			this.dataU8[this.pos++] = tmp_arrayBufU8[3];
		}
		else {
			this.dataU8[this.pos++] = tmp_arrayBufU8[3];
			this.dataU8[this.pos++] = tmp_arrayBufU8[2];
			this.dataU8[this.pos++] = tmp_arrayBufU8[1];
			this.dataU8[this.pos++] = tmp_arrayBufU8[0];
		}
		return this;
	}
	getFloat() {
		this.checkSize(this.pos+3, this.limit);
		if(isBigEndian) {
			tmp_arrayBufU8[0] = this.dataU8[this.pos++];
			tmp_arrayBufU8[1] = this.dataU8[this.pos++];
			tmp_arrayBufU8[2] = this.dataU8[this.pos++];
			tmp_arrayBufU8[3] = this.dataU8[this.pos++];
		}
		else {
			tmp_arrayBufU8[3] = this.dataU8[this.pos++];
			tmp_arrayBufU8[2] = this.dataU8[this.pos++];
			tmp_arrayBufU8[1] = this.dataU8[this.pos++];
			tmp_arrayBufU8[0] = this.dataU8[this.pos++];
		}
		return tmp_arrayBufF32[0];
	}
	putLong(ch) {
		this.checkSize(this.pos+7, this.limit);
		tmp_arrayBufI64[0] = ch;
		if(isBigEndian) {
			this.dataU8[this.pos++] = tmp_arrayBufU8[0];
			this.dataU8[this.pos++] = tmp_arrayBufU8[1];
			this.dataU8[this.pos++] = tmp_arrayBufU8[2];
			this.dataU8[this.pos++] = tmp_arrayBufU8[3];
			this.dataU8[this.pos++] = tmp_arrayBufU8[4];
			this.dataU8[this.pos++] = tmp_arrayBufU8[5];
			this.dataU8[this.pos++] = tmp_arrayBufU8[6];
			this.dataU8[this.pos++] = tmp_arrayBufU8[7];
		}
		else {	
			this.dataU8[this.pos++] = tmp_arrayBufU8[7];
			this.dataU8[this.pos++] = tmp_arrayBufU8[6];
			this.dataU8[this.pos++] = tmp_arrayBufU8[5];
			this.dataU8[this.pos++] = tmp_arrayBufU8[4];
			this.dataU8[this.pos++] = tmp_arrayBufU8[3];
			this.dataU8[this.pos++] = tmp_arrayBufU8[2];
			this.dataU8[this.pos++] = tmp_arrayBufU8[1];
			this.dataU8[this.pos++] = tmp_arrayBufU8[0];
		}
		return this;
	}
	getLong() {
		this.checkSize(this.pos+7, this.limit);
		if(isBigEndian) {
			tmp_arrayBufU8[0] = this.dataU8[this.pos++];
			tmp_arrayBufU8[1] = this.dataU8[this.pos++];
			tmp_arrayBufU8[2] = this.dataU8[this.pos++];
			tmp_arrayBufU8[3] = this.dataU8[this.pos++];
			tmp_arrayBufU8[4] = this.dataU8[this.pos++];
			tmp_arrayBufU8[5] = this.dataU8[this.pos++];
			tmp_arrayBufU8[6] = this.dataU8[this.pos++];
			tmp_arrayBufU8[7] = this.dataU8[this.pos++];
		}
		else {
			tmp_arrayBufU8[7] = this.dataU8[this.pos++];
			tmp_arrayBufU8[6] = this.dataU8[this.pos++];
			tmp_arrayBufU8[5] = this.dataU8[this.pos++];
			tmp_arrayBufU8[4] = this.dataU8[this.pos++];
			tmp_arrayBufU8[3] = this.dataU8[this.pos++];
			tmp_arrayBufU8[2] = this.dataU8[this.pos++];
			tmp_arrayBufU8[1] = this.dataU8[this.pos++];
			tmp_arrayBufU8[0] = this.dataU8[this.pos++];
		}
		return tmp_arrayBufI64[0];
	}
	putString(str) {
		var len = str.length;
		this.checkSize(this.pos+1+len+len, this.limit);
		this.putChar(len);
		for(var i = 0; i < len; i++) {
			this.putChar(str.charCodeAt(i));
		}
		return this;
	}
	getString(str) {
		this.checkSize(this.pos+1, this.limit);
		var len = this.getChar();
		this.checkSize(this.pos-1+len+len, this.limit);
		var res = "";
		for(var i = 0; i < len; i++) {
			res += String.fromCharCode(this.getChar());
		}
		return res;
	}
	putObj(obj) {
		this.putString(JSON.stringify(obj));
		return this;
	}
	getObj() {
		var str = this.getString();
		return JSON.parse(str);
	}
}
class vec2 {
	constructor(xx = 0.0, yy = 0.0) {
		this.x = 0.0;
		this.y = 0.0;
	}
	distSq2(xx,yy) {
		var x = this.x-xx;
		var y = this.y-yy;
		return x*x+y*y;
	}
	dist2(xx,yy) {
		return Math.sqrt(this.distSq2(xx,yy));
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
	UP_LEFT:   	  	{id:10, dx:-SQRT_2_INV,  dy:-SQRT_2_INV},
	UP_RIGHT:     	{id:18, dx: SQRT_2_INV,  dy:-SQRT_2_INV},
	DOWN:   		{id:4,  dx: 0.0,  dy: 1.0},
	DOWN_LEFT:   	{id:12, dx:-SQRT_2_INV,  dy: SQRT_2_INV},
	DOWN_RIGHT:   	{id:20, dx: SQRT_2_INV,  dy: SQRT_2_INV},
	LEFT:   		{id:8,  dx:-1.0,  dy: 0.0},
	RIGHT:  		{id:16, dx: 1.0,  dy: 0.0},

	TACKLED:   		{id:32,  dx: 0.0,  dy: 0.0},
	
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
			case 32: return Movement.TACKLED;
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
	},
	toBufTackle: function(a, buf) {
		buf.putByte(MSG_CLIENT_TACKLE);
		buf.putChar(compA(a));
		return buf;
	},
	fromBufTackle: function(buf) {
		return decompA(buf.getChar());
	} 
};	

class Char {
	constructor(game, x, y) {
		this.game = game;
		this.xyI = new vec2(x,y);
		this.xy0 = new vec2(x,y);
		this.xy = new vec2(x,y);
		this.dxy = new vec2(0,0);
		this.gameStep = 0;
		this.lastGameStep = 0;
		this.movementId = Movement.NONE.id;
		this.lookAtDir = Movement.UP.id;
		this.ballDelay = 0;
		this.dash = 0;
		this.dashDelay = 0;
		this.dashFlag = false;
		this.delay = 0;
		this.tackle = 0;
		this.tackleFlag = false;
		this.dashUpdateNeeded = false;
		this.movUpdateNeeded = false;
		this.passUpdateNeeded = false;
		this.passEndUpdateNeeded = false;
		this.tckUpdateNeeded = false;
		this.tckUpdateA = 0;
		this.passStart = 0;
		this.passStep = 0;
		this.passEndStep = 0;
		this.passA = 0;
	}
	angle() { return 0.0; }
	canBall() {  return this.ballDelay < this.game.gameStep; }
	canPass() { return this.delay < this.game.gameStep && !this.isDashing() && !this.isPassing(); }
	canDash() { return this.delay < this.game.gameStep && this.dashDelay < this.game.gameStep && !this.isTackling() && !this.isPassing(); }
	canMove() {  return this.delay < this.game.gameStep || this.isTackling();  }
	canTackle() { return this.delay < this.game.gameStep && this.tackle < this.game.gameStep && !this.isPassing(); }
	isDashing() { return this.dash > this.game.gameStep; }
	isTackling() { return this.tackle > this.game.gameStep;  }
	isPassing() { return this.passStart !== 0; }
	isPassingA() { return this.passStart === A.MSG_CHAR_PASS_START; }
	isPassingB() { return this.passStart === A.MSG_CHAR_VOLLEY_START; }

	setMovementId(id) {
		this.movementId = id;
		if(this.movementId !== Movement.NONE.id && this.movementId !== Movement.TACKLED.id) {
			this.lookAtDir = id;
		}
	} 

	clampXY() {
		if(this.xy.x < RECT_L) {
			this.xy.x = RECT_L;
		}
		else if(this.xy.x > RECT_R) {
			this.xy.x = RECT_R;
		}

		if(this.xy.y < RECT_T) {
			this.xy.y = RECT_T;
		}
		else if(this.xy.y > RECT_B) {
			this.xy.y = RECT_B;
		}
	}
}
class Ball {
	constructor(game) {
		this.game = game;
		this.xyI = new vec2(0,0);
		this.xy = new vec2(0,0);
		this.dxy = new vec2(0,0);
		this.gameStep = 0;
		this.delay = 0;
		this.pickDelay = 0;
		this.charId = -1;
		this.updateNeeded = false;
	}
	isFree() {
		return this.charId === -1;
	}
	isPickable() {
		return this.isFree() && this.delay < this.game.gameStep && this.pickDelay < this.game.gameStep;
	}
	getX() {
		return this.isFree()?this.xy.x:this.game.chars[this.charId].xy.x;
	}
	getY() {
		return this.isFree()?this.xy.y:this.game.chars[this.charId].xy.y;
	}
	toBuf(b) {
		b.putByte(A.MSG_BALL);
		b.putByte(this.charId+1);
		b.putChar(this.gameStep);
		b.putChar(compX(this.xy.x));
		b.putChar(compY(this.xy.y));
		b.putFloat(this.dxy.x);
		b.putFloat(this.dxy.y);
		return b;
	} 
	fromBuf(b) {
		var prevId = 
		this.charId = b.getByte()-1;
		this.gameStep = b.getChar();
		this.xy.x = decompX(b.getChar());
		this.xy.y = decompY(b.getChar());
		this.dxy.x = b.getFloat();
		this.dxy.y = b.getFloat();
	}
}
class Game {
	constructor() {
		this.timeLimit = 240.0; //4min
		this.gameStep = 0;
		this.startTime = 0;
		this.maxPlayers = 8;
		this.allowSpectators = true;
		this.started = false;
		this.playersA = [];
		this.playersB = [];
		this.spectators = [];
		this.chars = [];
		this.ball = new Ball(this);
		for(var i = 0; i < 8; i++) {
			var ch = new Char(this, 0.0, 0.0);
			this.chars.push(ch);
		}
	}

	getGameTime(b) {
		b.putByte(MSG_GAME_TIME);
		b.putObj(this.startTime);
		return b;
	}

	setGameTime(b) {
		this.startTime = b.getObj();
	}

	getPass(b, id) {
		if(id !== A.MSG_CHAR_PASS_START && id !== A.MSG_CHAR_VOLLEY_START) { 
			throw "Pass type error " + id;
		}
		b.putByte(id);
		b.putChar(this.gameStep);
		return b;
	}
	setPass(b, id) {
		if(id !== A.MSG_CHAR_PASS_START && id !== A.MSG_CHAR_VOLLEY_START) { 
			throw "Pass type error " + id;
		}
		this.passStep = b.getChar();
	}

	getDash(b, id) {
		b.putByte(A.MSG_CHAR_DASH);
		var ch = this.chars[id];
		b.putByte(id);
		b.putByte(ch.movementId);
		b.putChar(this.gameStep);
		b.putChar(compX(ch.xy.x));
		b.putChar(compY(ch.xy.y));
		return b;
	}	
	setDash(b) {
		var id = b.getByte();
		var ch = this.chars[id];
		var movement = Movement.fromBuf(b);
		ch.setMovementId(movement.id);
		ch.dxy.set2(movement.dx, movement.dy);
		ch.gameStep = b.getChar();
		ch.xy.x = decompX(b.getChar());
		ch.xy.y = decompY(b.getChar());
		ch.dash = ch.gameStep+A.DASH_STEPS;
		ch.dashDelay = ch.dash+A.DASH_DELAY_STEPS;
	}	

	getTck(b, id, tackleA) {
		b.putByte(MSG_CHAR_TCK);
		var ch = this.chars[id];
		b.putByte(id);
		b.putByte(ch.movementId);
		b.putChar(this.gameStep);
		b.putChar(compX(ch.xy.x));
		b.putChar(compY(ch.xy.y));
		b.putChar(compA(tackleA));
		return b;
	}	

	setTck(b) {
		var id = b.getByte();
		var ch = this.chars[id];
		var movement = Movement.fromBuf(b);
		ch.setMovementId(movement.id);
		//ch.dxy.set2(movement.dx, movement.dy);
		ch.gameStep = b.getChar();
		ch.xy.x = decompX(b.getChar());
		ch.xy.y = decompY(b.getChar());
		var tackleA = decompA(b.getChar());
		ch.dxy.set2(Math.sin(tackleA), Math.cos(tackleA));
		ch.tackle = ch.gameStep+TCK_STEPS;
		ch.delay = ch.gameStep+A.TCK_DELAY_STEPS;
	}	

	getChar(b, id) {
		b.putByte(MSG_CHAR_DATA);
		var ch = this.chars[id];
		b.putByte(id);
		b.putByte(ch.movementId);
		b.putChar(this.gameStep);
		b.putChar(compX(ch.xy.x));
		b.putChar(compY(ch.xy.y));
		return b;
	}
	setChar(b) {
		var id = b.getByte();
		var ch = this.chars[id];
		var movement = Movement.fromBuf(b);
		ch.setMovementId(movement.id);
		ch.dxy.set2(movement.dx, movement.dy);
		ch.gameStep = b.getChar();
		ch.xy.x = decompX(b.getChar());
		ch.xy.y = decompY(b.getChar());

		//log(4, "STEP " + ch.gameStep + " " +  id + "  mov " + ch.dxy.x + " " + ch.dxy.y);
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
	module.exports.A = A;
	module.exports.vec2 = vec2;
	module.exports.Buf = Buf;

	module.exports.Char = Char;
	module.exports.Ball = Ball;
	module.exports.Game = Game;
	module.exports.Player = Player;
	module.exports.Movement = Movement;

	module.exports.TICK_MS = TICK_MS;
	module.exports.TICK_MS_INV = TICK_MS_INV;
	module.exports.TCK_STEPS = TCK_STEPS;
	module.exports.RECT_L = RECT_L;
	module.exports.RECT_R = RECT_R;
	module.exports.RECT_T = RECT_T;
	module.exports.RECT_B = RECT_B;

	module.exports.toInt = toInt;
	module.exports.compX = compX;
	module.exports.compY = compY;
	module.exports.compA = compA;
	module.exports.decompA = decompA;
	module.exports.allocateBuf = allocateBuf;
	module.exports.wrap = wrap;
	module.exports.MSG_GET_ALL_CHAR = MSG_GET_ALL_CHAR;
	module.exports.MSG_CLIENT_TACKLE = MSG_CLIENT_TACKLE;
	module.exports.MSG_CLIENT_MOVEMENT = MSG_CLIENT_MOVEMENT;
	module.exports._tmp = _tmp;
}

