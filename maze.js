(function(f){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',f);else f();})(function () {
'use strict';

/*** Constants ***/

var DECAY_RATE = 0.625;
var RANGE = 7;
var VIEW_DISTANCE = 0.75;
var CEILING_HEIGHT = 0.4;
var FLOOR_HEIGHT = -0.6;
var FLOOR_BRIGHTNESS = 0.5;
var CEILING_BRIGHTNESS = 2;
var WALL_BORDER_COLOUR = '#000000';
var WALL_BORDER_WIDTH = '0.005';

/*** Screen Dimensions ***/

var ASPECT_RATIO = 4 / 3;
var screen = new Object;
screen.half = new Object;

function update_dimensions() {
	var w = window.innerWidth;
	var h = window.innerHeight;
	var ah = Math.round(w / ASPECT_RATIO);
	var aw = Math.round(h * ASPECT_RATIO);
	screen.width = Math.min(w, aw);
	screen.height = Math.min(h, ah);
	screen.half.width = Math.floor(screen.width / 2);
	screen.half.height = Math.floor(screen.height / 2);
	document.documentElement.setAttribute('width', screen.width);
	document.documentElement.setAttribute('height', screen.height);
}

update_dimensions();
window.addEventListener('resize', update_dimensions);

/*** Map ***/

var COLOURS = [
	[0xBF, 0x00, 0x00], [0x7F, 0x3F, 0x00], [0x3F, 0x7F, 0x00],
	[0x00, 0xBF, 0x00], [0x00, 0x7F, 0x3F], [0x00, 0x3F, 0x7F],
	[0x00, 0x00, 0xBF], [0x3F, 0x00, 0x7F], [0x7F, 0x00, 0x3F]
];

function Tile(t, c) {
	this.type = t;
	this.colour = c;
	return this;
}

Tile.WALL = 0;
Tile.EMPTY = 1;
Tile.EXIT = 2;
Tile.CONSTRUCTION = 9;

Tile.prototype.is_wall = function is_wall() {
	return Object.is(this.type, Tile.WALL);
};

function Maze() {
	function X(c) {return new Tile(Tile.WALL, COLOURS[c]);}
	function O(c) {return new Tile(Tile.EMPTY, COLOURS[c]);}
	function S(c) {return new Tile(Tile.EXIT, COLOURS[c]);}
	this.size = 5;
	this.start = [2, 2];
	this.tiles = [
		[X(0), X(1), X(2), X(0), X(1)],
		[X(3), O(4), O(5), O(3), X(4)],
		[X(6), O(7), O(8), S(6), X(7)],
		[X(0), O(1), O(2), O(0), X(1)],
		[X(3), X(4), X(5), X(3), X(4)]
	];
	return this;
}

Maze.prototype.tile = function tile(position) {
	return this.tiles[position[1]][position[0]];
}

Maze.NEIGHBOURS = [[0, 1], [1, 0], [0, -1], [-1, 0]];
Maze.THROUGH_RATE = 0.25;

Maze.prototype.generate = function generate(size) {
	var m, s, e, ee;

	function allocate() {
		m = new Array(size);
		for (var i=0; i<size; ++i) {
			m[i] = new Array(size);
			for (var j=0; j<size; ++j) {
				m[i][j] = Tile.WALL;
			}
		}
		s = new Array;
	}

	function grow() {
		function available(from, to) {
			if (to[0] <= 0 || to[0] >= size-1) return false;
			if (to[1] <= 0 || to[1] >= size-1) return false;
			if (m[to[0]][to[1]] !== Tile.WALL) return false;
			return Maze.NEIGHBOURS.every(
				function (neighbour) {
					var x = to[0] + neighbour[0];
					var y = to[1] + neighbour[1];
					return x === from[0] && y === from[1]
						|| Object.is(m[x][y], Tile.WALL)
						|| Object.is(m[x][y], Tile.CONSTRUCTION)
							&& Math.random() < Maze.THROUGH_RATE;
				}
			);
		}
		var o = Math.random() < 0.5 ? 0 : s.length-1;
		var p = s[o];
		var a =
			Maze.NEIGHBOURS
				.map(function (n) {return [p[0]+n[0], p[1]+n[1]];})
				.filter(function (n) {return available(p, n);});
		if (a.length <= 1) {
			m[p[0]][p[1]] = Tile.EMPTY;
			s.splice(o, 1);
			var x = p[0] - this.start[0];
			var y = p[1] - this.start[1];
			//	var pp = Math.abs(x) + Math.abs(y);
			var pp = Math.sqrt(x*x + y*y);
			if (Math.random() * (pp + ee) < pp) {
				e = p;
				ee = pp;
			}
		}
		if (a.length > 0) {
			var t = a[Math.floor(Math.random() * a.length)];
			s.push(t);
			m[t[0]][t[1]] = Tile.CONSTRUCTION;
		}
	}

	function build() {
		this.tiles = new Array(size);
		for (var i=0; i<size; ++i) {
			this.tiles[i] = new Array(size);
			for (var j=0; j<size; ++j) {
				this.tiles[i][j] = new Tile(m[j][i], COLOURS[i%3*3+j%3]);
			}
		}
	}

	this.size = size;
	this.start = [Math.floor(size*0.5), Math.floor(size*0.5)];
	e = this.start;
	ee = 0;
	allocate();
	s.push(this.start);
	m[this.start[0]][this.start[1]] = Tile.CONSTRUCTION;
	while (s.length > 0) grow.call(this);
	m[e[0]][e[1]] = Tile.EXIT;
	//	console.log(
	//		'%s',
	//		m.map(n => n.map(e => ['X','.','O','?'][e]).join('')).join('\n')
	//	);
	return build.call(this);
}

/*** Player ***/

function Player(maze) {
	this.maze = maze;
	this.position = maze.start;
	this.facing = 1;
	return this;
}

Player.prototype.tile = function () {
	return this.maze.tile(this.position);
};

Player.prototype.relative_position = function relative_position(pos) {
	switch (this.facing) {
		case 0: return [this.position[0]+pos[0], this.position[1]-pos[1]];
		case 1: return [this.position[0]+pos[1], this.position[1]+pos[0]];
		case 2: return [this.position[0]-pos[0], this.position[1]+pos[1]];
		case 3: return [this.position[0]-pos[1], this.position[1]-pos[0]];
	}
}

Player.prototype.relative_tile = function relative_tile(pos) {
	return this.maze.tile(this.relative_position(pos));
};

Player.prototype.step = function step(pos) {
	var p = this.relative_position(pos);
	if (this.maze.tile(p).is_wall()) {
		return false;
	} else if (Object.is(this.maze.tile(p).type, Tile.EXIT)) {
		this.maze.generate(this.maze.size + 2);
		this.position = this.maze.start;
		return true;
	} else {
		this.position = p;
		return true;
	}
};

Player.prototype.step_forward = function step_forward() {
	return this.step([0, 1]);
};

Player.prototype.step_backward = function step_backward() {
	return this.step([0, -1]);
};

Player.prototype.turn_left = function turn_left() {
	this.facing = (this.facing + 3) % 4;
};

Player.prototype.turn_right = function turn_right() {
	this.facing = (this.facing + 1) % 4;
};

/*** Display ***/

var SVG = 'http://www.w3.org/2000/svg';

function clear_screen() {
	var n = Array.from(document.documentElement.childNodes);
	for (var i=0; i<n.length; ++i) {
		switch (n[i].tagName) {
			case 'title':
			case 'style':
				break;
			default:
				document.documentElement.removeChild(n[i]);
		}
	}
}

function Drawer(player) {
	this.player = player;
	this.reset();
	return this;
}

Drawer.prototype.reset = function reset() {
	this.trace = new Map;
	this.elements = new Array;
};

Drawer.prototype.brighten = function brighten(c, r) {
	if (r > 1)
		return c.map(function (n) {return 255 - Math.round((255 - n) / r);});
	else
		return c.map(function (n) {return Math.round(n * r);});
};

Drawer.prototype.colour_code = function colour_code(c) {
	return '#'
		+ c
			.map(function (n) {return n.toString(16).padStart(2, '0');})
			.join('');
};

Drawer.prototype.vertices_points = function vertices_points(v) {
	return v
		.map(
			function (v) {
				return (v[0]/v[1]).toString() + ',' + (-v[2]/v[1]).toString();
			}
		)
		.join(' ');
};

Drawer.prototype.add_element = function add_element(pos, element) {
	return this.elements.push([Math.abs(pos[0])+Math.abs(pos[1]), element]);
};

Drawer.prototype.draw_plane = function draw_plane(pos, height, colour) {
	var polygon = document.createElementNS(SVG, 'polygon');
	polygon.setAttribute(
		'points',
		this.vertices_points(
			[
				[pos[0]-0.5, pos[1]+VIEW_DISTANCE-0.5, height],
				[pos[0]+0.5, pos[1]+VIEW_DISTANCE-0.5, height],
				[pos[0]+0.5, pos[1]+VIEW_DISTANCE+0.5, height],
				[pos[0]-0.5, pos[1]+VIEW_DISTANCE+0.5, height]
			]
		)
	);
	polygon.setAttribute('fill', this.colour_code(colour));
	return this.add_element(pos, polygon);
};

Drawer.prototype.decay = function decay(pos) {
	return DECAY_RATE**(pos[1]-1);
};

Drawer.prototype.draw_tile = function draw_tile(tile, pos) {
	var d = this.decay(pos);
	this.draw_plane(
		pos,
		FLOOR_HEIGHT,
		this.brighten(tile.colour, FLOOR_BRIGHTNESS*d)
	);
	if (Object.is(tile.type, Tile.EXIT)) {
		var text = document.createElementNS(SVG, 'text');
		var y = pos[1] + VIEW_DISTANCE;
		var ry = 1 / y;
		text.setAttribute('x', (pos[0]-0.5)*ry);
		text.setAttribute('y', 0.1*ry);
		text.setAttribute('font-size', 0.4*ry);
		text.setAttribute('fill', '#FFFFFF');
		text.setAttribute('stroke', '#3F3F3F');
		text.setAttribute('stroke-width', 0.01*ry);
		text.appendChild(document.createTextNode('EXIT'));
		this.add_element(pos, text);
		var polygon = document.createElementNS(SVG, 'polygon');
		polygon.setAttribute(
			'points',
			this.vertices_points(
				[
					[pos[0]-0.25, y-0.25, FLOOR_HEIGHT],
					[pos[0]+0.25, y-0.25, FLOOR_HEIGHT],
					[pos[0]+0.25, y+0.25, FLOOR_HEIGHT],
					[pos[0]-0.25, y+0.25, FLOOR_HEIGHT]
				]
			)
		);
		polygon.setAttribute('fill', this.colour_code([0xBF, 0xBF, 0xBF]));
		this.add_element(pos, polygon);
	}
	return this.draw_plane(
		pos,
		CEILING_HEIGHT,
		this.brighten(tile.colour, CEILING_BRIGHTNESS*d)
	);
};

Drawer.prototype.trace_repeated = function trace_repeated(pos) {
	if (this.trace.has(pos[0])) {
		var t = this.trace.get(pos[0]);
		if (t.has(pos[1])) return true;
		t.add(pos[1]);
	} else {
		this.trace.set(pos[0], new Set([pos[1]]));
	}
	return false;
};

Drawer.prototype.draw_front = function draw_front(pos) {
	if (Math.abs(pos[0]) > pos[1]) return;
	if (Math.abs(pos[0])+pos[1] > RANGE) return;
	var tile = this.player.relative_tile(pos);
	if (tile.is_wall()) {
		var polygon = document.createElementNS(SVG, 'polygon');
		polygon.setAttribute(
			'points',
			this.vertices_points(
				[
					[pos[0]-0.5, pos[1]+VIEW_DISTANCE-0.5, FLOOR_HEIGHT],
					[pos[0]-0.5, pos[1]+VIEW_DISTANCE-0.5, CEILING_HEIGHT],
					[pos[0]+0.5, pos[1]+VIEW_DISTANCE-0.5, CEILING_HEIGHT],
					[pos[0]+0.5, pos[1]+VIEW_DISTANCE-0.5, FLOOR_HEIGHT]
				]
			)
		);
		polygon.setAttribute(
			'fill',
			this.colour_code(this.brighten(tile.colour, this.decay(pos)))
		);
		polygon.setAttribute('stroke', WALL_BORDER_COLOUR);
		polygon.setAttribute('stroke-width', WALL_BORDER_WIDTH);
		return this.add_element(pos, polygon);
	} else {
		if (this.trace_repeated(pos)) return;
		this.draw_front([pos[0], pos[1]+1]);
		this.draw_left([pos[0]-1, pos[1]]);
		this.draw_right([pos[0]+1, pos[1]]);
		return this.draw_tile(tile, pos);
	}
};

Drawer.prototype.draw_left = function draw_left(pos) {
	if (pos[0] >= 0) return;
	if (-pos[0] > pos[1]+1) return;
	if (-pos[0]+pos[1] > RANGE) return;
	var tile = this.player.relative_tile(pos);
	if (tile.is_wall()) {
		var polygon = document.createElementNS(SVG, 'polygon');
		polygon.setAttribute(
			'points',
			this.vertices_points(
				[
					[pos[0]+0.5, pos[1]+VIEW_DISTANCE-0.5, FLOOR_HEIGHT],
					[pos[0]+0.5, pos[1]+VIEW_DISTANCE-0.5, CEILING_HEIGHT],
					[pos[0]+0.5, pos[1]+VIEW_DISTANCE+0.5, CEILING_HEIGHT],
					[pos[0]+0.5, pos[1]+VIEW_DISTANCE+0.5, FLOOR_HEIGHT]
				]
			)
		);
		polygon.setAttribute(
			'fill',
			this.colour_code(this.brighten(tile.colour, this.decay(pos)))
		);
		polygon.setAttribute('stroke', WALL_BORDER_COLOUR);
		polygon.setAttribute('stroke-width', WALL_BORDER_WIDTH);
		return this.add_element(pos, polygon);
	} else {
		if (this.trace_repeated(pos)) return;
		this.draw_front([pos[0], pos[1]+1]);
		this.draw_left([pos[0]-1, pos[1]]);
		return this.draw_tile(tile, pos);
	}
};

Drawer.prototype.draw_right = function draw_right(pos) {
	if (pos[0] <= 0) return;
	if (pos[0] > pos[1]+1) return;
	if (pos[0]+pos[1] > RANGE) return;
	var tile = this.player.relative_tile(pos);
	if (tile.is_wall()) {
		var polygon = document.createElementNS(SVG, 'polygon');
		polygon.setAttribute(
			'points',
			this.vertices_points(
				[
					[pos[0]-0.5, pos[1]+VIEW_DISTANCE-0.5, FLOOR_HEIGHT],
					[pos[0]-0.5, pos[1]+VIEW_DISTANCE-0.5, CEILING_HEIGHT],
					[pos[0]-0.5, pos[1]+VIEW_DISTANCE+0.5, CEILING_HEIGHT],
					[pos[0]-0.5, pos[1]+VIEW_DISTANCE+0.5, FLOOR_HEIGHT]
				]
			)
		);
		polygon.setAttribute(
			'fill',
			this.colour_code(this.brighten(tile.colour, this.decay(pos)))
		);
		polygon.setAttribute('stroke', WALL_BORDER_COLOUR);
		polygon.setAttribute('stroke-width', WALL_BORDER_WIDTH);
		return this.add_element(pos, polygon);
	} else {
		if (this.trace_repeated(pos)) return;
		this.draw_front([pos[0], pos[1]+1]);
		this.draw_right([pos[0]+1, pos[1]]);
		return this.draw_tile(tile, pos);
	}
};

Drawer.prototype.draw_info = function draw_info() {
	var text = document.createElementNS(SVG, 'text');
	text.setAttribute('x', -0.95);
	text.setAttribute('y', 0.7);
	text.setAttribute('font-size', 0.1);
	text.setAttribute('font-weight', 'bold');
	text.setAttribute('fill', '#FFDF7F');
	text.setAttribute('stroke', '#00003F');
	text.setAttribute('stroke-width', 0.0025);
	text.appendChild(
		document.createTextNode(
			'SIZE: ' + (this.player.maze.size - 2).toString()
		)
	);
	return document.documentElement.appendChild(text);
};

Drawer.prototype.output = function output() {
	return this.elements
		.sort(function (a, b) {return b[0] - a[0];})
		.forEach(function (e) {document.documentElement.appendChild(e[1]);});
};

Drawer.prototype.draw_maze = function draw_maze() {
	clear_screen();
	this.draw_front([0, 0]);
	this.output();
	this.draw_info();
	return this.reset();
};

/*** Main Program ***/

function run() {
	var maze = new Maze;
	var player = new Player(maze);
	var drawer = new Drawer(player);

	drawer.draw_maze();

	document.addEventListener(
		'keydown',
		function keydown(event) {
			if (event.key === 'ArrowUp') {
				if (player.step_forward())
					return drawer.draw_maze();
			} else if (event.key === 'ArrowDown') {
				if (player.step_backward())
					return drawer.draw_maze();
			} else if (event.key === 'ArrowLeft') {
				player.turn_left()
				return drawer.draw_maze();
			} else if (event.key === 'ArrowRight') {
				player.turn_right()
				return drawer.draw_maze();
			}
		}
	);
	document.addEventListener(
		'mousedown',
		function mousedown(event) {
			var bl_ur = event.clientX/event.clientY < ASPECT_RATIO;
			var ul_br = event.clientX/(screen.height-event.clientY) < ASPECT_RATIO;
			if (bl_ur) {
				if (ul_br) {
					player.turn_left()
					return drawer.draw_maze();
				} else {
					if (player.step_backward())
						return drawer.draw_maze();
				}
			} else {
				if (ul_br) {
					if (player.step_forward())
						return drawer.draw_maze();
				} else {
					player.turn_right()
					return drawer.draw_maze();
				}
			}
		}
	);
}

run();

});
