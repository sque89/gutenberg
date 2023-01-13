/**
 * WordPress dependencies
 */
import { Popover } from '@wordpress/components';
import { useLayoutEffect, useState } from '@wordpress/element';

export default function SnappedContent( { alignmentZone, children } ) {
	const [ snapStyle, setSnapStyle ] = useState( null );

	useLayoutEffect( () => {
		if ( ! alignmentZone ) {
			return setSnapStyle( { visibility: 'hidden' } );
		}

		const ownerDocument = alignmentZone.ownerDocument;
		const defaultView = ownerDocument.defaultView;

		function update() {
			const rect = alignmentZone.getBoundingClientRect();

			setSnapStyle( {
				position: 'absolute',
				width: rect.width,
				height: 'auto',
			} );
		}

		const resizeObserver = defaultView.ResizeObserver
			? new defaultView.ResizeObserver( update )
			: undefined;
		resizeObserver?.observe( alignmentZone );

		return () => {
			resizeObserver?.disconnect();
		};
	}, [ alignmentZone ] );

	return (
		<Popover
			anchor={ alignmentZone }
			placement="top-start"
			animate={ false }
			focusOnMount={ false }
			flip={ false }
			resize={ false }
			variant="unstyled"
			__unstableInline
		>
			<div style={ snapStyle }>{ children }</div>
		</Popover>
	);
}
