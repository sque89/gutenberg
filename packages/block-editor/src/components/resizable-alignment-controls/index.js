/**
 * WordPress dependencies
 */
import {
	ResizableBox,
	__unstableAnimatePresence as AnimatePresence,
	__unstableMotion as motion,
} from '@wordpress/components';
import { throttle } from '@wordpress/compose';
import { useSelect } from '@wordpress/data';
import { useState } from '@wordpress/element';
import { isRTL } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import BlockAlignmentVisualizer from '../block-alignment-visualizer';
import {
	BlockAlignmentZoneContextProvider,
	useBlockAlignmentZoneContext,
} from '../block-alignment-visualizer/zone-context';
import { store as blockEditorStore } from '../../store';
import { getDistanceFromPointToEdge } from '../../utils/math';
import SnappedContent from './snapped-content';

const SNAP_GAP = 30;

function getVisibleHandles( alignment ) {
	if ( alignment === 'center' ) {
		// When the image is centered, show both handles.
		return { right: true, left: true, bottom: true, top: false };
	}

	if ( isRTL() ) {
		// In RTL mode the image is on the right by default.
		// Show the right handle and hide the left handle only when it is
		// aligned left. Otherwise always show the left handle.
		if ( alignment === 'left' ) {
			return { right: true, left: false, bottom: true, top: false };
		}
		return { left: true, right: false, bottom: true, top: false };
	}

	// Show the left handle and hide the right handle only when the
	// image is aligned right. Otherwise always show the right handle.
	if ( alignment === 'right' ) {
		return { left: true, right: false, bottom: true, top: false };
	}
	return { right: true, left: false, bottom: true, top: false };
}

function getOffsetRect( rect, ownerDocument ) {
	const frame = ownerDocument?.defaultView?.frameElement;
	const frameRect = frame?.getBoundingClientRect();

	return new window.DOMRect(
		rect.x + ( frameRect?.left ?? 0 ),
		rect.y + ( frameRect?.top ?? 0 ),
		rect.width,
		rect.height
	);
}

/**
 * Detect the alignment zone that is currently closest to the `point`.
 *
 * @param {Node}           resizableElement The element being resized.
 * @param {'left'|'right'} resizeDirection  The direction being resized.
 * @param {Map}            alignmentZones   A Map of alignment zone nodes.
 */
function detectSnapping( resizableElement, resizeDirection, alignmentZones ) {
	const offsetResizableRect = getOffsetRect(
		resizableElement.getBoundingClientRect(),
		resizableElement.ownerDocument
	);

	// Get a point on the resizable rect's edge for `getDistanceFromPointToEdge`.
	// - Caveat: this assumes horizontal resizing.
	const pointFromResizableRectEdge = {
		x: offsetResizableRect[ resizeDirection ],
		y: offsetResizableRect.top,
	};

	let candidateZone;

	// Loop through alignment zone nodes.
	alignmentZones?.forEach( ( zone, name ) => {
		const offsetZoneRect = getOffsetRect(
			zone.getBoundingClientRect(),
			zone.ownerDocument
		);

		// Calculate the distance from the resizeable element's edge to the
		// alignment zone's edge.
		const distance = getDistanceFromPointToEdge(
			pointFromResizableRectEdge,
			offsetZoneRect,
			resizeDirection
		);

		// If the distance is within snapping tolerance, we are snapping to this alignment.
		if ( distance < SNAP_GAP ) {
			candidateZone = name;
		}
	} );

	return candidateZone;
}
const throttledDetectSnapping = throttle( detectSnapping, 100 );

/**
 * A component that composes together the `ResizebleBox` and `BlockAlignmentVisualizer`
 * and configures snapping to block alignments.
 *
 * @param {Object}                       props
 * @param {?string[]}                    props.allowedAlignments An optional array of allowed alignments. If not provided this will be inferred from the block supports.
 * @param {import('react').ReactElement} props.children          Children of the ResizableBox.
 * @param {string}                       props.clientId          The clientId of the block
 * @param {?string}                      props.currentAlignment  The current alignment name. Defaults to 'none'.
 * @param {number}                       props.minWidth          Minimum width of the resizable box.
 * @param {number}                       props.maxWidth          Maximum width of the resizable box.
 * @param {number}                       props.minHeight         Minimum height of the resizable box.
 * @param {number}                       props.maxHeight         Maximum height of the resizable box.
 * @param {Function}                     props.onResizeStart     An event handler called when resizing starts.
 * @param {Function}                     props.onResizeStop      An event handler called when resizing stops.
 * @param {Function}                     props.onSnap            Function called when alignment is set.
 * @param {boolean}                      props.showHandle        Whether to show the drag handle.
 * @param {Object}                       props.size              The current dimensions.
 */
function ResizableAlignmentControls( {
	allowedAlignments,
	children,
	clientId,
	currentAlignment = 'none',
	minWidth,
	maxWidth,
	minHeight,
	maxHeight,
	onResizeStart,
	onResizeStop,
	onSnap,
	showHandle,
	size,
} ) {
	const [ isAlignmentVisualizerVisible, setIsAlignmentVisualizerVisible ] =
		useState( false );
	const [ snappedAlignment, setSnappedAlignment ] = useState( null );
	const alignmentZones = useBlockAlignmentZoneContext();

	const rootClientId = useSelect(
		( select ) =>
			select( blockEditorStore ).getBlockRootClientId( clientId ),
		[ clientId ]
	);

	return (
		<>
			<AnimatePresence>
				{ isAlignmentVisualizerVisible && (
					<motion.div
						initial={ { opacity: 0 } }
						animate={ { opacity: 1 } }
						exit={ { opacity: 0 } }
						transition={ { duration: 0.15 } }
					>
						<BlockAlignmentVisualizer
							layoutClientId={ rootClientId }
							focusedClientId={ clientId }
							allowedAlignments={ allowedAlignments }
							highlightedAlignment={ snappedAlignment }
						/>
					</motion.div>
				) }
			</AnimatePresence>
			{ isAlignmentVisualizerVisible && (
				<SnappedContent
					alignmentZone={ alignmentZones.get( snappedAlignment ) }
				>
					{ children }
				</SnappedContent>
			) }
			<ResizableBox
				size={ size }
				showHandle={ showHandle }
				minWidth={ minWidth }
				maxWidth={ maxWidth }
				minHeight={ minHeight }
				maxHeight={ maxHeight }
				lockAspectRatio
				enable={ getVisibleHandles( currentAlignment ) }
				onResizeStart={ ( ...resizeArgs ) => {
					onResizeStart( ...resizeArgs );
					const [ , resizeDirection ] = resizeArgs;
					// TODO - reconsider supported alignments.
					// Wide and Full currently don't show drag handles, but could do.
					// Left and Right alignments could also work, but are trickier to implement.
					if (
						resizeDirection === 'right' ||
						resizeDirection === 'left'
					) {
						setIsAlignmentVisualizerVisible( true );
					}
				} }
				onResize={ ( event, resizeDirection, resizableElement ) => {
					// Detect if snapping is happening.
					const newSnappedAlignment = throttledDetectSnapping(
						resizableElement,
						resizeDirection,
						alignmentZones
					);
					if ( newSnappedAlignment !== snappedAlignment ) {
						setSnappedAlignment( newSnappedAlignment );
					}
				} }
				onResizeStop={ ( ...resizeArgs ) => {
					if ( onSnap && snappedAlignment ) {
						onSnap( snappedAlignment );
					} else {
						onResizeStop( ...resizeArgs );
					}
					setIsAlignmentVisualizerVisible( false );
					setSnappedAlignment( null );
				} }
				resizeRatio={ currentAlignment === 'center' ? 2 : 1 }
			>
				<div
					style={ {
						visibility: snappedAlignment ? 'hidden' : 'visible',
						width: '100%',
					} }
				>
					{ children }
				</div>
			</ResizableBox>
		</>
	);
}

export default function ResizableAlignmentControlsWithZoneContext( {
	...props
} ) {
	return (
		<BlockAlignmentZoneContextProvider>
			<ResizableAlignmentControls { ...props } />
		</BlockAlignmentZoneContextProvider>
	);
}
