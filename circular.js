void function(f){
	if (document.readyState === "loading")
		document.addEventListener("DOMContentLoaded", f);
	else
		f();
}(function () {
"use strict";

var FONT = "px serif";
var CURSOR_WIDTH = .25;

function apply(func, thisArg, args) {
	return func.apply(thisArg, args);
}

function call(func, thisArg, ...args) {
	return apply(func, thisArg, args);
}

var main_tag = document.createElement("main");
document.body.appendChild(main_tag);
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

var main_dimension, main_centre;
var canvas_dimension, canvas_centre;
var outer_tag, inner_tag, cursor_tag;
var slide_radius;
var inner_angle = 0;
var cursor_angle = 0;

function tick_scale(n) {
	return Math.round(.0625 * main_dimension * Math.pow(.5, .5 * n));
}

var PI2LN10 = 2 * Math.PI / Math.LN10;

function draw_scale_log(upside, radius, colour) {
	function d(x) {
		return upside ? +x : -x;
	}
	function k(x, h) {
		cc.setTransform(1, 0, 0, 1, canvas_centre, canvas_centre);
		cc.rotate(PI2LN10 * Math.log(x));
		cc.moveTo(0, - radius);
		cc.lineTo(0, - radius + d(h));
	}
	cc.strokeStyle = colour;
	cc.textBaseline = "middle";
	cc.fillStyle = colour;
	cc.beginPath();
	cc.arc(canvas_centre, canvas_centre, radius, 0, 2 * Math.PI);
	cc.stroke();
	cc.beginPath();
	for (var x = 1; x <= 9; ++x) {
		k(x, tick_scale(0));
		cc.font = tick_scale(0) + FONT;
		cc.fillText(x.toString(), 2, - radius + d(tick_scale(0)));
		for (var x1 = 0; x1 <= 9; ++x1) {
			var xx1 = x + .1 * x1;
			if (x1 > 0) {
				k(xx1, x1 === 5 ? tick_scale(1) : tick_scale(2));
				if (x < 5) {
					cc.font = tick_scale(2).toString() + FONT;
					cc.fillText(x1.toString(), 2, - radius + d(tick_scale(2)));
				}
			}
			if (x < 2) {
				for (var x2 = 0; x2 <= 9; ++x2) {
					var xx1x2 = xx1 + .01 * x2;
					if (x2 > 0)
						k(xx1x2, x2 === 5 ? tick_scale(3) : tick_scale(4));
					if (x1 < 5)
						k(xx1x2 + .005, tick_scale(6));
				}
			} else if (x < 3) {
				for (var x2 = 1; x2 <= 9; ++x2)
					k(xx1 + .01 * x2, x2 === 5 ? tick_scale(3) : tick_scale(4));
			} else if (x < 6) {
				for (var x2 = 1; x2 <= 4; ++x2)
					k(xx1 + .02 * x2, tick_scale(4));
			} else {
				k(xx1 + .05, tick_scale(4));
			}
		}
	}
	cc.stroke();
	cc.setTransform(1, 0, 0, 1, 0, 0);
}

function draw_outer() {
	cc.fillStyle = "#FFF";
	cc.fillRect(0, 0, canvas_dimension, canvas_dimension);
	//	cc.beginPath();
	//	cc.strokeStyle = "#CCC";
	//	cc.arc(canvas_centre, canvas_centre, canvas_centre, 0, Math.PI * 2);
	//	cc.stroke();
	slide_radius = canvas_centre - 1.5 * tick_scale(0);
	draw_scale_log(false, slide_radius, "#008");
	outer_tag = document.createElement("img");
	outer_tag.id = "outer";
	outer_tag.src = canvas_tag.toDataURL();
	return main_tag.appendChild(outer_tag);
}

function draw_inner() {
	cc.clearRect(0, 0, canvas_tag.width, canvas_tag.height);
	draw_scale_log(true, slide_radius, "#008");
	inner_tag = document.createElement("img");
	inner_tag.id = "inner";
	inner_tag.src = canvas_tag.toDataURL();
	inner_tag.style.rotate = inner_angle.toString() + "rad";
	return main_tag.appendChild(inner_tag);
}

function draw_cursor() {
	cc.clearRect(0, 0, canvas_tag.width, canvas_tag.height);
	cc.beginPath();
	cc.fillStyle = "#CCC4";
	cc.moveTo(canvas_centre, canvas_centre);
	cc.arc(canvas_centre, canvas_centre, canvas_centre, -CURSOR_WIDTH, +CURSOR_WIDTH);
	cc.closePath();
	cc.fill();
	cc.beginPath();
	cc.strokeStyle = "#0008";
	cc.moveTo(canvas_centre, canvas_centre);
	cc.lineTo(canvas_dimension, canvas_centre);
	cc.stroke();
	cursor_tag = document.createElement("img");
	cursor_tag.id = "cursor";
	cursor_tag.src = canvas_tag.toDataURL();
	cursor_tag.style.rotate = cursor_angle.toString() + "rad";
	return main_tag.appendChild(cursor_tag);
}

var inner_drag = null;
var cursor_drag = null;

function pointer_angle(x, y) {
	return Math.atan2(y - main_centre, x - main_centre);
}

function pointerdown(event) {
	event.preventDefault();
	var a = pointer_angle(event.pageX, event.pageY);
	if (Math.abs(a - cursor_angle) < CURSOR_WIDTH)
		cursor_drag = a;
	else
		inner_drag = a;
}

function draw() {
	main_dimension = Math.min(window.innerWidth, window.innerHeight) - 2;
	main_centre = main_dimension / 2;
	canvas_centre = main_dimension;
	canvas_dimension = canvas_centre * 2;
	canvas_tag.width = canvas_dimension;
	canvas_tag.height = canvas_dimension;
	draw_outer();
	draw_inner();
	draw_cursor();
	cursor_tag.addEventListener("pointerdown", pointerdown);
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

function pointermove(event) {
	if (inner_drag !== null) {
		event.preventDefault();
		var a = pointer_angle(event.pageX, event.pageY) - inner_drag;
		inner_tag.style.rotate = (inner_angle + a).toString() + "rad";
	}
	if (cursor_drag !== null) {
		event.preventDefault();
		var a = pointer_angle(event.pageX, event.pageY) - cursor_drag;
		cursor_tag.style.rotate = (cursor_angle + a).toString() + "rad";
	}
}

function pointerup(event) {
	if (inner_drag !== null) {
		event.preventDefault();
		inner_angle += pointer_angle(event.pageX, event.pageY) - inner_drag;
		inner_tag.style.rotate = inner_angle.toString() + "rad";
		inner_drag = null;
	}
	if (cursor_drag !== null) {
		event.preventDefault();
		cursor_angle += pointer_angle(event.pageX, event.pageY) - cursor_drag;
		cursor_tag.style.rotate = cursor_angle.toString() + "rad";
		cursor_drag = null;
	}
}

document.addEventListener("pointermove", pointermove);
document.addEventListener("pointerup", pointerup);

});
