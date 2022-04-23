'use strict';

self.addEventListener(
	'fetch',
	function (event) {
		event.responseWith(
			caches.match(event.request).then(
				function (response) {
					if (response) return response;
					else return fetch(event.request);
				}
			)
		);
	}
);

self.addEventListener(
	'install',
	function (event) {
		return event.waitUntil(
			caches.open('sliderule').then(
				function (cache) {
					return cache.addAll(
						[
							'sliderule.svg',
							'sliderule.js',
							'favicon.ico',
							'pwa.js'
						]
					);
				}
			)
		);
	}
);
