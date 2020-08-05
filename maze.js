(function(f){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',f);else f();})(function () {
'use strict';

/*** Constants ***/

var DECAY_RATE = 0.75;
var RANGE = 7;
var VIEW_DISTANCE = 0.75;
var CEILING_HEIGHT = 0.4;
var FLOOR_HEIGHT = -0.6;
var FLOOR_BRIGHTNESS = 0.5;
var CEILING_BRIGHTNESS = 2;
var WALL_BORDER_COLOUR = '#000000';
var WALL_BORDER_WIDTH = '0.003';

/*** Screen Dimensions ***/

var ASPECT_RATIO = 4 / 3;

var width, height;
var width2, height2;

function update_dimensions() {
	var w = window.innerWidth;
	var h = window.innerHeight;
	var ah = Math.round(w / ASPECT_RATIO);
	var aw = Math.round(h * ASPECT_RATIO);
	width = Math.min(w, aw);
	height = Math.min(h, ah);
	width2 = Math.floor(width / 2);
	height2 = Math.floor(height / 2);
	document.documentElement.setAttribute('width', width);
	document.documentElement.setAttribute('height', height);
}

update_dimensions();
window.addEventListener('resize', update_dimensions);

/*** Map ***/

var COLOURS = [
	[0xBF, 0x00, 0x00],
	[0x7F, 0x3F, 0x00],
	[0x3F, 0x7F, 0x00],
	[0x00, 0xBF, 0x00],
	[0x00, 0x7F, 0x3F],
	[0x00, 0x3F, 0x7F],
	[0x00, 0x00, 0xBF],
	[0x3F, 0x00, 0x7F],
	[0x7F, 0x00, 0x3F]
];

function Tile(t, c) {
	this.type = t;
	this.colour = c;
	return this;
}

Tile.WALL = 0;
Tile.EMPTY = 1;
Tile.EXIT = 2;

Tile.prototype.is_wall = function is_wall() {
	return Object.is(this.type, Tile.WALL);
};

function map(position) {
	function X(c) {return new Tile(Tile.WALL, COLOURS[c]);}
	function O(c) {return new Tile(Tile.EMPTY, COLOURS[c]);}
	function S(c) {return new Tile(Tile.EXIT, COLOURS[c]);}
	return (
		[
			[X(0), X(1), X(2), X(0), X(1), X(2), X(0), X(1), X(2)],
			[X(3), O(4), O(5), O(3), O(4), O(5), O(3), O(4), X(5)],
			[X(6), O(7), X(8), X(6), O(7), X(8), X(6), O(7), X(8)],
			[X(0), O(1), O(2), O(0), O(1), O(2), O(0), O(1), X(2)],
			[X(3), O(4), X(5), X(3), X(4), X(5), X(3), O(4), X(5)],
			[X(6), O(7), O(8), O(6), O(7), X(8), S(6), O(7), X(8)],
			[X(0), O(1), O(2), X(0), O(1), X(2), O(0), O(1), X(2)],
			[X(3), O(4), O(5), X(3), O(4), O(5), O(3), X(4), X(5)],
			[X(6), X(7), X(8), X(6), X(7), X(8), X(6), X(7), X(8)]
		][position[1]][position[0]]
	);
}

/*** Player ***/

function Player() {
	this.position = [1, 1];
	this.facing = 1;
	return this;
}

Player.prototype.tile = function () {
	return map(this.position);
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
	return map(this.relative_position(pos));
};

Player.prototype.step = function step(pos) {
	var p = this.relative_position(pos);
	if (map(p).is_wall()) {
		return false;
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
	return '#' + c.map(function (n) {return n.toString(16).padStart(2, '0');}).join('');
};

Drawer.prototype.vertices_points = function vertices_points(v) {
	return (
		v
			.map(function (v) {return [(v[0]/v[1]).toString(), (-v[2]/v[1]).toString()].join()})
			.join(' ')
	);
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
	this.add_element(pos, polygon);
};

Drawer.prototype.decay = function decay(pos) {
	return DECAY_RATE**(pos[1]-1);
};

Drawer.prototype.draw_tile = function draw_tile(tile, pos) {
	var d = this.decay(pos);
	this.draw_plane(pos, FLOOR_HEIGHT, this.brighten(tile.colour, FLOOR_BRIGHTNESS*d));
	if (Object.is(tile.type, Tile.EXIT)) {
		var text = document.createElementNS(SVG, 'text');
		var y = pos[1] + VIEW_DISTANCE;
		var ry = 1 / y;
		text.setAttribute('font-size', 0.4*ry);
		text.setAttribute('x', (pos[0]-0.5)*ry);
		text.setAttribute('y', 0.1*ry);
		text.setAttribute('fill', '#FFFFFF');
		text.setAttribute('stroke', '#3F3F3F');
		text.setAttribute('stroke-width', (0.01*ry).toString());
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
	this.draw_plane(pos, CEILING_HEIGHT, this.brighten(tile.colour, CEILING_BRIGHTNESS*d));
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
		var points =
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
		var points =
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

Drawer.prototype.output = function output() {
	return (
		this.elements
			.sort(function (a, b) {return b[0]-a[0];})
			.forEach(function (e) {return document.documentElement.appendChild(e[1]);})
	);
};

Drawer.prototype.draw_maze = function draw_maze() {
	clear_screen();
	this.draw_front([0, 0]);
	this.output();
	return this.reset();
};

/*** Main Program ***/

function run() {
	var player = new Player;
	var drawer = new Drawer(player);

	drawer.draw_maze();

	var keydown =
		document.addEventListener(
			'keydown',
			function keydown(event) {
				if (event.key === 'ArrowUp') {
					if (player.step_forward())
						drawer.draw_maze();
				} else if (event.key === 'ArrowDown') {
					if (player.step_backward())
						drawer.draw_maze();
				} else if (event.key === 'ArrowLeft') {
					player.turn_left()
					drawer.draw_maze();
				} else if (event.key === 'ArrowRight') {
					player.turn_right()
					drawer.draw_maze();
				} else return;
			}
		);
}

run();

});
