'use strict';

self.addEventListener(
	'fetch',
	function (event) {
		event.respondWith(
			caches.match(event.request).then(
				function (response) {
					if (response) {
						return Promise.resolve(response);
					}
					else {
						return fetch(event.request).then(
							function (response) {
								if (response.ok)
									return caches.open('sliderule').then(
										function (cache) {
											return cache.put(event.request, response).then(
												function () {
													return Promise.resolve(response);
												}
											);
										}
									)
								else
									return Promise.resolve(response);
							}
						);
					}
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
