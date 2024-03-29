void function (f) {
	if (document.readyState === "loading")
		document.addEventListener("DOMContentLoaded", f);
	else
		f();
}(function () {
"use strict";

var dark_mode = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
dark_mode = dark_mode && dark_mode.matches;

var FONT = "px serif";
var CURSOR_WIDTH = .25;
var COLOUR_LINE = dark_mode ? "#FFF" : "#000";
var COLOUR_FORWARD = dark_mode ? "#8F8" : "#00C";
var COLOUR_BACKWARD = dark_mode ? "#F88" : "#C00";
var COLOUR_LABEL = dark_mode ? "#88F" : "#080";
var COLOUR_CURSOR_BOARD =  dark_mode ? "#6664" : "#CCC4";
var COLOUR_CURSOR_LINE =  dark_mode ? "#FFF8" : "#0008";
var CANVAS_SCALE = .5 * (Math.sqrt(5) + 1);
var SCALE_EXP_ROUNDS = 3;
var SCALE_SIN_ROUNDS = 2;
var TICK_SCALE_CONSTANT = .0234375 * CANVAS_SCALE;

function apply(func, thisArg, args) {
	return func.apply(thisArg, args);
}

function call(func, thisArg, ...args) {
	return apply(func, thisArg, args);
}

function negate(func) {
	return function (x) {
		return func(!x);
	}
}

var main_tag = document.getElementsByTagName("main").item(0);
var type_tags = document.querySelectorAll("input[type='radio'][name='type']");
var canvas_tag = document.createElement("canvas");
canvas_tag.hidden = true;
//	main_tag.appendChild(canvas_tag);
var cc = canvas_tag.getContext("2d", {"alpha": true});
if (!cc)
	return call(
		function() {
			document.body.removeChild(main_tag);
			var p = document.createElement("p");
			p.appendChild(document.createTextNode("CanvasRenderingContext2D is not supported by this browser."));
			return document.body.appendChild(p);
		}
	);
//	cc.imageSmoothingEnabled = true;
//	cc.imageSmoothingQuality = "high";

var main_dimension, main_centre;
var canvas_dimension, canvas_centre;
var outer_scales, inner_scales;
var outer_tag, inner_tag, cursor_tag;
var cursor_label;
var stack_radius;
var slide_radius;
var inner_angle = 0;
var cursor_angle = 0;

function tick_scale(n) {
	var v = tick_scale.memoize.get(n);
	if (typeof value === "undefined") {
		var v = TICK_SCALE_CONSTANT * main_dimension * Math.pow(.5, .5 * n);
		tick_scale.memoize.set(n, v);
	}
	return v;
}

tick_scale.memoize = new Map;

var PI2 = 2 * Math.PI;
var PI_2 = .5 * Math.PI;
var PI_180 = Math.PI / 180;
var I_LN10 = 1 / Math.LN10;
var PI2_LN10 = PI2 * I_LN10;

function draw_tick_circle(r, x, b, h) {
	cc.setTransform(1, 0, 0, 1, canvas_centre, canvas_centre);
	cc.rotate(PI2 * x);
	cc.moveTo(0, - r + b);
	return cc.lineTo(0, - r + h);
}

function draw_spiral(r, dr, x0, x1, dx) {
	cc.setTransform(1, 0, 0, 1, canvas_centre, canvas_centre);
	cc.rotate(PI2 * x0);
	cc.moveTo(0, - r);
	var x = x0;
	while ((x += dx) < x1) {
		cc.setTransform(1, 0, 0, 1, canvas_centre, canvas_centre);
		cc.rotate(- PI2 * x);
		cc.lineTo(0, - r + x * dr);
	}
	cc.setTransform(1, 0, 0, 1, canvas_centre, canvas_centre);
	cc.rotate(- PI2 * x1);
	cc.lineTo(0, - r + x1 * dr);
}

function draw_tick_spiral(r, dr, x, h) {
	cc.setTransform(1, 0, 0, 1, canvas_centre, canvas_centre);
	cc.rotate(PI2 * x);
	var y = - r - x * dr;
	cc.moveTo(0, y);
	cc.lineTo(0, y + h);
	return y;
}

function draw_scale_main(upside) {
	/* radii */
	var outer_radius = stack_radius;
	var inner_radius = outer_radius - 1.5 * tick_scale(0);
	var radius = upside ? outer_radius : inner_radius;
	stack_radius = inner_radius;
	/* helper function */
	function d(x) {
		return upside ? +x : -x;
	}
	function k(x, h) {
		return draw_tick_circle(radius, Math.log(x) * I_LN10, 0, d(h));
	}
	/* legend */
	cursor_label.push(
		function () {
			cc.fillStyle = COLOUR_LABEL;
			cc.font = tick_scale(1) + FONT;
			cc.textBaseline = "middle";
			cc.textAlign = "left";
			return cc.fillText("x", canvas_centre + CANVAS_SCALE, canvas_centre - radius + d(tick_scale(1)));
		}
	);
	/* circle */
	cc.strokeStyle = COLOUR_LINE;
	cc.fillStyle = COLOUR_FORWARD;
	cc.beginPath();
	cc.arc(canvas_centre, canvas_centre, radius, 0, PI2);
	cc.stroke();
	/* ticks and labels */
	cc.textBaseline = "middle";
	cc.textAlign = "left";
	cc.beginPath();
	for (var x = 1; x <= 9; ++x) {
		k(x, tick_scale(0));
		cc.font = tick_scale(0) + FONT;
		cc.fillText(x.toString(), CANVAS_SCALE, d(tick_scale(0)) - radius);
		for (var x1 = 0; x1 <= 9; ++x1) {
			var xx1 = x + .1 * x1;
			if (x1 > 0) {
				k(xx1, tick_scale(x1 === 5 ? 1 : 2));
				if (x < 5) {
					cc.font = tick_scale(1).toString() + FONT;
					cc.fillText(x1.toString(), CANVAS_SCALE, d(tick_scale(1)) - radius);
				}
			}
			if (x < 2)
				for (var x2 = 0; x2 <= 9; ++x2) {
					var xx1x2 = xx1 + .01 * x2;
					if (x2 > 0)
						k(xx1x2, tick_scale(x2 === 5 ? 3 : 4));
					if (x1 < 5)
						k(xx1x2 + .005, tick_scale(6));
				}
			else if (x < 3)
				for (var x2 = 1; x2 <= 9; ++x2)
					k(xx1 + .01 * x2, tick_scale(x2 === 5 ? 3 : 4));
			else if (x < 6)
				for (var x2 = 1; x2 <= 4; ++x2)
					k(xx1 + .02 * x2, tick_scale(4));
			else
				k(xx1 + .05, tick_scale(4));
		}
	}
	cc.stroke();
	cc.setTransform(1, 0, 0, 1, 0, 0);
}

function draw_scale_invert(upside) {
	/* radii */
	var outer_radius = stack_radius;
	var inner_radius = outer_radius - 1.5 * tick_scale(0);
	var radius = upside ? outer_radius : inner_radius;
	stack_radius = inner_radius;
	/* helper function */
	function d(x) {
		return upside ? +x : -x;
	}
	function k(x, h) {
		return draw_tick_circle(radius, - Math.log(x) * I_LN10, 0, d(h));
	}
	/* legend */
	cursor_label.push(
		function () {
			cc.fillStyle = COLOUR_LABEL;
			cc.font = tick_scale(1) + FONT;
			cc.textBaseline = "middle";
			cc.textAlign = "right";
			return cc.fillText("1/x", canvas_centre - CANVAS_SCALE, canvas_centre - radius + d(tick_scale(1)));
		}
	);
	/* circle */
	cc.strokeStyle = COLOUR_LINE;
	cc.fillStyle = COLOUR_BACKWARD;
	cc.beginPath();
	cc.arc(canvas_centre, canvas_centre, radius, 0, PI2);
	cc.stroke();
	/* ticks and labels */
	cc.textBaseline = "middle";
	cc.textAlign = "right";
	cc.beginPath();
	for (var x = 1; x <= 9; ++x) {
		k(x, tick_scale(0));
		cc.font = tick_scale(0) + FONT;
		cc.fillText(x.toString(), - CANVAS_SCALE, d(tick_scale(0)) - radius);
		for (var x1 = 0; x1 <= 9; ++x1) {
			var xx1 = x + .1 * x1;
			if (x1 > 0) {
				k(xx1, tick_scale(x1 === 5 ? 1 : 2));
				if (x < 5) {
					cc.font = tick_scale(1).toString() + FONT;
					cc.fillText(x1.toString(), - CANVAS_SCALE, d(tick_scale(1)) - radius);
				}
			}
			if (x < 2)
				for (var x2 = 0; x2 <= 9; ++x2) {
					var xx1x2 = xx1 + .01 * x2;
					if (x2 > 0)
						k(xx1x2, tick_scale(x2 === 5 ? 3 : 4));
					if (x1 < 5)
						k(xx1x2 + .005, tick_scale(6));
				}
			else if (x < 3)
				for (var x2 = 1; x2 <= 9; ++x2)
					k(xx1 + .01 * x2, tick_scale(x2 === 5 ? 3 : 4));
			else if (x < 6)
				for (var x2 = 1; x2 <= 4; ++x2)
					k(xx1 + .02 * x2, tick_scale(4));
			else
				k(xx1 + .05, tick_scale(4));
		}
	}
	cc.stroke();
	cc.setTransform(1, 0, 0, 1, 0, 0);
}

function draw_scale_log(upside) {
	/* radii */
	var outer_radius = stack_radius;
	var inner_radius = outer_radius - 1.5 * tick_scale(0);
	var radius = upside ? outer_radius : inner_radius;
	stack_radius = inner_radius;
	/* helper function */
	function d(x) {
		return upside ? +x : -x;
	}
	function k(x, h) {
		return draw_tick_circle(radius, x, 0, d(h));
	}
	/* legend */
	cursor_label.push(
		function () {
			cc.fillStyle = COLOUR_LABEL;
			cc.font = tick_scale(1) + FONT;
			cc.textBaseline = "middle";
			cc.textAlign = "left";
			return cc.fillText("log(x)", canvas_centre + CANVAS_SCALE, canvas_centre - radius + d(tick_scale(1)));
		}
	);
	/* circle */
	cc.strokeStyle = COLOUR_LINE;
	cc.fillStyle = COLOUR_FORWARD;
	cc.beginPath();
	cc.arc(canvas_centre, canvas_centre, radius, 0, PI2);
	cc.stroke();
	/* ticks and labels */
	cc.textBaseline = "middle";
	cc.textAlign = "left";
	cc.beginPath();
	for (var x1 = 0; x1 <= 9; ++x1) {
		var xx1 = .1 * x1;
		k(xx1, tick_scale(0));
		cc.font = tick_scale(0) + FONT;
		cc.fillText(x1.toString(), CANVAS_SCALE, d(tick_scale(0)) - radius);
		for (var x2 = 0; x2 <= 9; ++x2) {
			var xx1x2 = xx1 + .01 * x2;
			if (x2 > 0)
				k(xx1x2, tick_scale(x2 === 5 ? 1 : 2));
			for (var x3 = 1; x3 <= 4; ++x3)
				k(xx1x2 + 0.002 * x3, tick_scale(4));
		}
	}
	cc.stroke();
	cc.setTransform(1, 0, 0, 1, 0, 0);
}

function draw_scale_square(upside) {
	/* radii */
	var outer_radius = stack_radius;
	var inner_radius = outer_radius - 1.5 * tick_scale(0);
	var radius = upside ? outer_radius : inner_radius;
	stack_radius = inner_radius;
	/* helper function */
	function d(x) {
		return upside ? +x : -x;
	}
	function k(x, h) {
		return draw_tick_circle(radius, 0.5 * Math.log(x) * I_LN10, 0, d(h));
	}
	function draw_partial(scale, font_base) {
		function t(x, h) {
			var y = scale * x;
			k(y, h);
			return y;
		}
		for (var x1 = 1; x1 <= 9; ++x1) {
			var x = t(x1, tick_scale(0));
			cc.font = tick_scale(font_base) + FONT;
			cc.fillText(x.toString(), CANVAS_SCALE, d(tick_scale(0)) - radius);
			for (var x2 = 0; x2 <= 9; ++x2) {
				var xx = x1 + .1 * x2;
				if (x2 > 0) {
					t(xx, tick_scale(x2 === 5 ? 1 : 2));
					if (x1 < 2) {
						cc.font = tick_scale(font_base + 1).toString() + FONT;
						cc.fillText(x2.toString(), CANVAS_SCALE, d(tick_scale(2)) - radius);
					}
				}
				if (x1 < 2 && x2 < 5)
					for (var x3 = 1; x3 <= 9; ++x3)
						t(xx + .01 * x3, tick_scale(x3 === 5 ? 3 : 4));
				else if (x1 < 3)
					for (var x3 = 1; x3 <= 4; ++x3)
						t(xx + .02 * x3, tick_scale(4));
				else if (x1 < 6)
					t(xx + .05, tick_scale(4));
			}
		}
	}
	/* legend */
	cursor_label.push(
		function () {
			cc.fillStyle = COLOUR_LABEL;
			cc.font = tick_scale(1) + FONT;
			cc.textBaseline = "middle";
			cc.textAlign = "left";
			return cc.fillText("x\u00B2", canvas_centre + CANVAS_SCALE, canvas_centre - radius + d(tick_scale(1)));
		}
	);
	/* circle */
	cc.strokeStyle = COLOUR_LINE;
	cc.fillStyle = COLOUR_FORWARD;
	cc.beginPath();
	cc.arc(canvas_centre, canvas_centre, radius, 0, PI2);
	cc.stroke();
	/* ticks and labels */
	cc.textBaseline = "middle";
	cc.textAlign = "left";
	cc.beginPath();
	draw_partial(1, 0);
	draw_partial(10, 1);
	cc.stroke();
	cc.setTransform(1, 0, 0, 1, 0, 0);
}

function draw_scale_cubic(upside) {
	/* radii */
	var outer_radius = stack_radius;
	var inner_radius = outer_radius - 1.5 * tick_scale(0);
	var radius = upside ? outer_radius : inner_radius;
	stack_radius = inner_radius;
	/* helper function */
	function d(x) {
		return upside ? +x : -x;
	}
	function k(x, h) {
		return draw_tick_circle(radius, Math.log(x) * I_LN10 / 3, 0, d(h));
	}
	function draw_partial(scale, font_base) {
		function t(x, h) {
			var y = scale * x;
			k(y, h);
			return y;
		}
		for (var x1 = 1; x1 <= 9; ++x1) {
			var x = t(x1, tick_scale(0));
			cc.font = tick_scale(font_base) + FONT;
			cc.fillText(x.toString(), CANVAS_SCALE, d(tick_scale(0)) - radius);
			for (var x2 = 0; x2 <= 9; ++x2) {
				var xx = x1 + .1 * x2;
				if (x2 > 0) {
					if (x1 < 7 || !(x2 & 1))
						t(xx, tick_scale(x2 === 5 ? 1 : 2));
					if (x1 < 2) {
						cc.font = tick_scale(font_base + 1).toString() + FONT;
						cc.fillText(x2.toString(), CANVAS_SCALE, d(tick_scale(2)) - radius);
					}
				}
				if (x1 < 2)
					for (var x3 = 1; x3 <= 4; ++x3)
						t(xx + .02 * x3, tick_scale(4));
				else if (x1 < 4)
					t(xx + .05, tick_scale(4));
			}
		}
	}
	/* legend */
	cursor_label.push(
		function () {
			cc.fillStyle = COLOUR_LABEL;
			cc.font = tick_scale(1) + FONT;
			cc.textBaseline = "middle";
			cc.textAlign = "left";
			return cc.fillText("x\u00B3", canvas_centre + CANVAS_SCALE, canvas_centre - radius + d(tick_scale(1)));
		}
	);
	/* circle */
	cc.strokeStyle = COLOUR_LINE;
	cc.fillStyle = COLOUR_FORWARD;
	cc.beginPath();
	cc.arc(canvas_centre, canvas_centre, radius, 0, PI2);
	cc.stroke();
	/* ticks and labels */
	cc.textBaseline = "middle";
	cc.textAlign = "left";
	cc.beginPath();
	draw_partial(1, 0);
	draw_partial(10, 1);
	draw_partial(100, 2);
	cc.stroke();
	cc.setTransform(1, 0, 0, 1, 0, 0);
}

function draw_scale_asin() {
	var line_height = 1.5 * tick_scale(0);
	var radius = stack_radius;
	stack_radius -= (SCALE_SIN_ROUNDS + 1) * line_height;
	/* subroutinues */
	function k(x, h) {
		return draw_tick_spiral(radius, line_height, Math.log(Math.sin(x * PI_180)) * I_LN10, h);
	}
	function draw_round(round, lower, upper) {
		for (var x1 = lower; x1 <= upper; ++x1) {
			var d = 10 / Math.pow(10, round);
			var x = d * x1;
			var y = k(x, tick_scale(0));
			cc.font = tick_scale(round) + FONT;
			cc.textAlign = "right";
			cc.fillStyle = COLOUR_BACKWARD;
			if (round <= 1)
				var t = (90 - x).toString();
			else
				var t = "89." + "9".repeat(round - 2) + (10 - x1).toString();
			cc.fillText(t, - CANVAS_SCALE, y + tick_scale(0));
			cc.textAlign = "left";
			cc.fillStyle = COLOUR_FORWARD;
			if (round <= 1)
				var t = x.toString();
			else
				var t = "0." + "0".repeat(round - 2) + x1.toString();
			cc.fillText(t, CANVAS_SCALE, y + tick_scale(0));
			for (var x2 = 0; x2 <= 9; ++x2) {
				var xx = x + .1 * d * x2;
				if (x2 > 0) {
					var y = k(xx, tick_scale(x2 === 5 ? 1 : 2));
					if (x1 < 2 && x2 <= 5) {
						cc.font = tick_scale(round + 1) + FONT;
						cc.textAlign = "right";
						cc.fillStyle = COLOUR_BACKWARD;
						if (round <= 1)
							var tt = (90 - xx).toString();
						else
							var tt = t + (10 - x2).toString();
						cc.fillText(tt, - CANVAS_SCALE, y + tick_scale(1));
						cc.textAlign = "left";
						cc.fillStyle = COLOUR_FORWARD;
						if (round <= 0)
							var tt = xx.toString();
						else if (round === 1)
							var tt = x.toString() + "." + x2.toString();
						else
							var tt = t + x2.toString();
						cc.fillText(tt, CANVAS_SCALE, y + tick_scale(1));
					}
				}
				if (x1 < 2)
					for (var x3 = 1; x3 <= 9; ++x3) {
						var xxx = xx + .01 * d * x3;
						k(xxx, tick_scale(x3 === 5 ? 3 : 4));
					}
				else if (x1 < 6)
					for (var x3 = 1; x3 <= 4; ++x3)
						k(xx + .02 * d * x3, tick_scale(4));
				else
					k(xx + .05 * d, tick_scale(4));
			}
		}
	}
	function draw_last_round() {
		for (var x1 = 5; x1 <= 9; ++x1) {
			var x = 10 * x1;
			var y = k(x, tick_scale(0));
			if (x1 !== 8) {
				cc.font = tick_scale(0) + FONT;
				cc.textAlign = "right";
				cc.fillStyle = COLOUR_BACKWARD;
				cc.fillText((90 - x).toString(), - CANVAS_SCALE, y + tick_scale(0));
				cc.textAlign = "left";
				cc.fillStyle = COLOUR_FORWARD;
				cc.fillText(x.toString(), CANVAS_SCALE, y + tick_scale(0));
			}
			if (x1 < 8)
				for (var x2 = 0; x2 < 10; ++x2) {
					var xx = x + x2;
					if (x2 > 0) k(xx, tick_scale(x2 === 5 ? 1 : 2));
				}
			else
				k(85, tick_scale(2));
		}
	}
	/* legend */
	cursor_label.push(
		function () {
			cc.fillStyle = COLOUR_LABEL;
			cc.font = tick_scale(1) + FONT;
			cc.textBaseline = "middle";
			cc.textAlign = "right";
			var y = canvas_centre - radius + SCALE_SIN_ROUNDS * line_height + tick_scale(1);
			cc.fillText("acos(x)", canvas_centre - CANVAS_SCALE, y);
			cc.textAlign = "left";
			var y = canvas_centre - radius + SCALE_SIN_ROUNDS * line_height + tick_scale(1);
			return cc.fillText("asin(x)", canvas_centre + CANVAS_SCALE, y);
		}
	);
	/* spiral */
	cc.beginPath();
	draw_spiral(
		radius, line_height,
		0, - Math.log(Math.sin(Math.pow(.1, SCALE_SIN_ROUNDS - 1) * 6 * PI_180)) * I_LN10,
		0.0078125
	);
	cc.stroke();
	/* ticks and labels */
	cc.strokeStyle = COLOUR_LINE;
	cc.textBaseline = "middle";
	cc.setTransform(1, 0, 0, 1, canvas_centre, canvas_centre);
	cc.beginPath();
	for (var r = 0; r <= SCALE_SIN_ROUNDS; ++r)
		if (r === 0) draw_round(0, 1, 4);
		else if (r === SCALE_SIN_ROUNDS) draw_round(r, 6, 9);
		else draw_round(r, 1, 9);
	draw_last_round();
	cc.stroke();
	return cc.setTransform(1, 0, 0, 1, 0, 0);
}

function draw_scale_pythagorean() {
	var line_height = 1.5 * tick_scale(0);
	var radius = stack_radius;
	function k(x, h) {
		return draw_tick_spiral(radius, line_height, Math.log(10 * Math.sqrt(1 - x*x)) * I_LN10 - 1, h);
	}
	/* legend */
	cursor_label.push(
		function () {
			cc.fillStyle = COLOUR_LABEL;
			cc.font = tick_scale(1) + FONT;
			cc.textBaseline = "middle";
			cc.textAlign = "right";
			var y = canvas_centre - radius + line_height + tick_scale(1);
			return cc.fillText("\u221A(1-x\u00B2)", canvas_centre - CANVAS_SCALE, y);
		}
	);
	/* spiral */
	cc.beginPath();
	draw_spiral(radius, line_height, 0, 1, 0.0078125);
	cc.stroke();
	/* ticks and labels */
	cc.strokeStyle = COLOUR_LINE;
	cc.fillStyle = COLOUR_BACKWARD;
	cc.textBaseline = "middle";
	cc.textAlign = "right";
	cc.setTransform(1, 0, 0, 1, canvas_centre, canvas_centre);
	cc.beginPath();
	for (var x1 = 0; x1 < 10; ++x1) {
		var x = .1 * x1;
		var y = k(x, tick_scale(0));
		if (x1 >= 3) {
			cc.font = tick_scale(0) + FONT;
			cc.fillText(x1.toString(), - CANVAS_SCALE, y + tick_scale(0));
		}
		if (x1 >= 9)
			for (var x2 = 0; x2 < 10; ++x2) {
				var xx = x + 0.01 * x2;
				if (x2 > 0) {
					var y = k(xx, tick_scale(0));
					cc.font = tick_scale(1) + FONT;
					cc.fillText(x1.toString() + x2.toString(), - CANVAS_SCALE, y + tick_scale(0));
				}
				if (x2 === 9)
					for (var x3 = 0; x3 <= 5; ++x3) {
						var xxx = xx + 0.001 * x3;
						if (x3 > 0) {
							var y = k(xxx, tick_scale(0));
							cc.font = tick_scale(2) + FONT;
							cc.fillText(x1.toString() + x2.toString() + x3.toString(), - CANVAS_SCALE, y + tick_scale(0));
						}
						if (x3 >= 5)
							continue;
						else if (x3 >= 3)
							for (var x4 = 0; x4 < 10; ++x4)
								k(xxx + 0.0001 * x4, tick_scale(x4 === 5 ? 1 : 2));
						else
							for (var x4 = 1; x4 <= 4; ++x4)
								k(xxx + 0.0002 * x4, tick_scale(2));
					}
				else if (x2 >= 8)
					for (var x3 = 0; x3 < 10; ++x3) {
						var xxx = xx + 0.001 * x3;
						if (x3 > 0)
							k(xxx, tick_scale(x3 === 5 ? 1 : 2));
						for (var x4 = 1; x4 <= 4; ++x4)
							k(xxx + 0.0002 * x4, tick_scale(4));
					}
				else if (x2 >= 7)
					for (var x3 = 0; x3 < 10; ++x3) {
						var xxx = xx + 0.001 * x3;
						if (x3 > 0)
							k(xxx, tick_scale(x3 === 5 ? 1 : 2));
						k(xxx + 0.0005, tick_scale(4));
					}
				else if (x2 >= 3)
					for (var x3 = 0; x3 < 10; ++x3) {
						var xxx = xx + 0.001 * x3;
						if (x3 > 0)
							k(xxx, tick_scale(x3 === 5 ? 1 : 2));
					}
				else
					for (var x3 = 1; x3 <= 4; ++x3)
						k(xx + 0.002 * x3, tick_scale(2));
			}
		else if (x1 >= 5)
			for (var x2 = 0; x2 < 10; ++x2) {
				var xx = x + 0.01 * x2;
				if (x2 > 0)
					k(xx, tick_scale(x2 === 5 ? 1 : 2));
				if (x1 >= 8 && x2 >= 5)
					for (var x3 = 1; x3 <= 4; ++x3)
						k(xx + 0.002 * x3, tick_scale(4));
				else if (x1 >= 7)
					k(xx + 0.005, tick_scale(4));
			}
		else if (x1 >= 2)
			for (var x2 = 1; x2 <= 4; ++x2)
				k(x + 0.02 * x2, tick_scale(2));
		else if (x1 >= 1)
			k(x + 0.05, tick_scale(2));
	}
	cc.stroke();
	return cc.setTransform(1, 0, 0, 1, 0, 0);
}

function draw_scale_exp() {
	var line_height = 1.5 * tick_scale(0);
	var radius = stack_radius;
	function k(x, h) {
		return draw_tick_spiral(radius, line_height, Math.log(Math.log(x)) * I_LN10 - 1, h);
	}
	function draw_round(scale, prefix) {
		for (var x1 = 9; x1 >= 1; --x1) {
			var xx1 = 1 + scale * x1;
			for (var x2 = 10; x2 >= 1; --x2) {
				var y = k(xx1 + scale * .1 * x2, tick_scale(x2 === 5 ? 1 : 2));
				if (x1 === 1 && x2 < 10) {
					cc.font = tick_scale(1) + FONT;
					cc.fillText(x2.toString(), CANVAS_SCALE, y + tick_scale(1));
				}
				if (x1 <= 1)
					for (var x3 = 1; x3 <= 9; ++x3)
						k(xx1 + scale * .1 * (x2 - .1 * x3), tick_scale(x3 === 5 ? 3 : 4));
				else if (x1 <= 3)
					for (var x3 = 1; x3 <= 4; ++x3)
						k(xx1 + scale * .1 * (x2 - .2 * x3), tick_scale(4));
				else if (x1 <= 7)
					k(xx1 + scale * .1 * (x2 - .5), tick_scale(4));
			}
			var y = k(xx1, tick_scale(0));
			cc.font = tick_scale(0) + FONT;
			cc.fillText(prefix + x1.toString(), CANVAS_SCALE, y + tick_scale(0));
		}
	}
	stack_radius -= (SCALE_EXP_ROUNDS + 1) * line_height;
	/* legend */
	cursor_label.push(
		function () {
			cc.fillStyle = COLOUR_LABEL;
			cc.font = tick_scale(1) + FONT;
			cc.textBaseline = "middle";
			cc.textAlign = "left";
			var y = canvas_centre - radius + SCALE_EXP_ROUNDS * line_height + tick_scale(1);
			return cc.fillText("exp(x)", canvas_centre + CANVAS_SCALE, y);
		}
	);
	/* spiral */
	cc.beginPath();
	draw_spiral(
		radius, line_height,
		Math.log(Math.log(20000)) * I_LN10 - 1,
		1 - Math.log(Math.log(1 + Math.pow(.1, SCALE_EXP_ROUNDS - 1))) * I_LN10,
		0.0078125
	);
	cc.stroke();
	/* ticks and labels */
	cc.strokeStyle = COLOUR_LINE;
	cc.fillStyle = COLOUR_FORWARD;
	cc.textBaseline = "middle";
	cc.textAlign = "left";
	cc.setTransform(1, 0, 0, 1, canvas_centre, canvas_centre);
	cc.beginPath();
	for (var x1m = 20; x1m >= 10; -- x1m) {
		var x1 = x1m * 1000;
		if (x1m === 10 || x1m === 20) {
			var y = k(x1, tick_scale(0));
			cc.font = tick_scale(0) + FONT;
			cc.fillText(x1m.toString() + "k", CANVAS_SCALE, y + tick_scale(0));
		} else {
			k(x1, tick_scale(x1m === 15 ? 1 : 2));
		}
	}
	for (var x1m = 9; x1m >= 1; --x1m) {
		var x1 = x1m * 1000;
		if (x1m < 2)
			for (var x2 = 1000; x2 >= 100; x2 -= 100)
				k(x1 + x2, tick_scale(x2 === 500 ? 1 : 2));
		else if (x1m < 5)
			for (var x2 = 400; x2 >= 100; x2 -= 100)
				k(x1 + 2 * x2, tick_scale(2));
		else
			k(x1 + 500, tick_scale(2));
		var y = k(x1, tick_scale(0));
		if (x1 <= 5000 && x1 !== 4000) {
			cc.font = tick_scale(0) + FONT;
			cc.fillText(x1m.toString() + "k", CANVAS_SCALE, y + tick_scale(0));
		}
	}
	for (var x1 = 900; x1 >= 100; x1 -= 100) {
		if (x1 < 300)
			for (var x2 = 100; x2 >= 10; x2 -= 10) {
				k(x1 + x2, tick_scale(x2 === 50 ? 1 : 2));
				if (x1 < 200)
					k(x1 + x2 - 5, tick_scale(4));
			}
		else if (x1 < 500)
			for (var x2 = 40; x2 >= 10; x2 -= 10) {
				k(x1 + 2 * x2, tick_scale(2));
			}
		else
			k(x1 + 50, tick_scale(2));
		var y = k(x1, tick_scale(0));
		if (x1 <= 500 && x1 !== 400) {
			cc.font = tick_scale(0) + FONT;
			cc.fillText(x1.toString(), CANVAS_SCALE, y + tick_scale(0));
		}
	}
	for (var x1 = 90; x1 >= 10; x1 -= 10) {
		if (x1 < 50) {
			for (var x2 = 10; x2 >= 1; --x2) {
				k(x1 + x2, tick_scale(x2 === 5 ? 1 : 2));
				if (x1 < 20)
					for (var x3 = 1; x3 <= 4; ++x3)
						k(x1 + x2 - .2 * x3, tick_scale(4));
				else if (x1 < 30)
					k(x1 + x2 - .5, tick_scale(4));
			}
		} else {
			for (var x2 = 4; x2 >= 1; --x2) {
				k(x1 + 2 * x2, tick_scale(2));
			}
		}
		var y = k(x1, tick_scale(0));
		if (x1 <= 50) {
			cc.font = tick_scale(0) + FONT;
			cc.fillText(x1.toString(), CANVAS_SCALE, y + tick_scale(0));
		}
	}
	for (var x1 = 9; x1 >= 2; --x1) {
		for (var x2 = 10; x2 >= 1; --x2) {
			var y = k(x1 + .1 * x2, tick_scale(x2 === 5 ? 1 : 2));
			if (x1 === 2 && x2 < 10) {
				cc.font = tick_scale(1) + FONT;
				cc.fillText(x2.toString(), CANVAS_SCALE, y + tick_scale(1));
			}
			if (x1 < 3 && x2 < 5)
				for (var x3 = 1; x3 <= 9; ++x3)
					k(x1 + .1 * (x2 - .1 * x3), tick_scale(x3 === 5 ? 3 : 4));
			else if (x1 < 4)
				for (var x3 = 1; x3 <= 4; ++x3)
					k(x1 + .1 * (x2 - .2 * x3), tick_scale(4));
			else if (x1 < 6)
				k(x1 + .1 * (x2 - .5), tick_scale(4));
		}
		var y = k(x1, tick_scale(0));
		cc.font = tick_scale(0) + FONT;
		cc.fillText(x1.toString(), CANVAS_SCALE, y + tick_scale(0));
	}
	for (var i = 1; i < SCALE_EXP_ROUNDS; ++i)
		draw_round(Math.pow(.1, i), "1." + "0".repeat(i - 1));
	cc.stroke();
	return cc.setTransform(1, 0, 0, 1, 0, 0);
}

function draw_scale_exp10() {
	var line_height = 1.5 * tick_scale(0);
	var radius = stack_radius;
	function k(x, h) {
		return draw_tick_spiral(radius, line_height, Math.log(Math.log(x) * I_LN10) * I_LN10, h);
	}
	stack_radius -= (SCALE_EXP_ROUNDS + 1) * line_height;
	/* legend */
	cursor_label.push(
		function () {
			cc.fillStyle = COLOUR_LABEL;
			cc.font = tick_scale(1) + FONT;
			cc.textBaseline = "middle";
			cc.textAlign = "left";
			var y = canvas_centre - radius + SCALE_EXP_ROUNDS * line_height + tick_scale(1);
			return cc.fillText("exp10(x)", canvas_centre + CANVAS_SCALE, y);
		}
	);
	/* spiral */
	cc.beginPath();
	draw_spiral(
		radius, line_height,
		0, - Math.log(Math.log(1 + 2 * Math.pow(.1, SCALE_EXP_ROUNDS)) * I_LN10) * I_LN10,
		0.0078125
	);
	cc.stroke();
	/* ticks and labels */
	cc.strokeStyle = COLOUR_LINE;
	cc.fillStyle = COLOUR_FORWARD;
	cc.textBaseline = "middle";
	cc.textAlign = "left";
	cc.setTransform(1, 0, 0, 1, canvas_centre, canvas_centre);
	cc.beginPath();
	var y = k(10, tick_scale(0));
	cc.font = tick_scale(0) + FONT;
	cc.fillText("10", CANVAS_SCALE, y + tick_scale(0));
	for (var x1 = 9; x1 >= 2; --x1) {
		for (var x2 = 10; x2 >= 1; --x2) {
			var y = k(x1 + .1 * x2, tick_scale(x2 === 5 ? 1 : 2));
			if (x1 === 2 && x2 < 10) {
				cc.font = tick_scale(2) + FONT;
				cc.fillText(x2.toString(), CANVAS_SCALE, y + tick_scale(2));
			}
			if (x1 < 3 && x2 < 5)
				for (var x3 = 1; x3 <= 9; ++x3)
					k(x1 + .1 * (x2 - .1 * x3), tick_scale(x3 === 5 ? 3 : 4));
			else if (x1 < 4)
				for (var x3 = 1; x3 <= 4; ++x3)
					k(x1 + .1 * (x2 - .2 * x3), tick_scale(4));
			else if (x1 < 6)
				k(x1 + .1 * (x2 - .5), tick_scale(4));
		}
		var y = k(x1, tick_scale(0));
		cc.font = tick_scale(0) + FONT;
		cc.fillText(x1.toString(), CANVAS_SCALE, y + tick_scale(0));
	}
	for (var round = 1; round <= SCALE_EXP_ROUNDS; ++round) {
		var scale = Math.pow(.1, round);
		var prefix = "1." + "0".repeat(round - 1);
		for (var x1 = 9; x1 >= (round === SCALE_EXP_ROUNDS ? 2 : 1); --x1) {
			var xx1 = 1 + scale * x1;
			for (var x2 = 10; x2 >= 1; --x2) {
				var y = k(xx1 + scale * .1 * x2, tick_scale(x2 === 5 ? 1 : 2));
				if (x1 === 1 && x2 < 10) {
					cc.font = tick_scale(1) + FONT;
					cc.fillText(x2.toString(), CANVAS_SCALE, y + tick_scale(2));
				}
				if (x1 >= 4)
					k(xx1 + scale * .1 * (x2 - .5), tick_scale(4));
				else if (x1 >= 2)
					for (var x3 = 1; x3 <= 4; ++x3)
						k(xx1 + scale * .1 * (x2 - .2 * x3), tick_scale(4));
				else
					for (var x3 = 1; x3 <= 9; ++x3)
						k(xx1 + scale * .1 * (x2 - .1 * x3), tick_scale(x3 === 5 ? 3 : 4));
			}
			var y = k(xx1, tick_scale(0));
			cc.font = tick_scale(0) + FONT;
			cc.fillText(prefix + x1.toString(), CANVAS_SCALE, y + tick_scale(0));
		}
	}
	cc.stroke();
	return cc.setTransform(1, 0, 0, 1, 0, 0);
}

function draw_outer() {
	/* Outer circle */
	//	cc.beginPath();
	//	cc.strokeStyle = "#888";
	//	cc.arc(canvas_centre, canvas_centre, canvas_centre, 0, PI2);
	//	cc.stroke();
	/* Contants */
	var line_height = 1.2 * tick_scale(0);
	var line_top = canvas_centre - line_height;
	cc.font = tick_scale(0) + FONT;
	cc.textBaseline = "alphabetic";
	cc.textAlign = "center";
	cc.fillStyle = COLOUR_LABEL;
	cc.fillText("e \u2248 2.7183", canvas_centre, line_top);
	cc.fillText("ln(10) = 1/log(e) \u2248 2.3026", canvas_centre, line_top + line_height);
	cc.fillText("\u03C0 \u2248 3.1416", canvas_centre, line_top + 2 * line_height);
	cc.fillText("\u03C0/180 \u2248 0.017453", canvas_centre, line_top + 3 * line_height);
	/* Scales */
	for (var i = 0; i < outer_scales.length; ++i)
		outer_scales[i](false);
	/* Image tag */
	outer_tag = document.createElement("img");
	outer_tag.id = "outer";
	outer_tag.src = canvas_tag.toDataURL();
	return main_tag.appendChild(outer_tag);
}

function draw_inner() {
	cc.clearRect(0, 0, canvas_tag.width, canvas_tag.height);
	for (var i = 0; i < inner_scales.length; ++i)
		inner_scales[i](true);
	inner_tag = document.createElement("img");
	inner_tag.id = "inner";
	inner_tag.src = canvas_tag.toDataURL();
	inner_tag.style.transform = "rotate(" + inner_angle.toString() + "rad)";
	return main_tag.appendChild(inner_tag);
}

function draw_cursor() {
	cc.clearRect(0, 0, canvas_tag.width, canvas_tag.height);
	cc.setTransform(1, 0, 0, 1, canvas_centre, canvas_centre);
	cc.beginPath();
	cc.fillStyle = COLOUR_CURSOR_BOARD;
	var r = .0625 * canvas_dimension;
	cc.moveTo(-r, 0);
	cc.arc(0, 0, canvas_centre, - PI_2 - CURSOR_WIDTH, - PI_2 + CURSOR_WIDTH);
	cc.arc(0, 0, r, 0, Math.PI);
	cc.closePath();
	cc.fill();
	cc.beginPath();
	cc.strokeStyle = COLOUR_CURSOR_LINE;
	cc.moveTo(0, 0);
	cc.lineTo(0, - canvas_centre);
	cc.stroke();
	cc.setTransform(1, 0, 0, 1, 0, 0);
	for (var i = 0; i < cursor_label.length; ++i)
		call(cursor_label[i]);
	cursor_tag = document.createElement("img");
	cursor_tag.id = "cursor";
	cursor_tag.src = canvas_tag.toDataURL();
	cursor_tag.style.transform = "rotate(" + cursor_angle.toString() + "rad)";
	return main_tag.appendChild(cursor_tag);
}

function draw() {
	main_dimension = Math.min(window.innerWidth, window.innerHeight) - 2;
	main_centre = main_dimension / 2;
	canvas_centre = Math.round(main_centre * CANVAS_SCALE);
	canvas_dimension = canvas_centre * 2;
	canvas_tag.width = canvas_dimension;
	canvas_tag.height = canvas_dimension;
	cursor_label = new Array;
	stack_radius = canvas_centre;
	cc.lineWidth = CANVAS_SCALE;
	draw_outer();
	slide_radius = stack_radius;
	draw_inner();
	draw_cursor();
	return cc.clearRect(0, 0, canvas_tag.width, canvas_tag.height);
}

function redraw() {
	main_tag.removeChild(cursor_tag);
	main_tag.removeChild(outer_tag);
	main_tag.removeChild(inner_tag);
	return draw();
}

call(
	function () {
		var mapping = new Map(
			[
				[
					"D / C,B,K,L,S,P",
					function () {
						outer_scales = [draw_scale_main];
						inner_scales = [
							draw_scale_main,
							draw_scale_square,
							draw_scale_cubic,
							draw_scale_log,
							draw_scale_asin,
							draw_scale_pythagorean
						];
					}
				],
				[
					"D / C,L,S",
					function () {
						outer_scales = [draw_scale_main];
						inner_scales = [draw_scale_main, draw_scale_log, draw_scale_asin];
					}
				],
				[
					"D / C,L,E",
					function () {
						outer_scales = [draw_scale_main];
						inner_scales = [draw_scale_main, draw_scale_log, draw_scale_exp];
					}
				],
				[
					"DI,L / L,C,LL",
					function () {
						outer_scales = [draw_scale_invert, draw_scale_log];
						inner_scales = [draw_scale_log, draw_scale_main, draw_scale_exp10];
					}
				]
			]
		);
		call(mapping.get("D / C,B,K,L,S,P")); /* default */
		for (var i = 0; i < type_tags.length; ++i) {
			var type_tag = type_tags[i];
			var f = mapping.get(type_tag.value);
			type_tag.addEventListener(
				"change",
				call(
					function (set_scales) {
						return function (event) {
							if (!event.target.checked) return;
							set_scales();
							redraw();
						};
					},
					null,
					f
				)
			);
			if (type_tag.checked) call(f);
		}
	}
);

window.addEventListener("resize", redraw);
draw();

var inner_drag = null;
var cursor_drag = null;

function pointerdown(event) {
	event.preventDefault();
	var x = event.pageX - main_centre;
	var y = event.pageY - main_centre;
	var a = Math.atan2(y, x);
	var d = Math.sqrt(x * x + y * y);
	if (CANVAS_SCALE * d <= slide_radius)
		inner_drag = a;
	else
		cursor_drag = a;
}

function pointer_angle(x, y) {
	return Math.atan2(y - main_centre, x - main_centre);
}

function pointermove(event) {
	if (inner_drag !== null) {
		event.preventDefault();
		var a = pointer_angle(event.pageX, event.pageY) - inner_drag;
		inner_tag.style.transform = "rotate(" + (inner_angle + a).toString() + "rad)";
	}
	if (cursor_drag !== null) {
		event.preventDefault();
		var a = pointer_angle(event.pageX, event.pageY) - cursor_drag;
		cursor_tag.style.transform = "rotate(" + (cursor_angle + a).toString() + "rad)";
	}
}

function pointerup(event) {
	if (inner_drag !== null) {
		event.preventDefault();
		inner_angle += pointer_angle(event.pageX, event.pageY) - inner_drag;
		inner_tag.style.transform = "rotate(" + inner_angle.toString() + "rad)";
		inner_drag = null;
	}
	if (cursor_drag !== null) {
		event.preventDefault();
		cursor_angle += pointer_angle(event.pageX, event.pageY) - cursor_drag;
		cursor_tag.style.transform = "rotate(" + cursor_angle.toString() + "rad)";
		cursor_drag = null;
	}
}

main_tag.addEventListener("pointerdown", pointerdown);
document.addEventListener("pointermove", pointermove);
document.addEventListener("pointerup", pointerup);

function prevent_default(event) {
	event.preventDefault();
	return false;
}

main_tag.addEventListener("mousedown", prevent_default);
document.addEventListener("mousemove", prevent_default);
document.addEventListener("mouseup", prevent_default);
main_tag.addEventListener("touchstart", prevent_default);
//	main_tag.addEventListener("touchmove", prevent_default);
//	main_tag.addEventListener("touchend", prevent_default);
//	main_tag.addEventListener("click", prevent_default);
//	main_tag.addEventListener("contextmenu", prevent_default);

void function () {
	window.addEventListener(
		"beforeinstallprompt",
		function beforeinstallprompt(event) {
			console.debug("beforeinstallprompt");
			var install_button = document.getElementById("install");
			install_button.hidden = false;
			var install_prompt = event;
			install_button.addEventListener(
				"click",
				function click() {
					install_button.hidden = true;
					this.removeEventListener("click", click);
					return install_prompt.prompt();
				}
			);
			install_button.parentElement.hidden = false;
		}
	);
	if ("serviceWorker" in navigator)
			navigator["serviceWorker"].register("service.js");
}();

});
