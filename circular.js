void function(f){
	if (document.readyState === "loading")
		document.addEventListener("DOMContentLoaded", f);
	else
		f();
}(function () {
"use strict";

var FONT = "px serif";
var CURSOR_WIDTH = .25;
var COLOUR_BACKGROUND = "#FFF";
var COLOUR_FORWARD = "#008";
var COLOUR_BACKWARD = "#800";
var COLOUR_LABEL = "#080";
var CANVAS_SCALE = .5 * (Math.sqrt(5) + 1);
var SCALE_EXP_ROUNDS = 3;
var TICK_SCALE_CONSTANT = .03125 * CANVAS_SCALE;

function apply(func, thisArg, args) {
	return func.apply(thisArg, args);
}

function call(func, thisArg, ...args) {
	return apply(func, thisArg, args);
}

var main_tag = document.getElementsByTagName("main").item(0);
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
var outer_tag, inner_tag, cursor_tag;
var cursor_label;
var stack_radius;
var slide_radius;
var inner_angle = 0;
var cursor_angle = 0;

function tick_scale(n) {
	var v = tick_scale.memoize.get(n);
	if (typeof value === "undefined") {
		var v = Math.round(TICK_SCALE_CONSTANT * main_dimension * Math.pow(.5, .5 * n));
		tick_scale.memoize.set(n, v);
	}
	return v;
}

tick_scale.memoize = new Map;

var PI2 = 2 * Math.PI;
var PI_2 = .5 * Math.PI;
var I_LN10 = 1 / Math.LN10;
var PI2_LN10 = PI2 * I_LN10;

function draw_tick_circle(r, x, h) {
	cc.setTransform(1, 0, 0, 1, canvas_centre, canvas_centre);
	cc.rotate(PI2 * x);
	cc.moveTo(0, - r);
	return cc.lineTo(0, - r + h);
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
		return draw_tick_circle(radius, Math.log(x) * I_LN10, d(h));
	}
	/* legend */
	cursor_label.push(
		function () {
			cc.fillStyle = COLOUR_LABEL;
			cc.font = tick_scale(1) + FONT;
			cc.textBaseline = "middle";
			cc.textAlign = "right";
			return cc.fillText("x", canvas_centre - CANVAS_SCALE, canvas_centre - radius + d(tick_scale(1)));
		}
	);
	/* circle */
	cc.strokeStyle = COLOUR_FORWARD;
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
					cc.font = tick_scale(2).toString() + FONT;
					cc.fillText(x1.toString(), CANVAS_SCALE, d(tick_scale(2)) - radius);
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
	k(Math.PI, tick_scale(0));
	cc.font = tick_scale(1) + FONT;
	cc.fillText("\u03c0", CANVAS_SCALE, d(tick_scale(1)) - radius);
	k(Math.E, tick_scale(0));
	cc.fillText("e", CANVAS_SCALE, d(tick_scale(1)) - radius);
	cc.stroke();
	cc.setTransform(1, 0, 0, 1, 0, 0);
}

function draw_scale_exp10() {
	var line_height = 1.5 * tick_scale(0);
	var radius = stack_radius;
	var axis_points = new Array;
	function k(x, h) {
		var ll = Math.log(Math.log(x) * I_LN10) * I_LN10;
		axis_points.push(ll);
		return draw_tick_spiral(radius, line_height, ll, h);
	}
	stack_radius -= (SCALE_EXP_ROUNDS + 1) * line_height;
	/* legend */
	cursor_label.push(
		function () {
			cc.fillStyle = COLOUR_LABEL;
			cc.font = tick_scale(1) + FONT;
			cc.textBaseline = "middle";
			cc.textAlign = "right";
			var y = canvas_centre - radius + SCALE_EXP_ROUNDS * line_height + tick_scale(1);
			return cc.fillText("exp10(x)", canvas_centre - CANVAS_SCALE, y);
		}
	);
	/* ticks and labels */
	cc.strokeStyle = COLOUR_FORWARD;
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
					cc.font = tick_scale(round + 1) + FONT;
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
			cc.font = tick_scale(round) + FONT;
			cc.fillText(prefix + x1.toString(), CANVAS_SCALE, y + tick_scale(0));
		}
	}
	cc.stroke();
	cc.beginPath();
	cc.setTransform(1, 0, 0, 1, canvas_centre, canvas_centre);
	cc.rotate(PI2_LN10 * Math.log(Math.log(20000)));
	cc.moveTo(0, - radius);
	for (var i = 0; i < axis_points.length; ++i) {
		var ll = axis_points[i];
		cc.setTransform(1, 0, 0, 1, canvas_centre, canvas_centre);
		cc.rotate(PI2 * ll);
		cc.lineTo(0, - radius - ll * line_height);
	}
	cc.stroke();
	return cc.setTransform(1, 0, 0, 1, 0, 0);
}

function draw_scale_exp() {
	var line_height = 1.5 * tick_scale(0);
	var radius = stack_radius;
	var axis_points = new Array;
	function k(x, h) {
		var ll = Math.log(Math.log(x)) * I_LN10 - 1;
		axis_points.push(ll);
		return draw_tick_spiral(radius, line_height, ll, h);
	}
	function draw_round(scale, prefix, font_size) {
		for (var x1 = 9; x1 >= 1; --x1) {
			var xx1 = 1 + scale * x1;
			for (var x2 = 10; x2 >= 1; --x2) {
				var y = k(xx1 + scale * .1 * x2, tick_scale(x2 === 5 ? 1 : 2));
				if (x1 === 1 && x2 < 10) {
					cc.font = tick_scale(font_size + 1) + FONT;
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
			cc.font = tick_scale(font_size) + FONT;
			cc.fillText(prefix + x1.toString(), CANVAS_SCALE, y + tick_scale(0));
		}
	}
	stack_radius -= (SCALE_EXP_ROUNDS + 2) * line_height;
	/* legend */
	cursor_label.push(
		function () {
			cc.fillStyle = COLOUR_LABEL;
			cc.font = tick_scale(1) + FONT;
			cc.textBaseline = "middle";
			cc.textAlign = "right";
			var y = canvas_centre - radius + (SCALE_EXP_ROUNDS + 1) * line_height + tick_scale(1);
			return cc.fillText("exp(x)", canvas_centre - CANVAS_SCALE, y);
		}
	);
	/* ticks and labels */
	cc.strokeStyle = COLOUR_FORWARD;
	cc.fillStyle = COLOUR_FORWARD;
	cc.textBaseline = "middle";
	cc.textAlign = "left";
	cc.setTransform(1, 0, 0, 1, canvas_centre, canvas_centre);
	cc.beginPath();
	for (var x1m = 20; x1m >= 10; -- x1m) {
		var x1 = x1m * 1000;
		if (x1m === 10 || x1m === 20) {
			var y = k(x1, tick_scale(0));
			cc.font = tick_scale(1) + FONT;
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
			cc.font = tick_scale(1) + FONT;
			cc.fillText(x1m.toString() + "k", CANVAS_SCALE, y + tick_scale(0));
		}
	}
	for (var x1 = 900; x1 >= 100; x1 -= 100) {
		if (x1 <= 200)
			for (var x2 = 100; x2 >= 10; x2 -= 10) {
				k(x1 + x2, tick_scale(x2 === 50 ? 1 : 2));
				if (x1 <= 100)
					k(x1 + x2 - 5, tick_scale(4));
			}
		else if (x1 <= 500)
			for (var x2 = 40; x2 >= 10; x2 -= 10) {
				k(x1 + 2 * x2, tick_scale(2));
			}
		else
			k(x1 + 50, tick_scale(2));
		var y = k(x1, tick_scale(0));
		if (x1 <= 500 && x1 !== 400) {
			cc.font = tick_scale(1) + FONT;
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
			cc.font = tick_scale(1) + FONT;
			cc.fillText(x1.toString(), CANVAS_SCALE, y + tick_scale(0));
		}
	}
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
		cc.font = tick_scale(1) + FONT;
		cc.fillText(x1.toString(), CANVAS_SCALE, y + tick_scale(0));
	}
	for (var i = 1; i <= SCALE_EXP_ROUNDS; ++i)
		draw_round(Math.pow(.1, i), "1." + "0".repeat(i - 1), i);
	cc.stroke();
	cc.beginPath();
	cc.setTransform(1, 0, 0, 1, canvas_centre, canvas_centre);
	cc.rotate(PI2_LN10 * Math.log(Math.log(20000)));
	cc.moveTo(0, - radius);
	for (var i = 0; i < axis_points.length; ++i) {
		var ll = axis_points[i];
		cc.setTransform(1, 0, 0, 1, canvas_centre, canvas_centre);
		cc.rotate(PI2 * ll);
		cc.lineTo(0, - radius - ll * line_height);
	}
	cc.stroke();
	return cc.setTransform(1, 0, 0, 1, 0, 0);
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
		return draw_tick_circle(radius, x, d(h));
	}
	/* legend */
	cursor_label.push(
		function () {
			cc.fillStyle = COLOUR_LABEL;
			cc.font = tick_scale(1) + FONT;
			cc.textBaseline = "middle";
			cc.textAlign = "right";
			return cc.fillText("log(x)", canvas_centre - CANVAS_SCALE, canvas_centre - radius + d(tick_scale(1)));
		}
	);
	/* circle */
	cc.strokeStyle = COLOUR_FORWARD;
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
	k(.1 * Math.PI, tick_scale(0));
	cc.font = tick_scale(1) + FONT;
	cc.fillText("\u03c0", CANVAS_SCALE, d(tick_scale(1)) - radius);
	k(.1 * Math.E, tick_scale(0));
	cc.fillText("e", CANVAS_SCALE, d(tick_scale(1)) - radius);
	cc.stroke();
	cc.setTransform(1, 0, 0, 1, 0, 0);
}

function draw_outer() {
	cc.fillStyle = COLOUR_BACKGROUND;
	cc.fillRect(0, 0, canvas_dimension, canvas_dimension);
	cc.beginPath();
	cc.strokeStyle = "#888";
	cc.arc(canvas_centre, canvas_centre, canvas_centre, 0, PI2);
	cc.stroke();
	draw_scale_main(false);
	outer_tag = document.createElement("img");
	outer_tag.id = "outer";
	outer_tag.src = canvas_tag.toDataURL();
	return main_tag.appendChild(outer_tag);
}

function draw_inner() {
	cc.clearRect(0, 0, canvas_tag.width, canvas_tag.height);
	draw_scale_main(true);
	draw_scale_log(true);
	draw_scale_exp10();
	inner_tag = document.createElement("img");
	inner_tag.id = "inner";
	inner_tag.src = canvas_tag.toDataURL();
	inner_tag.style.rotate = inner_angle.toString() + "rad";
	return main_tag.appendChild(inner_tag);
}

function draw_cursor() {
	cc.clearRect(0, 0, canvas_tag.width, canvas_tag.height);
	cc.setTransform(1, 0, 0, 1, canvas_centre, canvas_centre);
	cc.beginPath();
	cc.fillStyle = "#CCC4";
	var r = .0625 * canvas_dimension;
	cc.moveTo(-r, 0);
	cc.arc(0, 0, canvas_centre, - PI_2 - CURSOR_WIDTH, - PI_2 + CURSOR_WIDTH);
	cc.arc(0, 0, r, 0, Math.PI);
	cc.closePath();
	cc.fill();
	cc.beginPath();
	cc.strokeStyle = "#0008";
	cc.moveTo(0, 0);
	cc.lineTo(0, - canvas_centre);
	cc.stroke();
	cc.setTransform(1, 0, 0, 1, 0, 0);
	for (var i = 0; i < cursor_label.length; ++i)
		call(cursor_label[i]);
	cursor_tag = document.createElement("img");
	cursor_tag.id = "cursor";
	cursor_tag.src = canvas_tag.toDataURL();
	cursor_tag.style.rotate = cursor_angle.toString() + "rad";
	return main_tag.appendChild(cursor_tag);
}

function draw() {
	main_dimension = Math.min(window.innerWidth, window.innerHeight) - 2;
	main_centre = main_dimension / 2;
	canvas_centre = main_centre * CANVAS_SCALE;
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

function resize() {
	main_tag.removeChild(cursor_tag);
	main_tag.removeChild(outer_tag);
	main_tag.removeChild(inner_tag);
	return draw();
}

window.addEventListener("resize", resize);
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

});
