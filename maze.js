(function(f){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',f);else f();})(function () {
'use strict';

/*** Screen Dimensions ***/

var DECAY_RATE = 0.75;
var RANGE = 7;
var VIEW_DISTANCE = 1.125;
var CEILING_HEIGHT = 0.4;
var FLOOR_HEIGHT = -0.6;
var FLOOR_BRIGHTNESS = 0.5;
var CEILING_BRIGHTNESS = 2;

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

function Tile(w, c) {
	this.wall = w;
	this.colour = COLOURS[c];
	return this;
}

function map(position) {
	function X(c) {return new Tile(true, c);}
	function O(c) {return new Tile(false, c);}
	return (
		[
			[X(0), X(1), X(2), X(0), X(1), X(2), X(0), X(1), X(2)],
			[X(3), O(4), O(5), O(3), O(4), O(5), O(3), X(4), X(5)],
			[X(6), O(7), X(8), X(6), O(7), X(8), O(6), O(7), X(8)],
			[X(0), O(1), O(2), O(0), O(1), X(2), X(0), O(1), X(2)],
			[X(3), O(4), X(5), X(3), X(4), X(5), X(3), O(4), X(5)],
			[X(6), O(7), O(8), O(6), O(7), X(8), O(6), O(7), X(8)],
			[X(0), O(1), O(2), X(0), O(1), X(2), O(0), X(1), X(2)],
			[X(3), O(4), O(5), X(3), O(4), O(5), O(3), O(4), X(5)],
			[X(6), X(7), X(8), X(6), X(7), X(8), X(6), X(7), X(8)]
		][position[1]][position[0]]
	);
}

/*** Calculation ***/

function rotation_matrix(facing) {
	return (
		[
			[
				1, 0,
				0, -1
			],
			[
				0, 1,
				1, 0
			],
			[
				-1, 0,
				0, 1
			],
			[
				0, -1,
				-1, 0
			]
		][facing]
	);
}

function times_matrix_vector(m, v) {
	return [
		m[0]*v[0] + m[1]*v[1],
		m[2]*v[0] + m[3]*v[1]
	];
}

function plus_vectors(a, b) {
	return [a[0]+b[0], a[1]+b[1]];
}

function relative_position(facing, position) {
	return times_matrix_vector(rotation_matrix(facing), position);
}

/*** Player ***/

function Player() {
	this.position = [1, 1];
	this.facing = 1;
	return this;
}
(function () {return this.call(Player.prototype);}).call(function () {
	this.relative_tile = function relative_tile(position) {
		var p = plus_vectors(this.position, relative_position(this.facing, position));
		return map(p);
	};
	this.step = function step(pos) {
		var p = plus_vectors(this.position, relative_position(this.facing, pos));
		if (map(p).wall) {
			return false;
		} else {
			this.position = p;
			return true;
		}
	};
	this.step_forward = function step_forward() {
		return this.step([0, 1]);
	};
	this.step_backward = function step_backward() {
		return this.step([0, -1]);
	};
	this.turn_left = function turn_left() {
		this.facing = (this.facing + 3) % 4;
	};
	this.turn_right = function turn_right() {
		this.facing = (this.facing + 1) % 4;
	};
});

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
(function () {return this.call(Drawer.prototype);}).call(function () {
	this.reset = function reset() {
		this.trace = new Map;
		this.elements = new Array;
	};
	this.brighten = function brighten(c, r) {
		if (r > 1)
			return c.map(function (n) {return 255 - Math.round((255 - n) / r);});
		else
			return c.map(function (n) {return Math.round(n * r);});
	};
	this.colour_code = function colour_code(c) {
		return '#' + c.map(function (n) {return n.toString(16).padStart(2, '0');}).join('');
	};
	this.vertices_points = function vertices_points(v) {
		return (
			v
				.map(function (v) {return [v[0]/v[1], -v[2]/v[1]].join()})
				.join(' ')
		);
	};
	this.add_element = function add_element(pos, element) {
		return this.elements.push([Math.abs(pos[0])+Math.abs(pos[1]), element]);
	};
	this.draw_plane = function draw_plane(pos, height, colour) {
		var polygon = document.createElementNS(SVG, 'polygon');
		var points =
			this.vertices_points(
				[
					[pos[0]-0.5, pos[1]+VIEW_DISTANCE-1, height],
					[pos[0]+0.5, pos[1]+VIEW_DISTANCE-1, height],
					[pos[0]+0.5, pos[1]+VIEW_DISTANCE,   height],
					[pos[0]-0.5, pos[1]+VIEW_DISTANCE,   height]
				]
			);
		polygon.setAttribute('points', points);
		polygon.setAttribute('fill', this.colour_code(colour));
		this.add_element(pos, polygon);
	};
	this.decay = function decay(pos) {
		return DECAY_RATE**(pos[1]-1);
	};
	this.draw_tile = function draw_tile(pos, colour) {
		var d = this.decay(pos);
		this.draw_plane(pos, FLOOR_HEIGHT, this.brighten(colour, FLOOR_BRIGHTNESS*d));
		this.draw_plane(pos, CEILING_HEIGHT, this.brighten(colour, CEILING_BRIGHTNESS*d));
	};
	this.trace_repeated = function trace_repeated(pos) {
		if (this.trace.has(pos[0])) {
			var t = this.trace.get(pos[0]);
			if (t.has(pos[1])) return true;
			t.add(pos[1]);
		} else {
			this.trace.set(pos[0], new Set([pos[1]]));
		}
		return false;
	};
	this.draw_front = function draw_front(pos) {
		if (Math.abs(pos[0]) > pos[1]) return;
		if (Math.abs(pos[0])+pos[1] > RANGE) return;
		var tile = this.player.relative_tile(pos);
		if (tile.wall) {
			var polygon = document.createElementNS(SVG, 'polygon');
			polygon.setAttribute(
				'points',
				this.vertices_points(
					[
						[pos[0]-0.5, pos[1]+VIEW_DISTANCE-1, FLOOR_HEIGHT],
						[pos[0]-0.5, pos[1]+VIEW_DISTANCE-1, CEILING_HEIGHT],
						[pos[0]+0.5, pos[1]+VIEW_DISTANCE-1, CEILING_HEIGHT],
						[pos[0]+0.5, pos[1]+VIEW_DISTANCE-1, FLOOR_HEIGHT]
					]
				)
			);
			polygon.setAttribute(
				'fill',
				this.colour_code(this.brighten(tile.colour, this.decay(pos)))
			);
			return this.add_element(pos, polygon);
		} else {
			if (this.trace_repeated(pos)) return;
			this.draw_front([pos[0], pos[1]+1]);
			this.draw_left([pos[0]-1, pos[1]]);
			this.draw_right([pos[0]+1, pos[1]]);
			return this.draw_tile(pos, tile.colour);
		}
	};
	this.draw_left = function draw_left(pos) {
		if (pos[0] >= 0) return;
		if (-pos[0] > pos[1]+1) return;
		if (-pos[0]+pos[1] > RANGE) return;
		var tile = this.player.relative_tile(pos);
		if (tile.wall) {
			var polygon = document.createElementNS(SVG, 'polygon');
			var points =
			polygon.setAttribute(
				'points',
				this.vertices_points(
					[
						[pos[0]+0.5, pos[1]+VIEW_DISTANCE-1, FLOOR_HEIGHT],
						[pos[0]+0.5, pos[1]+VIEW_DISTANCE-1, CEILING_HEIGHT],
						[pos[0]+0.5, pos[1]+VIEW_DISTANCE,   CEILING_HEIGHT],
						[pos[0]+0.5, pos[1]+VIEW_DISTANCE,   FLOOR_HEIGHT]
					]
				)
			);
			polygon.setAttribute(
				'fill',
				this.colour_code(this.brighten(tile.colour, this.decay(pos)))
			);
			return this.add_element(pos, polygon);
		} else {
			if (this.trace_repeated(pos)) return;
			this.draw_front([pos[0], pos[1]+1]);
			this.draw_left([pos[0]-1, pos[1]]);
			return this.draw_tile(pos, tile.colour);
		}
	};
	this.draw_right = function draw_right(pos) {
		if (pos[0] <= 0) return;
		if (pos[0] > pos[1]+1) return;
		if (pos[0]+pos[1] > RANGE) return;
		var tile = this.player.relative_tile(pos);
		if (tile.wall) {
			var polygon = document.createElementNS(SVG, 'polygon');
			var points =
			polygon.setAttribute(
				'points',
				this.vertices_points(
					[
						[pos[0]-0.5, pos[1]+VIEW_DISTANCE-1, FLOOR_HEIGHT],
						[pos[0]-0.5, pos[1]+VIEW_DISTANCE-1, CEILING_HEIGHT],
						[pos[0]-0.5, pos[1]+VIEW_DISTANCE,   CEILING_HEIGHT],
						[pos[0]-0.5, pos[1]+VIEW_DISTANCE,   FLOOR_HEIGHT]
					]
				)
			);
			polygon.setAttribute(
				'fill',
				this.colour_code(this.brighten(tile.colour, this.decay(pos)))
			);
			return this.add_element(pos, polygon);
		} else {
			if (this.trace_repeated(pos)) return;
			this.draw_front([pos[0], pos[1]+1]);
			this.draw_right([pos[0]+1, pos[1]]);
			return this.draw_tile(pos, tile.colour);
		}
	};
	this.output = function output() {
		return (
			this.elements
				.sort(function (a, b) {return b[0]-a[0];})
				.forEach(function (e) {return document.documentElement.appendChild(e[1]);})
		);
	};
	this.draw_maze = function draw_maze() {
		clear_screen();
		this.draw_front([0, 0]);
		this.output();
		return this.reset();
	};
});

/*** Main Program ***/

var player = new Player;
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

});
