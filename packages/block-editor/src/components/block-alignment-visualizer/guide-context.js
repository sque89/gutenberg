/**
 * WordPress dependencies
 */
import { useThrottle } from '@wordpress/compose';
import { createContext, useContext, useRef } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { getDistanceFromPointToEdge } from '../../utils/math';

const BlockAlignmentGuideContext = createContext( new Map() );
export const useBlockAlignmentGuides = () =>
	useContext( BlockAlignmentGuideContext );

export function BlockAlignmentGuideContextProvider( { children } ) {
	const guides = useRef( new Map() );

	return (
		<BlockAlignmentGuideContext.Provider value={ guides.current }>
			{ children }
		</BlockAlignmentGuideContext.Provider>
	);
}

/**
 * Offset an element by any parent iframes to get its true rect.
 *
 * @param {Element}  element The dom element to return the rect.
 * @param {?DOMRect} rect    The rect to offset. Only use if you already have `element`'s rect,
 *                           this will save a call to `getBoundingClientRect`.
 *
 * @return {DOMRect} The rect offset by any parent iframes.
 */
function getOffsetRect( element, rect ) {
	const frame = element?.ownerDocument?.defaultView?.frameElement;

	// Return early when there's no parent iframe.
	if ( ! frame ) {
		return rect ?? element.getBoundingClientRect();
	}

	const frameRect = frame?.getBoundingClientRect();
	rect = rect ?? element?.getBoundingClientRect();

	const offsetRect = new window.DOMRect(
		rect.x + ( frameRect?.left ?? 0 ),
		rect.y + ( frameRect?.top ?? 0 ),
		rect.width,
		rect.height
	);

	// Perform a tail recursion and continue offsetting
	// by the next parent iframe.
	return getOffsetRect( frame, offsetRect );
}

/**
 * Detect whether the `element` is snapping to one of the alignment guide along its `snapEdge`.
 *
 * @param {Node}           element         The element to check for snapping.
 * @param {'left'|'right'} snapEdge        The edge that will snap.
 * @param {Map}            alignmentGuides A Map of alignment guide nodes.
 * @param {number}         snapGap         The pixel threshold for snapping.
 *
 * @return {null|'none'|'wide'|'full'} The alignment guide or `null` if no snapping was detected.
 */
function detectSnapping( element, snapEdge, alignmentGuides, snapGap ) {
	const elementRect = getOffsetRect( element );

	// Get a point on the resizable rect's edge for `getDistanceFromPointToEdge`.
	// - Caveat: this assumes horizontal resizing.
	const pointFromElementRect = {
		x: elementRect[ snapEdge ],
		y: elementRect.top,
	};

	let candidateGuide = null;

	// Loop through alignment guide nodes.
	alignmentGuides?.forEach( ( guide, name ) => {
		const guideRect = getOffsetRect( guide );

		// Calculate the distance from the resizeable element's edge to the
		// alignment zone's edge.
		const distance = getDistanceFromPointToEdge(
			pointFromElementRect,
			guideRect,
			snapEdge
		);

		// If the distance is within snapping tolerance, we are snapping to this alignment.
		if ( distance < snapGap ) {
			candidateGuide = name;
		}
	} );

	return candidateGuide;
}

export function useDetectSnapping( snapGap ) {
	const alignmentGuides = useBlockAlignmentGuides();
	return useThrottle( ( element, snapEdge ) => {
		const snappedAlignment = detectSnapping(
			element,
			snapEdge,
			alignmentGuides,
			snapGap
		);
		const guide = alignmentGuides.get( snappedAlignment );

		if ( ! guide ) {
			return null;
		}

		return {
			name: snappedAlignment,
			rect: getOffsetRect( guide ),
		};
	}, 100 );
}
