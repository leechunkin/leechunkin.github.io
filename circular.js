void function(f){
	if (document.readyState === "loading")
		document.addEventListener("DOMContentLoaded", f);
	else
		f();
}(function () {
"use strict";

var FONT = "px serif";
var TICK = [32, 24, 16, 12, 8, 4];

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
main_tag.appendChild(canvas_tag);
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

var dimension, centre;
var outer_tag, inner_tag, cursor_tag;
var slide_radius;

var PI2LN10 = 2 * Math.PI / Math.LN10;

function draw_scale_log(upside, radius, colour) {
	function d(x) {
		return upside ? +x : -x;
	}
	function k(x, h) {
		cc.setTransform(1, 0, 0, 1, centre, centre);
		cc.rotate(PI2LN10 * Math.log(x));
		cc.moveTo(0, - radius);
		cc.lineTo(0, - radius + d(h));
	}
	cc.strokeStyle = colour;
	cc.lineWidth = .5;
	cc.textBaseline = "middle";
	cc.fillStyle = colour;
	cc.beginPath();
	cc.arc(centre, centre, radius, 0, 2 * Math.PI);
	cc.stroke();
	cc.beginPath();
	for (var x = 1; x <= 9; ++x) {
		k(x, TICK[0]);
		cc.font = TICK[0] + FONT;
		cc.fillText(x.toString(), 1, - radius + d(TICK[0]));
		for (var x1 = 0; x1 <= 9; ++x1) {
			if (x1 > 0) {
				k(x + .1 * x1, x1 === 5 ? TICK[1] : TICK[2]);
				if (x <= 2) {
					cc.font = (0.5 * TICK[1]).toString() + FONT;
					cc.fillText(x.toString() + x1.toString(), 1, - radius + d(TICK[1]));
				}
			}
			if (x < 2) {
				for (var x2 = 0; x2 <= 9; ++x2) {
					if (x2 > 0)
						k(x + .1 * x1 + .01 * x2, x2 === 5 ? TICK[3] : TICK[4]);
					if (x1 < 5)
						k(x + .1 * x1 + .01 * x2 + .005, TICK[5]);
				}
			} else if (x < 3) {
				for (var x2 = 1; x2 <= 9; ++x2)
					k(x + .1 * x1 + .01 * x2, x2 === 5 ? TICK[3] : TICK[4]);
			} else if (x < 6) {
				for (var x2 = 1; x2 <= 4; ++x2)
					k(x + .1 * x1 + .02 * x2, TICK[4]);
			} else {
				k(x + .1 * x1 + .05, TICK[4]);
			}
		}
	}
	cc.stroke();
	cc.setTransform(1, 0, 0, 1, 0, 0);
}

function draw_outer() {
	cc.beginPath();
	cc.strokeStyle = "#CCC";
	cc.arc(centre, centre, centre, 0, Math.PI * 2);
	cc.stroke();
	slide_radius = centre - 1.5 * TICK[0];
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
	return main_tag.appendChild(inner_tag);
}

function draw_cursor() {
	cc.clearRect(0, 0, canvas_tag.width, canvas_tag.height);
	cc.beginPath();
	cc.fillStyle = "#CCC4";
	cc.moveTo(centre, centre);
	cc.arc(centre, centre, centre, -.25, +.25);
	cc.closePath();
	cc.fill();
	cc.beginPath();
	cc.strokeStyle = "#0008";
	cc.moveTo(centre, centre);
	cc.lineTo(dimension, centre);
	cc.lineWidth = .5;
	cc.stroke();
	cursor_tag = document.createElement("img");
	cursor_tag.id = "cursor";
	cursor_tag.src = canvas_tag.toDataURL();
	return main_tag.appendChild(cursor_tag);
}

function draw() {
	dimension = Math.min(window.innerWidth, window.innerHeight) - 2;
	centre = dimension / 2;
	canvas_tag.width = dimension;
	canvas_tag.height = dimension;
	draw_outer();
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
return draw();

});
