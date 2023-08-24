// Fingerprint 2.0.0

declare const chrome: any;

class fingerPrintClass {
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
					id		: 'importFingerprint',
					title	: 'Import from clipboard'
				} );
			}
		} );

		chrome.contextMenus.onClicked.addListener( async ( info, tab ) => {
			if ( 'exportFingerprint' === info.menuItemId ) {
				const url 		= new URL( tab.url );
				const cookies 	= await chrome.cookies.getAll( {
					domain: url.hostname
				} );

				chrome.tabs.sendMessage( tab.id, {
					fingerprint: {
						_export: cookies
					}
				} );
			};
			if ( 'importFingerprint' === info.menuItemId ) {
				chrome.tabs.sendMessage( tab.id, {
					fingerprint: {
						_import: true
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
						await chrome.cookies.set( cookie );
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
					const clipboard 	= await navigator.clipboard.readText();

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

					await navigator.clipboard.writeText( JSON.stringify( fingerPrint ) );

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

new fingerPrintClass();