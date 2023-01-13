/**
 * WordPress dependencies
 */
import { useRefEffect } from '@wordpress/compose';
import { createPortal, useState } from '@wordpress/element';

/**
 * A generic Iframe component. Used by the visualizer to ensure `<LayoutStyles>` don't leak outside of the visualizer.
 *
 * @param {import('@wordpress/element').WPElement} children
 */
export default function Iframe( { children, headChildren, title, ...props } ) {
	const [ head, setHead ] = useState( null );
	const [ body, setBody ] = useState( null );

	const ref = useRefEffect( ( node ) => {
		function setIframePortalElements() {
			const contentDocument = node?.contentDocument;
			const headElement = contentDocument?.head;
			const bodyElement = contentDocument?.body;

			if ( ! headElement || ! bodyElement ) {
				return;
			}
			setHead( headElement );
			setBody( bodyElement );
		}

		node.addEventListener( 'load', setIframePortalElements );

		return () => {
			node.removeEventListener( 'load', setIframePortalElements );
			setHead( null );
			setBody( null );
		};
	}, [] );

	return (
		<iframe
			ref={ ref }
			// Correct doctype is required to enable rendering in standards mode
			srcDoc="<!doctype html>"
			title={ title }
			{ ...props }
		>
			{ head && createPortal( headChildren, head ) }
			{ body && createPortal( children, body ) }
		</iframe>
	);
}
