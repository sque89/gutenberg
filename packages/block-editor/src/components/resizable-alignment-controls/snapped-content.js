/**
 * WordPress dependencies
 */
import { __unstableMotion as motion } from '@wordpress/components';
import { useLayoutEffect, useState } from '@wordpress/element';

function getOffsetRect( element, offsetElement ) {
	const rect = element.getBoundingClientRect();
	const offsetRect = offsetElement.getBoundingClientRect();
	// const frame = ownerDocument?.defaultView?.frameElement;
	// const frameRect = frame?.getBoundingClientRect();

	return new window.DOMRect(
		rect.x - ( offsetRect?.x ?? 0 ),
		rect.y - ( offsetRect?.y ?? 0 ),
		rect.width,
		rect.height
	);
}

export default function SnappedContent( {
	alignmentVisualizerRef,
	alignmentZone,
	children,
	resizableBoxRef,
} ) {
	const [ animationProps, setAnimationProps ] = useState( {} );
	const [ anchor, setAnchor ] = useState( null );

	useLayoutEffect( () => {
		if ( ! resizableBoxRef.current || ! alignmentVisualizerRef.current ) {
			return;
		}

		const resizableBoxRect = getOffsetRect(
			resizableBoxRef.current,
			alignmentVisualizerRef.current
		);

		if ( ! alignmentZone ) {
			// When unsnapping, animate the image back to the resizable box's position,
			// and then set it as 'hidden'.
			setAnimationProps( {
				animate: {
					x: resizableBoxRect.x,
					y: 0,
					width: resizableBoxRect.width,
					height: resizableBoxRect.height,
					transitionEnd: {
						visibility: 'hidden',
					},
				},
				transition: { duration: 0.1 },
			} );
			return;
		}

		if ( ! anchor ) {
			setAnchor( {
				getBoundingClientRect: () =>
					alignmentZone.parentElement.getBoundingClientRect(),
				ownerDocument: alignmentZone.ownerDocument,
			} );
		}

		const alignmentZoneRect = alignmentZone.getBoundingClientRect();
		const aspectRatio = resizableBoxRect.width / resizableBoxRect.height;

		// When snapping, first move the image immediately to the resizable box's current position,
		// making it visible.
		setAnimationProps( {
			animate: {
				visibility: 'visible',
				x: resizableBoxRect.x,
				y: 0,
				width: resizableBoxRect.width,
				height: resizableBoxRect.height,
			},
			transition: { duration: 0 },
		} );

		// Then using `requestAnimationFrame` to defer the animation, animate to the alignment zone's
		// position.
		window.requestAnimationFrame( () => {
			setAnimationProps( {
				animate: {
					visibility: 'visible',
					x: alignmentZoneRect.x,
					y: 0,
					width: alignmentZoneRect.width,
					height: alignmentZoneRect.width / aspectRatio,
				},
				transition: { duration: 0.1 },
			} );
		} );
	}, [ alignmentZone ] );

	return (
		<motion.div
			style={ { position: 'absolute', visibility: 'hidden' } }
			{ ...animationProps }
		>
			{ children }
		</motion.div>
	);
}
