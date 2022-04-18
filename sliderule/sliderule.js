void function(f){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',f);else f();}(function () {
'use restrict';

var canvas = document.getElementById('CANVAS');
var canvas_width, canvas_height;
var marker_scale = .75;
var marker_colour = ['red', 'black', 'green', 'blue'];
var rule_scale = .8;
var slide_element = document.getElementById('SLIDE');
var slide_drag_factor = .5;
var slide_y, slide_height;
var slide_shift = 0;
var slide_drag = null;
var frame_element = document.getElementById('FRAME');
var frame_y, frame_height;
var font_scale = .75;
var font_size, font_height;
var draw_timer = null;

function clear(element) {
	element.textContent = null;
}

function $(tag, attributes, ...children) {
	var element = document.createElementNS(document.documentElement.namespaceURI, tag);
	if (attributes != void undefined)
		for (var name in attributes)
			element.setAttribute(name, attributes[name]);
	element.append(children);
	return element;
}

function draw_rule(on_slide) {
	var element = on_slide ? slide_element : frame_element;
	var shift = on_slide ? slide_shift : 0;
	var height = on_slide ? slide_height : frame_height;
	function draw_minor(prefix, level, v1, v2, x1, dx) {
		var l1 = Math.log10(x1);
		var l2 = Math.log10(x1 + 10 * dx);
		var dv = (v2 - v1) / (l2 - l1);
		var y1 = on_slide ? (1. - Math.pow(marker_scale, level)) * height : 0;
		var y2 = on_slide ? height : Math.pow(marker_scale, level) * height;
		var font_scale_here = Math.pow(font_scale, level);
		var font_height_here = font_height * font_scale_here;
		var font_size_here = font_size * font_scale_here;
		if (v2 - v1 > font_size_here * 20) {
			for (var i = 0; i < 10; ++i) {
				var x = x1 + i * dx;
				var v = dv * (Math.log10(x) - l1) + v1;
				var label = prefix + i.toString();
				if (i > 0) {
					element.appendChild(
						$('line', {
							x1: v, y1: y1,
							x2: v, y2: y2,
							stroke: marker_colour[level % marker_colour.length]
						})
					);
					element.appendChild(
						$(
							'text',
							{
								x: v, y: on_slide ? y1 : y2 + font_height_here,
								'font-size': font_size_here,
								stroke: marker_colour[level % marker_colour.length]
							},
							label
						)
					);
				}
				var vv = dv * (Math.log10(x1 + (i + 1) * dx) - l1) + v1;
				draw_minor(label, level + 1, v, vv, x, dx * .1);
			}
		}
		else if (v2 - v1 > 40) {
			var y3 = on_slide ? (1. - Math.pow(marker_scale, level - .5)) * height : 0;
			var y4 = on_slide ? height : Math.pow(marker_scale, level - .5) * height;
			for (var i = 0; i < 10; ++i) {
				var x = x1 + i * dx;
				var v = dv * (Math.log10(x) - l1) + v1;
				if (i > 0) {
					element.appendChild(
						$('line', {
							x1: v, y1: i === 5 ? y3 : y1,
							x2: v, y2: i === 5 ? y4 : y2,
							stroke: marker_colour[level % marker_colour.length]
						})
					);
				}
				var vv = dv * (Math.log10(x1 + (i + 1) * dx) - l1) + v1;
				draw_minor(label, level + 1, v, vv, x, dx * .1);
			}
		}
		else if (v2 - v1 > 20) {
			for (var i = 2; i < 10; i += 2) {
				var x = x1 + i * dx;
				var v = dv * (Math.log10(x) - l1) + v1;
				element.appendChild(
					$('line', {
						x1: v, y1: y1,
						x2: v, y2: y2,
						stroke: marker_colour[level % marker_colour.length]
					})
				);
			}
		}
		else if (v2 - v1 > 8) {
			var x = x1 + 5. * dx;
			var v = dv * (Math.log10(x) - l1) + v1;
			element.appendChild(
				$('line', {
					x1: v, y1: y1,
					x2: v, y2: y2,
					stroke: marker_colour[level % marker_colour.length]
				})
			);
		}
	}
	function draw_major(v1) {
		var y1 = on_slide ? (1. - marker_scale) * height : 0;
		var y2 = on_slide ? height : marker_scale * height;
		for (var x = 1; x < 10; ++x) {
			var v = v1 + Math.log10(x) * canvas_width * rule_scale;
			element.appendChild(
				$('line', {
					x1: v, y1: y1,
					x2: v, y2: y2,
					stroke: 'black'
				})
			);
			element.appendChild(
				$(
					'text',
					{
						x: v, y: on_slide ? y1 : y2 + font_height * font_scale,
						'font-size': font_size * font_scale
					},
					x.toString()
				)
			);
			var vv = v1 + Math.log10(x + 1) * canvas_width * rule_scale;
			draw_minor(x.toString(), 2, v, vv, x, 0.1);
		}
	}
	void (
		function draw() {
			var w = canvas_width * rule_scale;
			var N = Math.ceil(1. / rule_scale) + 1;
			var l1 = Math.ceil((shift + .5 * canvas_width) / w);
			for (var i = 0; i < N; ++i) draw_major(shift + w * (i - l1) + .5 * canvas_width * (1. - rule_scale));
		}()
	);
}

function draw_slide() {
	slide_element.appendChild(
		$('rect', {
			x: 0, y: 0,
			width: canvas_width, height: slide_height,
			fill: 'white'
		})
	);
	canvas.appendChild(slide_element);
	draw_rule(true);
}

function draw_frame() {
	frame_element.appendChild(
		$('rect', {
			x: 0, y: 0,
			width: canvas_width, height: frame_height,
			fill: 'white'
		})
	);
	canvas.appendChild(frame_element);
	draw_rule(false);
}

function draw_canvas() {
	clear(canvas);
	slide_element =
		$('svg', {
			y: slide_y,
			height: slide_height
		});
	frame_element =
		$('svg', {
			y: frame_y,
			height: frame_height
		});
	draw_slide();
	draw_frame();
	draw_timer = null;
}

function schedule_redraw() {
	if (draw_timer === null)
		draw_timer =
			setTimeout(
				function redraw() {
					draw_timer = null;
					return draw_canvas();
				}
			);
}

function resize() {
	canvas_width = document.documentElement.clientWidth;
	canvas_height = document.documentElement.clientHeight;
	slide_y = .42 * canvas_height;
	slide_height = .08 * canvas_height;
	frame_y = slide_y + slide_height;
	frame_height = .08 * canvas_height;
	font_size = Math.min(0.03125 * canvas_width, 0.03125 * canvas_height);
	font_height = font_size * 0.80;
	schedule_redraw();
}

window.addEventListener('resize', resize);

window.addEventListener(
	'pointerdown',
	function mousedown(event) {
		slide_drag = event.clientX;
	}
);

window.addEventListener(
	'pointerup',
	function mouseup(event) {
		var w = canvas_width * rule_scale;
		slide_shift += slide_drag_factor * (event.clientX - slide_drag);
		slide_shift -= Math.floor(slide_shift / w) * w;
		slide_drag = null;
		schedule_redraw();
	}
);

window.addEventListener(
	'pointermove',
	function mousedowm(event) {
		if (slide_drag !== null) {
			slide_element.setAttribute('x', slide_drag_factor * (event.clientX - slide_drag));
		}
	}
);

void (
	function run() {
		resize();
	}()
);

});
