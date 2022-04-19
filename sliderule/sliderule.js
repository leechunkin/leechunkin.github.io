void function(f){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',f);else f();}(function () {
'use restrict';

var canvas = document.getElementById('CANVAS');
var canvas_width, canvas_height;
var marker_scale = .75;
var marker_colour = ['red', 'black', 'green', 'blue'];
var rule_scale = .8;
var slide_element = document.getElementById('SLIDE');
var slide_y, slide_height;
var slide_shift = 0;
var slide_drag = null;
var frame_element = document.getElementById('FRAME');
var frame_y, frame_height;
var frame_shift = 0;
var frame_drag = null;
var font_scale = .75;
var font_size, font_height;
var drag_factor = .5;
var draw_timer = null;
var touch_last;


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
	var shift = on_slide ? slide_shift : frame_shift;
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
					if (v > -canvas_width && v <= canvas_width) {
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
									fill: marker_colour[level % marker_colour.length]
								},
								label
							)
						);
					}
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
					if (v > -canvas_width && v <= canvas_width) {
						element.appendChild(
							$('line', {
								x1: v, y1: i === 5 ? y3 : y1,
								x2: v, y2: i === 5 ? y4 : y2,
								stroke: marker_colour[level % marker_colour.length]
							})
						);
					}
				}
				var vv = dv * (Math.log10(x1 + (i + 1) * dx) - l1) + v1;
				draw_minor(label, level + 1, v, vv, x, dx * .1);
			}
		}
		else if (v2 - v1 > 20) {
			for (var i = 2; i < 10; i += 2) {
				var x = x1 + i * dx;
				var v = dv * (Math.log10(x) - l1) + v1;
				if (v > -canvas_width && v <= canvas_width) {
					element.appendChild(
						$('line', {
							x1: v, y1: y1,
							x2: v, y2: y2,
							stroke: marker_colour[level % marker_colour.length]
						})
					);
				}
			}
		}
		else if (v2 - v1 > 8) {
			var x = x1 + 5. * dx;
			var v = dv * (Math.log10(x) - l1) + v1;
			if (v > -canvas_width && v <= canvas_width) {
				element.appendChild(
					$('line', {
						x1: v, y1: y1,
						x2: v, y2: y2,
						stroke: marker_colour[level % marker_colour.length]
					})
				);
			}
		}
	}
	function draw_major(v1) {
		var y1 = on_slide ? (1. - marker_scale) * height : 0;
		var y2 = on_slide ? height : marker_scale * height;
		for (var x = 1; x < 10; ++x) {
			var v = v1 + Math.log10(x) * canvas_width * rule_scale;
			if (v > -canvas_width && v <= canvas_width) {
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
							'font-size': font_size * font_scale,
							fill: 'black'
						},
						x.toString()
					)
				);
			}
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

function draw_buttons() {
	function zoom_in_click(event) {
		event.stopPropagation();
		zoom(2.);
	}
	function zoom_out_click(event) {
		event.stopPropagation();
		zoom(.5);
	}
	var zoom_in_button =
		$('rect', {
			x: canvas_width - 150, y: canvas_height - 100,
			width: 150, height: 100,
			fill: 'orange'
		});
	var zoom_out_button =
		$('rect', {
			x: 0, y: canvas_height - 100,
			width: 150, height: 100,
			fill: 'cyan'
		});
	var zoom_in_text =
		$(
			'text',
			{
				x: canvas_width - 75, y: canvas_height - 38,
				'text-anchor': 'middle',
				'font-size': 20,
				fill: 'black'
			},
			'Zoom In'
		);
	var zoom_out_text =
		$(
			'text',
			{
				x: 75, y: canvas_height - 38,
				'text-anchor': 'middle',
				'font-size': 20,
				fill: 'black'
			},
			'Zoom Out'
		);
	zoom_in_button.addEventListener('pointerdown', zoom_in_click);
	zoom_out_button.addEventListener('pointerdown', zoom_out_click);
	zoom_in_text.addEventListener('pointerdown', zoom_in_click);
	zoom_out_text.addEventListener('pointerdown', zoom_out_click);
	canvas.appendChild(zoom_in_button);
	canvas.appendChild(zoom_out_button);
	canvas.appendChild(zoom_in_text);
	canvas.appendChild(zoom_out_text);
}

function draw_canvas() {
	clear(canvas);
	canvas.appendChild(
		$(
			'text',
			{
				x: .5 * canvas_width,
				y: 20,
				'font-size': 20,
				fill: 'white',
				'text-anchor': 'middle'
			},
			//	canvas_width.toString()
			'SLIDE RULE'
		)
	);
	draw_buttons();
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

function zoom(factor) {
	if (rule_scale < 64 && factor > 1 || rule_scale > 0.15 && factor < 1) {
		rule_scale *= factor;
		slide_shift *= factor;
		frame_shift *= factor;
		schedule_redraw();
	}
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

function drag_start(event) {
	if (event.clientY < frame_y)
		slide_drag = event.clientX;
	else
		frame_drag = event.clientX;
}

function drag_move(event) {
	if (slide_drag !== null) {
		slide_element.setAttribute('x', drag_factor * (event.clientX - slide_drag));
	}
	else if (frame_drag !== null) {
		var x = drag_factor * (event.clientX - frame_drag);
		slide_element.setAttribute('x', x);
		frame_element.setAttribute('x', x);
	}
}

function drag_stop(event) {
	if (slide_drag !== null) {
		var w = canvas_width * rule_scale;
		slide_shift += drag_factor * (event.clientX - slide_drag);
		slide_shift -= Math.floor(slide_shift / w) * w;
		slide_drag = null;
		schedule_redraw();
	}
	if (frame_drag !== null) {
		var w = canvas_width * rule_scale;
		var d = drag_factor * (event.clientX - frame_drag);
		slide_shift += d;
		slide_shift -= Math.floor(slide_shift / w) * w;
		frame_shift += d;
		frame_shift -= Math.floor(frame_shift / w) * w;
		frame_drag = null;
		schedule_redraw();
	}
}

window.addEventListener('resize', resize);
window.addEventListener('pointerdown', drag_start);
window.addEventListener('pointermove', drag_move);
window.addEventListener('pointerup', drag_stop);

window.addEventListener(
	'touchstart',
	function touchstart(event) {
		if (event.touches.length <= 0) return;
		event.preventDefault();
		touch_last = event.touches.item(0);
		drag_start(touch_last);
	}
);

window.addEventListener(
	'touchmove',
	function touchmove(event) {
		if (event.touches.length <= 0 || !touch_last) return;
		event.preventDefault();
		touch_last = event.touches.item(0);
		drag_move(touch_last);
	}
);

window.addEventListener(
	'touchend',
	function touchend(event) {
		if (!touch_last) return;
		event.preventDefault();
		drag_stop(touch_last);
	}
);

void (
	function run() {
		resize();
	}()
);

});
