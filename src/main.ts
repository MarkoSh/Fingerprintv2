// Fingerprint 2.0.0

declare const chrome: any;

class fingerPrintBackgroundClass {
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
			}
		} );

		chrome.contextMenus.onClicked.addListener( async ( info, tab ) => {
			if ( 'exportFingerprint' === info.menuItemId || 'exportFingerprintToFile' === info.menuItemId ) {
				const url 		= new URL( tab.url );
				const cookies 	= await chrome.cookies.getAll( {
					domain: url.hostname
				} );

				chrome.tabs.sendMessage( tab.id, {
					fingerprint: {
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
		} );

		chrome.runtime.onMessage.addListener( async ( request, sender, sendResponse ) => {
			if ( request.cookies ) {
				request.cookies.map( async ( cookie ) => {
					delete cookie.hostOnly;
					delete cookie.session;
					cookie.url = sender.tab.url;
					try {
						await chrome.cookies.set( cookie ); // Работает в контексте обычного браузера, не затрагивая режим инкогнито, так что не пытайтесь перенести отпечаток в инкогнито, не сработает
					} catch ( error ) {}
				} );
				sendResponse( {
					status: true
				} );
			}
		} );
	}
}

class fingerPrintContentClass {
	constructor() {
		const $this = this;

		$this.listener();
	}

	listener() {
		const $this = this;

		window.onmessage = e => {
			if ( e.data.fingerprint ) {
				// TODO
			}
		};

		chrome.runtime.onMessage.addListener( async ( request, sender, sendResponse ) => {
			if ( request.fingerprint ) {
				const { _import, _export } = request.fingerprint;

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
						// cookies.map( cookie => {
						// 	const { name, value, path } 	= cookie;

						// 	document.cookie = `${ name }=${ value }; path=${ path }`;
						// } );
						await new Promise( ( resolve, reject ) => {
							chrome.runtime.sendMessage( chrome.runtime.id, {
								cookies
							}, response => {
								resolve( response );
							} );
						} );
					}

					$this.notify( "Fingerprint imported" );
				}
				if ( _export ) {
					const userAgent = navigator.userAgent;

					const fingerPrint = {
						userAgent,
						localStorage,
						sessionStorage,
						cookies: _export
					};

					const str = JSON.stringify( fingerPrint );

					if ( request.fingerprint.file ) {
						const fileHandle = await window[ 'showSaveFilePicker' ]( {
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

						const writable = await fileHandle.createWritable();

						await writable.write( str );

						await writable.close();

						$this.notify( "Fingerprint saved to file" );

						return;
					}

					await navigator.clipboard.writeText( str );

					$this.notify( "Fingerprint copied in clipboard" );
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

class fingerPrintInjectClass {}

new fingerPrintBackgroundClass();