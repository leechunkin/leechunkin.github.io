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
									return caches.open('circular').then(
										function (cache) {
											return cache.put(event.request, response).then(
												function () {
													return Promise.resolve(response);
												}
											);
										}
									);
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
			caches.open('circular').then(
				function (cache) {
					return cache.addAll(
						[
							'circular.xhtml',
							'circular.css',
							'circular.js',
							'circular.128.png',
							'circular.192.png',
							'circular.256.png',
							'service.js'
						]
					);
				}
			)
		);
	}
);
