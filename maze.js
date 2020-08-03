(function(f){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',f);else f();})(function () {
'use strict';

var SVG = 'http://www.w3.org/2000/svg';

/*** Screen Dimensions ***/

var CEILING_HEIGHT = 0.4;
var FLOOR_HEIGHT = -0.6;

var ASPECT_RATIO = 4 / 3;

var width, height;
var width2, height2;

function update_dimensions() {
	//	var r = document.documentElement.getBoundingClientRect();
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
	console.log('update_dimensions:', w, h, width, width2, height, height2);
}

update_dimensions();
window.addEventListener('resize', update_dimensions);

/*** Map ***/

//	var COLOURS = [
//		[0xBF, 0x3F, 0x3F],
//		[0xBF, 0xBF, 0x00],
//		[0x3F, 0xBF, 0x3F],
//		[0x00, 0xBF, 0xBF],
//		[0x3F, 0x3F, 0xBF],
//		[0xBF, 0x00, 0xBF]
//	];
var COLOURS = [
	[0xBF, 0x3F, 0x3F],
	[0xBF, 0xBF, 0x00],
	[0x3F, 0x3F, 0xBF],
	[0x3F, 0xBF, 0x3F],
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
			[X(0), X(1), X(0), X(1), X(0), X(1), X(0), X(1)],
			[X(2), O(3), O(2), O(3), O(2), O(3), O(2), X(3)],
			[X(0), O(1), X(0), X(1), O(0), X(1), O(0), X(1)],
			[X(2), O(3), O(2), O(1), O(2), X(3), O(0), X(3)],
			[X(0), O(1), X(0), X(3), X(0), X(1), O(2), X(1)],
			[X(2), O(3), O(2), O(1), O(2), X(3), O(0), X(3)],
			[X(0), O(1), O(0), X(3), O(0), O(1), O(2), X(1)],
			[X(2), X(3), X(2), X(1), X(2), X(3), X(0), X(3)]
		][position[1]][position[0]]
	);
}

/*** Calculation ***/

function zip(f, a, b) {
	var n = Math.min(a.length, b.length);
	var z = new Array(n);
	for (var i=0; i<n; ++i)
		z[i] = f(a[i], b[i], i);
	return z;
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

function relative_position(facing, position) {
	return times_matrix_vector(rotation_matrix(facing), position);
}

/*** Player ***/

function Player() {
	this.position = [1, 1];
	this.facing = 1;
	return this;
}

Player.prototype.relative_tile = function relative_tile(position) {
	var p = plus_vectors(this.position, relative_position(this.facing, position));
	return map(p);
}

Player.prototype.step = function step(rel_pos) {
	var p = plus_vectors(this.position, relative_position(this.facing, rel_pos));
	if (map(p).wall) {
		return false;
	} else {
		this.position = p;
		return true;
	}
}

Player.prototype.step_forward = function step_forward() {
	return this.step([0, 1]);
}

Player.prototype.step_backward = function step_backward() {
	return this.step([0, -1]);
}

Player.prototype.turn_left = function turn_left() {
	this.facing = (this.facing + 3) % 4;
}

Player.prototype.turn_right = function turn_right() {
	this.facing = (this.facing + 1) % 4;
}

/*** Display ***/

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

function brighten(c, r) {
	if (r > 1)
		return c.map(function (n) {return 255 - Math.round((255 - n) / r);});
	else
		return c.map(function (n) {return Math.round(n * r);});
}

function colour_code(c) {
	return '#' + c.map(function (n) {return n.toString(16).padStart(2, '0');}).join('');
}

function vertices_points(v) {
	return (
		v
			.map(function (v) {return [v[0]/v[1], -v[2]/v[1]].join()})
			.join(' ')
	);
}

function draw_plane(rel_pos, height, colour) {
	var polygon = document.createElementNS(SVG, 'polygon');
	var points =
		vertices_points(
			[[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]
				.map(function (v) {return [v[0]+rel_pos[0], v[1]+rel_pos[1], height];})
		);
	polygon.setAttribute('points', points);
	polygon.setAttribute('fill', colour_code(colour));
	return document.documentElement.appendChild(polygon);
}

function decay(rel_pos) {
	return 0.5**(rel_pos[1]-1);
}

function draw_tile(rel_pos, colour) {
		var d = decay(rel_pos);
		draw_plane(rel_pos, FLOOR_HEIGHT, brighten(colour, 0.5*d));
		draw_plane(rel_pos, CEILING_HEIGHT, brighten(colour, 2*d));
}

function wall_front(player, rel_pos) {
	var tile = player.relative_tile(rel_pos);
	if (!tile.wall) return;
	var polygon = document.createElementNS(SVG, 'polygon');
	var points =
		vertices_points(
			[
				[rel_pos[0]-0.5, rel_pos[1]-0.5, FLOOR_HEIGHT],
				[rel_pos[0]-0.5, rel_pos[1]-0.5, CEILING_HEIGHT],
				[rel_pos[0]+0.5, rel_pos[1]-0.5, CEILING_HEIGHT],
				[rel_pos[0]+0.5, rel_pos[1]-0.5, FLOOR_HEIGHT]
			]
		);
	polygon.setAttribute('points', points);
	polygon.setAttribute('fill', colour_code(brighten(tile.colour, decay(rel_pos))));
	return document.documentElement.appendChild(polygon);
}

function explore_front(player, rel_pos) {
	var tile = player.relative_tile(rel_pos);
	if (tile.wall) return;
	explore_front(player, [rel_pos[0], rel_pos[1]+1]);
	explore_left(player, [rel_pos[0]-1, rel_pos[1]]);
	explore_right(player, [rel_pos[0]+1, rel_pos[1]]);
	wall_front(player, [rel_pos[0], rel_pos[1]+1]);
	wall_left(player, [rel_pos[0]-1, rel_pos[1]]);
	wall_right(player, [rel_pos[0]+1, rel_pos[1]]);
	return draw_tile(rel_pos, tile.colour);
}

function wall_left(player, rel_pos) {
	if (rel_pos[0] > 0) return;
	var tile = player.relative_tile(rel_pos);
	if (!tile.wall) return;
	var polygon = document.createElementNS(SVG, 'polygon');
	var points =
		vertices_points(
			[
				[rel_pos[0]+0.5, rel_pos[1]-0.5, FLOOR_HEIGHT],
				[rel_pos[0]+0.5, rel_pos[1]-0.5, CEILING_HEIGHT],
				[rel_pos[0]+0.5, rel_pos[1]+0.5, CEILING_HEIGHT],
				[rel_pos[0]+0.5, rel_pos[1]+0.5, FLOOR_HEIGHT]
			]
		);
	polygon.setAttribute('points', points);
	polygon.setAttribute('fill', colour_code(brighten(tile.colour, decay(rel_pos))));
	return document.documentElement.appendChild(polygon);
}

function explore_left(player, rel_pos) {
	if (rel_pos[0] > 0) return;
	var tile = player.relative_tile(rel_pos);
	if (tile.wall) return;
	explore_front(player, [rel_pos[0], rel_pos[1]+1]);
	explore_left(player, [rel_pos[0]-1, rel_pos[1]]);
	wall_front(player, [rel_pos[0], rel_pos[1]+1]);
	wall_left(player, [rel_pos[0]-1, rel_pos[1]]);
	return draw_tile(rel_pos, tile.colour);
}

function wall_right(player, rel_pos) {
	if (rel_pos[0] < 0) return;
	var tile = player.relative_tile(rel_pos);
	if (!tile.wall) return;
	var polygon = document.createElementNS(SVG, 'polygon');
	var points =
		vertices_points(
			[
				[rel_pos[0]-0.5, rel_pos[1]-0.5, FLOOR_HEIGHT],
				[rel_pos[0]-0.5, rel_pos[1]-0.5, CEILING_HEIGHT],
				[rel_pos[0]-0.5, rel_pos[1]+0.5, CEILING_HEIGHT],
				[rel_pos[0]-0.5, rel_pos[1]+0.5, FLOOR_HEIGHT]
			]
		);
	polygon.setAttribute('points', points);
	polygon.setAttribute('fill', colour_code(brighten(tile.colour, decay(rel_pos))));
	return document.documentElement.appendChild(polygon);
}

function explore_right(player, rel_pos) {
	if (rel_pos[0] < 0) return;
	var tile = player.relative_tile(rel_pos);
	if (tile.wall) return;
	explore_front(player, [rel_pos[0], rel_pos[1]+1]);
	explore_right(player, [rel_pos[0]+1, rel_pos[1]]);
	wall_front(player, [rel_pos[0], rel_pos[1]+1]);
	wall_right(player, [rel_pos[0]+1, rel_pos[1]]);
	return draw_tile(rel_pos, tile.colour);
}

function draw_maze(player) {
	clear_screen();
	explore_front(player, [0, 1]);
	return wall_front(player, [0, 1]);
}

/*** Main Program ***/

var player = new Player;

draw_maze(player);

document.addEventListener(
	'keydown',
	function keydown(event) {
		if (event.key === 'ArrowUp') {
			if (player.step_forward())
				return draw_maze(player);
		} else if (event.key === 'ArrowDown') {
			if (player.step_backward())
				return draw_maze(player);
		} else if (event.key === 'ArrowLeft') {
			player.turn_left()
			return draw_maze(player);
		} else if (event.key === 'ArrowRight') {
			player.turn_right()
			return draw_maze(player);
		}
	}
);

});
