void function(f){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',f);else f();}(function () {
'use restrict';

var canvas = document.getElementById('CANVAS');
var canvas_width, canvas_height;
var button_height = 64;
var marker_scale = 2./3.;
var marker_colour = ['red', 'black', 'green', 'blue'];
var rule_scale = .8;
var slide_element = document.getElementById('SLIDE');
var slide_y;
var slide_height = 64;
var slide_shift = 0;
var slide_drag = null;
var frame_element = document.getElementById('FRAME');
var frame_y;
var frame_height = 64;
var frame_shift = 0;
var frame_drag = null;
var font_scale = .75;
var font_size = 32;
var font_height = 24;
var cursor1_element = document.getElementById('CURSOR1');
var cursor2_element = document.getElementById('CURSOR2');
var cursor1_x = document.documentElement.clientWidth * (1 - rule_scale) * .5;
var cursor2_x = document.documentElement.clientWidth * ((1 - rule_scale) * .5 + rule_scale);
var cursor1_drag = null;
var cursor2_drag = null;
var cursor_margin = 64;
var drag_factor = 1.;
var draw_timer = null;
var touch_last;

function clear(element) {
	element.textContent = null;
}

function $(tag, attributes, ...children) {
	var element = document.createElementNS(document.documentElement.namespaceURI, tag);
	if (typeof attributes !== 'undefined')
		for (var name in attributes)
			element.setAttribute(name, attributes[name]);
	element.append(children);
	return element;
}

function draw_rule(on_slide) {
	var element = on_slide ? slide_element : frame_element;
	var shift = on_slide ? slide_shift : frame_shift;
	var height = on_slide ? slide_height : frame_height;
	var canvas_left = -2. * font_size;
	function draw_minor(prefix, level, v1, v2, x1, dx) {
		var l1 = Math.log10(x1);
		var l2 = Math.log10(x1 + 10 * dx);
		var dv = (v2 - v1) / (l2 - l1);
		var y1 = on_slide ? (1. - Math.pow(marker_scale, level)) * height : 0;
		var y2 = on_slide ? height : Math.pow(marker_scale, level) * height;
		var colour = marker_colour[level % marker_colour.length];
		var font_scale_here = Math.pow(font_scale, level);
		var font_size_here = font_size * font_scale_here;
		if (v2 - v1 > font_size_here * 25) {
			var label_y = on_slide ? y1 : y2 + font_height * font_scale_here;
			for (var i = 0; i < 10; ++i) {
				var x = x1 + i * dx;
				var v = dv * (Math.log10(x) - l1) + v1;
				var vv = dv * (Math.log10(x1 + (i + 1) * dx) - l1) + v1;
				var label = prefix + i.toString();
				if (i > 0) {
					if (v <= canvas_width && vv >= canvas_left) {
						element.appendChild(
							$('line', {
								x1: v, y1: y1,
								x2: v, y2: y2,
								stroke: colour
							})
						);
						element.appendChild(
							$(
								'text',
								{
									x: v, y: label_y,
									'font-size': font_size_here,
									fill: colour
								},
								label
							)
						);
					}
				}
				draw_minor(label, level + 1, v, vv, x, dx * .1);
			}
		}
		else if (v2 - v1 > 40) {
			var y3 = on_slide ? (1. - Math.pow(marker_scale, level - .5)) * height : 0;
			var y4 = on_slide ? height : Math.pow(marker_scale, level - .5) * height;
			var v = dv * (Math.log10(x1) - l1) + v1;
			for (var i = 0; i < 10; ++i) {
				var x = x1 + i * dx;
				var vv = dv * (Math.log10(x1 + (i + 1) * dx) - l1) + v1;
				if (i > 0) {
					if (v <= canvas_width && vv >= 0) {
						element.appendChild(
							$('line', {
								x1: v, y1: i === 5 ? y3 : y1,
								x2: v, y2: i === 5 ? y4 : y2,
								stroke: colour
							})
						);
					}
				}
				draw_minor(label, level + 1, v, vv, x, dx * .1);
				v = vv;
			}
		}
		else if (v2 - v1 > 20) {
			for (var i = 2; i < 10; i += 2) {
				var x = x1 + i * dx;
				var v = dv * (Math.log10(x) - l1) + v1;
				if (v >= 0 && v <= canvas_width) {
					element.appendChild(
						$('line', {
							x1: v, y1: y1,
							x2: v, y2: y2,
							stroke: colour
						})
					);
				}
			}
		}
		else if (v2 - v1 > 8) {
			var x = x1 + 5. * dx;
			var v = dv * (Math.log10(x) - l1) + v1;
			if (v >= 0 && v <= canvas_width) {
				element.appendChild(
					$('line', {
						x1: v, y1: y1,
						x2: v, y2: y2,
						stroke: colour
					})
				);
			}
		}
	}
	function draw_major(v1) {
		var y1 = on_slide ? (1. - marker_scale) * height : 0;
		var y2 = on_slide ? height : marker_scale * height;
		var v = v1;
		for (var x = 1; x < 10; ++x) {
			var vv = v1 + Math.log10(x + 1) * canvas_width * rule_scale;
			if (v <= canvas_width && vv >= canvas_left) {
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
				draw_minor(x.toString(), 2, v, vv, x, 0.1);
			}
			v = vv;
		}
	}
	void (
		function draw() {
			var w = canvas_width * rule_scale;
			var N = Math.ceil(1. / rule_scale) + 1;
			var h = Math.ceil((.5 * canvas_width + shift) / w - .5);
			var d = shift + .5 * canvas_width - w * (h + .5)
			for (var i = 0; i < N; ++i) draw_major(w * i + d);
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
	function drag_decrease_click(event) {
		event.stopPropagation();
		drag_factor = Math.max(.25, drag_factor * .5);
		schedule_redraw();
	}
	function drag_increase_click(event) {
		event.stopPropagation();
		drag_factor = Math.min(4., drag_factor * 2.);
		schedule_redraw();
	}
	var zoom_in_button =
		$('rect', {
			x: canvas_width - 150, y: canvas_height - button_height,
			width: 150, height: button_height,
			rx: 16, ry: 16,
			fill: 'orange'
		});
	var zoom_out_button =
		$('rect', {
			x: 0, y: canvas_height - button_height,
			width: 150, height: button_height,
			rx: 16, ry: 16,
			fill: 'cyan'
		});
	var drag_decrease_button =
		$('rect', {
			x: .5 * canvas_width - 150, y: canvas_height - button_height,
			width: 150, height: button_height,
			rx: 16, ry: 16,
			fill: 'darkgray'
		});
	var drag_increase_button =
		$('rect', {
			x: .5 * canvas_width, y: canvas_height - button_height,
			width: 150, height: button_height,
			rx: 16, ry: 16,
			fill: 'lightgray'
		});
	var zoom_in_text =
		$(
			'text',
			{
				x: canvas_width - 75, y: canvas_height - .5 * button_height + 10,
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
				x: 75, y: canvas_height - .5 * button_height + 10,
				'text-anchor': 'middle',
				'font-size': 20,
				fill: 'black'
			},
			'Zoom Out'
		);
	var drag_text =
		$(
			'text',
			{
				x: .5 * canvas_width, y: canvas_height - .5 * button_height + 10,
				'text-anchor': 'middle',
				'font-size': 20,
				fill: 'black'
			},
			'\u2193 Drag factor \xD7' + drag_factor + ' \u2191'
		);
	zoom_in_button.addEventListener('pointerdown', zoom_in_click);
	zoom_out_button.addEventListener('pointerdown', zoom_out_click);
	zoom_in_text.addEventListener('pointerdown', zoom_in_click);
	zoom_out_text.addEventListener('pointerdown', zoom_out_click);
	drag_decrease_button.addEventListener('pointerdown', drag_decrease_click);
	drag_increase_button.addEventListener('pointerdown', drag_increase_click);
	canvas.appendChild(zoom_in_button);
	canvas.appendChild(zoom_out_button);
	canvas.appendChild(drag_decrease_button);
	canvas.appendChild(drag_increase_button);
	canvas.appendChild(zoom_in_text);
	canvas.appendChild(zoom_out_text);
	canvas.appendChild(drag_text);
}

function draw_cursor() {
	cursor1_element.setAttribute('x', 0);
	cursor1_element.setAttribute('y', slide_y - cursor_margin);
	cursor1_element.setAttribute('width', cursor1_x);
	cursor1_element.setAttribute('height', slide_height + frame_height + 2 * cursor_margin);
	cursor1_element.setAttribute('fill', '#C0C0C0');
	cursor1_element.setAttribute('opacity', '.5');
	cursor2_element.setAttribute('x', cursor2_x);
	cursor2_element.setAttribute('y', slide_y - cursor_margin);
	cursor2_element.setAttribute('width', canvas_width - cursor2_x);
	cursor2_element.setAttribute('height', slide_height + frame_height + 2 * cursor_margin);
	cursor2_element.setAttribute('fill', '#C0C0C0');
	cursor2_element.setAttribute('opacity', '.5');
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
			'SLIDE RULE'
		)
	);
	draw_buttons();
	slide_element = $('svg', {y: slide_y, height: slide_height});
	frame_element = $('svg', {y: frame_y, height: frame_height});
	cursor1_element = $('rect');
	cursor2_element = $('rect');
	canvas.appendChild(slide_element);
	canvas.appendChild(frame_element);
	canvas.appendChild(cursor1_element);
	canvas.appendChild(cursor2_element);
	draw_slide();
	draw_frame();
	draw_cursor();
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
	var scale = Math.min(409.6, Math.max(0.4, rule_scale * factor));
	var real_factor = scale / rule_scale;
	var centre = .5 * canvas_width;
	rule_scale = scale;
	slide_shift *= real_factor;
	frame_shift *= real_factor;
	cursor1_x = centre - (centre - cursor1_x) * real_factor;
	cursor2_x = centre - (centre - cursor2_x) * real_factor;
	schedule_redraw();
}

function resize() {
	canvas_width = document.documentElement.clientWidth;
	canvas_height = document.documentElement.clientHeight;
	slide_y = .5 * (canvas_height - button_height) - slide_height;
	frame_y = slide_y + slide_height;
	document.documentElement.setAttribute('width', canvas_width);
	document.documentElement.setAttribute('height', canvas_height);
	schedule_redraw();
}

function move_cursor1(x) {
	cursor1_element.setAttribute('width', x);
}

function move_cursor2(x) {
	cursor2_element.setAttribute('x', x);
	cursor2_element.setAttribute('width', canvas_width - x);
}

window.addEventListener('resize', resize);

window.addEventListener(
	'pointerdown',
	function pointerdown(event) {
		var y = event.clientY;
		if (y < slide_y - cursor_margin) {
			cursor2_drag = event.clientX;
			move_cursor2(event.clientX);
		} else if (y < frame_y) {
			slide_drag = event.clientX;
		} else if (y < frame_y + frame_height + cursor_margin) {
			frame_drag = event.clientX;
		} else if (y < canvas_height - button_height) {
			cursor1_drag = event.clientX;
			move_cursor1(event.clientX);
		}
	}
);

window.addEventListener(
	'pointermove',
	function pointermove(event) {
		if (cursor2_drag !== null) {
			move_cursor2(event.clientX);
		} else if (slide_drag !== null) {
			var x = drag_factor * (event.clientX - slide_drag);
			slide_element.setAttribute('x', x);
		} else if (frame_drag !== null) {
			var x = drag_factor * (event.clientX - frame_drag);
			slide_element.setAttribute('x', x);
			frame_element.setAttribute('x', x);
		} else if (cursor1_drag !== null) {
			move_cursor1(event.clientX);
		}
	}
);

window.addEventListener(
	'pointerup',
	function pointerup(event) {
		if (slide_drag !== null) {
			var w = canvas_width * rule_scale;
			var d = drag_factor * (event.clientX - slide_drag);
			slide_shift += d;
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
			cursor1_x += d;
			cursor2_x += d;
			schedule_redraw();
		}
		if (cursor1_drag !== null) {
			cursor1_x = event.clientX;
			cursor1_drag = null;
			schedule_redraw();
		}
		if (cursor2_drag !== null) {
			cursor2_x = event.clientX;
			cursor2_drag = null;
			schedule_redraw();
		}
	}
);

window.addEventListener(
	'pointercancel',
	function pointercancel(event) {
		schedule_redraw();
	}
);

window.addEventListener(
	'wheel',
	function wheel(event) {
		if (event.deltaY < 0.)
			zoom(2.);
		else if (event.deltaY > 0.)
			zoom(.5);
	}
);

void (
	function run() {
		resize();
	}()
);

});
