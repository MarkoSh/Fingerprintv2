// Fingerprintv2.0.5

declare const chrome: any;

class fingerPrintBackgroundClass {
	userAgent: string = '';
	constructor() {
		const $this = this;

		if ( chrome.permissions ) { // It is background

			$this.listener();

			return;
		}

		if ( chrome.extension ) { // It is content

			new fingerPrintContentClass();

			return;
		}

		// It is injected
		new fingerPrintInjectClass();
	}

	listener() {
		const $this = this;

		chrome.runtime.onInstalled.addListener( () => {
			chrome.contextMenus.create( {
				id		: 'fingerprint',
				title	: 'Fingerprint'
			} );
			{
				chrome.contextMenus.create( {
					parentId: 'fingerprint',
					id		: 'exportFingerprint',
					title	: 'Export to clipboard'
				} );
				chrome.contextMenus.create( {
					parentId: 'fingerprint',
					id		: 'exportFingerprintToFile',
					title	: 'Export to file'
				} );
				chrome.contextMenus.create( {
					parentId: 'fingerprint',
					id		: 'separator',
					title	: 'Separator',
					type	: 'separator'
				} );
				chrome.contextMenus.create( {
					parentId: 'fingerprint',
					id		: 'importFingerprint',
					title	: 'Import from clipboard'
				} );
				chrome.contextMenus.create( {
					parentId: 'fingerprint',
					id		: 'importFingerprintFromFile',
					title	: 'Import from file'
				} );
				chrome.contextMenus.create( {
					parentId: 'fingerprint',
					id		: 'separator1',
					title	: 'Separator',
					type	: 'separator'
				} );
				chrome.contextMenus.create( {
					parentId: 'fingerprint',
					id		: 'clear',
					title	: 'Clear User-Agent override'
				} );
			}
		} );

		chrome.contextMenus.onClicked.addListener( async ( info, tab ) => {
			if ( 'exportFingerprint' === info.menuItemId || 'exportFingerprintToFile' === info.menuItemId ) {
				const cookies 	= await chrome.cookies.getAll( {
					url: tab.url
				} );

				chrome.tabs.sendMessage( tab.id, {
					fingerprint: {
						userAgent: $this.userAgent,
						_export	: cookies,
						file	: 'exportFingerprintToFile' === info.menuItemId
					}
				} );
			};
			if ( 'importFingerprint' === info.menuItemId || 'importFingerprintFromFile' === info.menuItemId ) {
				chrome.tabs.sendMessage( tab.id, {
					fingerprint: {
						_import	: true,
						file	: 'importFingerprintFromFile' === info.menuItemId
					}
				} );
			};
			if ( 'clear' === info.menuItemId ) {
				const currentRules 		= await chrome.declarativeNetRequest.getDynamicRules();

				const removeRuleIds 	= currentRules.map( rule => rule.id );

				await chrome.declarativeNetRequest.updateDynamicRules( {
					removeRuleIds,
				} );

				await chrome.storage.local.clear();
				chrome.tabs.sendMessage( tab.id, {
					fingerprint: {
						clear	: true,
					}
				} );
			};
		} );

		chrome.runtime.onMessage.addListener( async ( request, sender, sendResponse ) => {
			const res = async () => {
				if ( request.getUserAgent ) {
					return {
						status		: true,
						userAgent	: $this.userAgent
					}
				}
				if ( request.userAgent ) {
					if ( navigator.userAgent !== request.userAgent ) {
						const url 	= new URL( sender.origin );
						const host 	= url.host;

						let storage = await chrome.storage.local.get();

						if ( ! storage.UA ) {
							await chrome.storage.local.set( {
								UA: {}
							} );

							storage = await chrome.storage.local.get();
						}

						if ( ! storage.UA[ host ] ) {
							storage.UA[ host ] 	= request.userAgent;
							storage = await chrome.storage.local.set( {
								UA: storage.UA
							} );
						}

						const currentRules 		= await chrome.declarativeNetRequest.getDynamicRules();

						const removeRuleIds 	= currentRules.map( rule => rule.id );

						const addRules 			= [ {
							id: 1,
							priority: 1,
							action: {
								type: 'modifyHeaders',
								requestHeaders: [ {
									header		: 'User-Agent',
									operation	: chrome.declarativeNetRequest.HeaderOperation.SET,
									value		: request.userAgent
								} ]
							},
							condition: {
								// urlFilter: host,
								resourceTypes: [
									"main_frame",
									"sub_frame",
									"stylesheet",
									"script",
									"image",
									"font",
									"object",
									"xmlhttprequest",
									"ping",
									"csp_report"
								]
							}
						} ];

						await chrome.declarativeNetRequest.updateDynamicRules( {
							removeRuleIds,
							addRules
						} );
					}
				}
				if ( request.cookies ) {
					request.cookies.map( async ( cookie ) => {
						delete cookie.hostOnly;
						delete cookie.session;
						cookie.url = sender.tab.url;
						try {
							await chrome.cookies.set( cookie ); // Работает в контексте обычного браузера, не затрагивая режим инкогнито, так что не пытайтесь перенести отпечаток в инкогнито, не сработает
						} catch ( error ) {}
					} );
				}
				return {
					status: true
				};
			}
			sendResponse( res() );
			return true;
		} );

		chrome.webRequest.onSendHeaders.addListener( details => {
			const requestHeaders 	= details.requestHeaders;

			const userAgentHeader 		= requestHeaders.find( header => 'User-Agent' == header.name );

			if ( userAgentHeader ) {
				$this.userAgent = userAgentHeader.value;
			}
		}, {
			urls: [ '<all_urls>' ]
		}, [
			'requestHeaders',
			'extraHeaders'
		] );
	}
}

class fingerPrintContentClass {
	userAgent: any;

	constructor() {
		const $this = this;

		$this.getUserAgent();

		$this.listener();
	}

	getUserAgent() {
		const $this = this;

		$this.injector();

		chrome.runtime.sendMessage( chrome.runtime.id, {
			getUserAgent: true
		}, response => {
			if ( chrome.runtime.lastError ) {
				console.log( 'getUserAgent', response );
			} else {
				$this.userAgent = response.userAgent;
			}
		} );
	}

	injector() {
		const $this = this;

		const el = document.querySelector( `#fingerprint` );
		if ( ! el ) {
			const s = document.createElement( 'script' );
			s.id 	= 'fingerprint';
			s.src	= chrome.runtime.getURL( 'main.js' );

			const root = document.querySelector( 'html' );

			if ( root ) {
				root.appendChild( s );
			}
		}
	}

	listener() {
		const $this = this;

		window.onmessage = e => {
			if ( e.data.fingerprint ) {
				window.dispatchEvent( new CustomEvent( 'fingerprint', {
					detail: $this.userAgent
				} ) );
			}
		};

		chrome.runtime.onMessage.addListener( async ( request, sender, sendResponse ) => {
			if ( request.fingerprint ) {
				const { _import, _export, clear, userAgent } = request.fingerprint;

				if ( _import ) {
					let clipboard 	= await navigator.clipboard.readText();

					if ( request.fingerprint.file ) {
						const handles: any[] = await window[ 'showOpenFilePicker' ]( {
							suggestedName: `${ +new Date }_fingerprint.json`,
							types: [
								{
								  description: 'Fingerprint json',
								  accept: {
									'application/json': [ '.json' ]
								  }
								},
							]
						} );

						const fileHandle = handles.shift();

						const file = await fileHandle.getFile();

						clipboard = await file.text();
					}

					const fingerPrint 	= JSON.parse( clipboard );

					const {
						userAgent,
						localStorage,
						sessionStorage,
						cookies
					} = fingerPrint;

					if ( localStorage ) {
						Object.keys( localStorage ).map( key => {
							const data = localStorage[ key ];

							window.localStorage.setItem( key, data );
						} );
					}
					if ( sessionStorage ) {
						Object.keys( sessionStorage ).map( key => {
							const data = sessionStorage[ key ];

							window.sessionStorage.setItem( key, data );
						} );
					}
					if ( cookies ) {
						await new Promise( ( resolve, reject ) => {
							chrome.runtime.sendMessage( chrome.runtime.id, {
								cookies
							}, response => {
								resolve( response );
							} );
						} );
					}

					if ( userAgent ) {
						await new Promise( ( resolve, reject ) => {
							chrome.runtime.sendMessage( chrome.runtime.id, {
								userAgent
							}, response => {
								resolve( response );
							} );
						} );
					}

					$this.notify( "Fingerprint imported" );

					setTimeout( () => {
						location.reload();
					}, 1 * 1000 );
				}
				if ( _export ) {
					const fingerPrint = {
						userAgent,
						localStorage,
						sessionStorage,
						cookies: _export
					};

					const str = JSON.stringify( fingerPrint );

					if ( request.fingerprint.file ) {
						const fileHandle = await window[ 'showSaveFilePicker' ]( {
							suggestedName: `${ +new Date }_${ window.location.host }_fingerprint.json`,
							types: [
								{
									description: 'Fingerprint json',
									accept: {
										'application/json': [ '.json' ]
									}
								},
							]
						} );

						const writable = await fileHandle.createWritable();

						await writable.write( str );

						await writable.close();

						$this.notify( "Fingerprint stored to file" );

						return;
					}

					await navigator.clipboard.writeText( str );

					$this.notify( "Fingerprint copied in clipboard" );
				}
				if ( clear ) {
					$this.notify( "User-Agent cleared" );
				}
			}
			sendResponse( { status: true } );
			return true;
		} );
	}

	notify( text ) {
		const $this = this;

		if ( ! ( "Notification" in window ) ) {
			// Check if the browser supports notifications
			alert( "This browser does not support desktop notification" );
		} else if ( Notification.permission === "granted" ) {
			// Check whether notification permissions have already been granted;
			// if so, create a notification
			const notification = new Notification( text );
			// …
		} else if ( Notification.permission !== "denied" ) {
			// We need to ask the user for permission
			Notification.requestPermission().then( ( permission ) => {
				// If the user accepts, let's create a notification
				if ( permission === "granted" ) {
					const notification = new Notification( text );
					// …
				}
			} );
		}
	}
}

class fingerPrintInjectClass {
	constructor() {
		const $this = this;

		window.postMessage( {
			fingerprint: true
		} );

		$this.listener();
	}

	listener() {
		const $this = this;

		window.addEventListener( 'fingerprint', e => {
			$this.setUserAgent( window, e[ 'detail' ] );
		} );
	}

	setUserAgent( window, userAgent ) {
		// Works on Firefox, Chrome, Opera and IE9+
		if ( navigator[ '__defineGetter__' ] ) {
			navigator[ '__defineGetter__' ](' userAgent', function () {
				return userAgent;
			});
		} else if (Object.defineProperty) {
			Object.defineProperty(navigator, 'userAgent', {
				get: function () {
					return userAgent;
				}
			});
		}
		// Works on Safari
		if ( window.navigator.userAgent !== userAgent ) {
			var userAgentProp = {
				get: function () {
					return userAgent;
				}
			};
			try {
				Object.defineProperty( window.navigator, 'userAgent', userAgentProp );
			} catch ( e ) {
				window.navigator = Object.create(navigator, {
					userAgent: userAgentProp
				});
			}
		}
	}
}

new fingerPrintBackgroundClass();