/* global string_locator */
document.addEventListener( 'DOMContentLoaded', function() {
	let stringLocatorSearchActive = false,
		noticeWrapper = document.getElementById( 'string-locator-search-notices' ),
		progressWrapper = document.getElementById( 'string-locator-progress-wrapper' ),
		progressIndicator = document.getElementById( 'string-locator-search-progress' ),
		progressText = document.getElementById( 'string-locator-feedback-text' ),
		searchForm = document.getElementById( 'string-locator-search-form' ),
		searchTarget = document.getElementById( 'string-locator-search' ),
		searchString = document.getElementById( 'string-locator-string' ),
		searchRegex = document.getElementById( 'string-locator-regex' ),
		tableWrapper = document.getElementsByTagName( 'table' )[0],
		tableBody = document.getElementsByTagName( 'tbody' )[0],
		formData;
	const resultTemplate = wp.template( 'string-locator-search-result' );

	function addNotice( title, message, format ) {
		noticeWrapper.innerHTML += '<div class="notice notice-' + format + ' is-dismissible"><p><strong>' + title + '</strong><br />' + message + '</p></div>';
	}

	function throwError( title, message ) {
		stringLocatorSearchActive = false;
		progressWrapper.style.display = 'none';
		addNotice( title, message, 'error' );
	}

	function finalizeStringLocatorSearch() {
		stringLocatorSearchActive = false;
		formData = new FormData();

		progressText.innerText = '';

		formData.append( '_wpnonce', string_locator.rest_nonce );

		fetch(
			string_locator.url.clean,
			{
				method: 'POST',
				body: formData,
			}
		).then( function() {
			progressWrapper.style.display = 'none';
			if ( tableBody.getElementsByTagName( 'tr' ).length < 1 ) {
				tableBody.innerHTML = '<tr><td colspan="3">' + string_locator.search_no_results + '</td></tr>';
			}
		} ).catch( function ( error ) {
			throwError( error, string_locator.search_error );
		} );
	}

	function clearStringLocatorResultArea() {
		noticeWrapper.innerHTML = '';
		progressIndicator.removeAttribute( 'value' );
		tableBody.innerHTML = '';
	}

	function performStringLocatorSingleSearch( maxCount, thisCount ) {
		formData = new FormData();

		if ( thisCount >= maxCount || ! stringLocatorSearchActive ) {
			progressText.innerHTML = string_locator.saving_results_string;
			finalizeStringLocatorSearch();
			return false;
		}

		formData.append( 'filenum', thisCount );
		formData.append( '_wpnonce', string_locator.rest_nonce );

		fetch(
			string_locator.url.search,
			{
				method: 'POST',
				body: formData,
			}
		).then(
			response => response.json()
		).then( function ( response ) {
			if ( ! response.success ) {
				if ( false === response.data.continue ) {
					throwError( string_locator.warning_title, response.data.message );
					return false;
				}

				addNotice( string_locator.warning_title, response.data.message, 'warning' );
			}

			if ( undefined !== response.data.search ) {
				progressIndicator.value = response.data.filenum;
				progressText.innerHTML = string_locator.search_current_prefix + response.data.next_file;

				stringLocatorAppendResult( response.data.search );
			}
			const nextCount = response.data.filenum + 1;
			performStringLocatorSingleSearch( maxCount, nextCount );
		} ).catch( function ( error ) {
			throwError( error, string_locator.search_error );
		} );
	}

	function stringLocatorAppendResult( totalEntries ) {
		if ( Array !== totalEntries.constructor ) {
			return false;
		}

		totalEntries.forEach( function( entries ) {
			if ( entries ) {
				for ( let i = 0, amount = entries.length; i < amount; i++ ) {
					const entry = entries[ i ];

					if ( undefined !== entry.stringresult ) {
						tableBody.innerHTML += resultTemplate( entry );
					}
				}
			}
		} );
	}

	searchForm.addEventListener( 'submit', function( e ) {
		e.preventDefault();

		formData = new FormData();

		progressText.innerText = string_locator.search_preparing;
		progressWrapper.style.display = 'block';
		stringLocatorSearchActive = true;
		clearStringLocatorResultArea();

		const directoryRequest = JSON.stringify(
			{
				directory: searchTarget.value,
				search: searchString.value,
				regex: searchRegex.checked,
			}
		);

		tableWrapper.style.display = 'table';

		formData.append( 'data', directoryRequest );
		formData.append( '_wpnonce', string_locator.rest_nonce );

		fetch(
			string_locator.url.directory_structure,
			{
				method: 'POST',
				body: formData
			}
		).then(
			response => response.json()
		).then( function( response ) {
			if ( ! response.success ) {
				addNotice( '', response.data, 'alert' );
				return;
			}
			progressIndicator.setAttribute( 'max', response.data.total )
			progressIndicator.value = response.data.current;
			progressText.innerText = string_locator.search_started;
			performStringLocatorSingleSearch( response.data.total, 0 );
		} ).catch( function( error ) {
			throwError( error, string_locator.search_error );
		} );
	} );
} );
