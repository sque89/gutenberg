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
import { useMemo, useRef, useState } from '@wordpress/element';
import { isRTL } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import BlockAlignmentVisualizer from '../block-alignment-visualizer';
import {
	BlockAlignmentGuideContextProvider,
	useBlockAlignmentGuides,
} from '../block-alignment-visualizer/guide-context';
import { store as blockEditorStore } from '../../store';
import { getDistanceFromPointToEdge } from '../../utils/math';

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

/**
 * Detect the alignment zone that is currently closest to the `point`.
 *
 * @param {Node}           resizableElement The element being resized.
 * @param {'left'|'right'} resizeDirection  The direction being resized.
 * @param {Map}            alignmentGuides  A Map of alignment zone nodes.
 */
function detectSnapping( resizableElement, resizeDirection, alignmentGuides ) {
	const resizableRect = resizableElement.getBoundingClientRect();

	// Get a point on the resizable rect's edge for `getDistanceFromPointToEdge`.
	// - Caveat: this assumes horizontal resizing.
	const pointFromResizableRectEdge = {
		x: resizableRect[ resizeDirection ],
		y: resizableRect.top,
	};

	let candidateZone;

	// Loop through alignment zone nodes.
	alignmentGuides?.forEach( ( zone, name ) => {
		const zoneRect = zone.getBoundingClientRect();

		// Calculate the distance from the resizeable element's edge to the
		// alignment zone's edge.
		const distance = getDistanceFromPointToEdge(
			pointFromResizableRectEdge,
			zoneRect,
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
	const resizableRef = useRef();
	const [ isAlignmentVisualizerVisible, setIsAlignmentVisualizerVisible ] =
		useState( false );
	const [ snappedAlignment, setSnappedAlignment ] = useState( null );
	const alignmentGuides = useBlockAlignmentGuides();

	const rootClientId = useSelect(
		( select ) =>
			select( blockEditorStore ).getBlockRootClientId( clientId ),
		[ clientId ]
	);

	const contentStyle = useMemo( () => {
		if ( ! snappedAlignment ) {
			// By default the content takes up the full width of the resizable box.
			return { width: '100%' };
		}

		// Calculate the correct positioning to overlay the element over the alignment zone when snapping.
		const snappedZone = alignmentGuides.get( snappedAlignment );
		const zoneRect = snappedZone.getBoundingClientRect();
		const contentRect = resizableRef.current.getBoundingClientRect();

		return {
			position: 'absolute',
			left: zoneRect.left - contentRect.left,
			top: zoneRect.top - contentRect.top,
			width: zoneRect.width,
		};
	}, [ snappedAlignment, alignmentGuides ] );

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
					const [ , resizeDirection, resizeElement ] = resizeArgs;

					// The 'ref' prop on the `ResizableBox` component is used to expose the re-resizable API.
					// This seems to be the only way to get a ref to the element.
					resizableRef.current = resizeElement;

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
						alignmentGuides
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
				<motion.div
					layout
					style={ contentStyle }
					transition={ { duration: 0.2 } }
				>
					{ children }
				</motion.div>
			</ResizableBox>
		</>
	);
}

export default function ResizableAlignmentControlsWithZoneContext( {
	...props
} ) {
	return (
		<BlockAlignmentGuideContextProvider>
			<ResizableAlignmentControls { ...props } />
		</BlockAlignmentGuideContextProvider>
	);
}
