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
	BlockAlignmentZoneContextProvider,
	useBlockAlignmentZoneContext,
} from '../block-alignment-visualizer/zone-context';
import { store as blockEditorStore } from '../../store';
import { getDistanceToNearestEdge } from '../../utils/math';

const SNAP_GAP = 20;

const highlightedZoneEdges = [ 'right' ];
/**
 * Detect the alignment zone that is currently closest to the `point`.
 *
 * @param {Object} point          An object with x and y properties.
 * @param {Map}    alignmentZones A Map of alignment zone nodes.
 */
function detectNearestAlignment( point, alignmentZones ) {
	let candidateZone;
	let candidateDistance;

	// Loop through alignment zone nodes.
	alignmentZones?.forEach( ( node, name ) => {
		// Take into account the offset of any iframe.
		const iframeElement = node?.ownerDocument?.defaultView?.frameElement;
		const iframeRect = iframeElement?.getBoundingClientRect();
		const iframeOffsetLeft = -( iframeRect?.left ?? 0 );
		const iframeOffsetTop = -( iframeRect?.top ?? 0 );

		// Calculate the distance tot he alignment zone's right edge.
		const [ distance ] = getDistanceToNearestEdge(
			{ x: point.x + iframeOffsetLeft, y: point.y + iframeOffsetTop },
			node.getBoundingClientRect(),
			highlightedZoneEdges
		);

		// Set the current closest zone.
		if ( ! candidateDistance || candidateDistance > distance ) {
			candidateDistance = distance;
			candidateZone = name;
		}
	} );

	return candidateZone;
}
const throttledDetectNearestAlignment = throttle( detectNearestAlignment, 100 );

/**
 * Iterate through all alignment zones and determine the snap widths.
 * The ResizableBox component takes an array of pixel widths.
 *
 * @param {string} align          The currently used alignment name.
 * @param {Map}    alignmentZones A Map of alignment zone nodes.
 */
function getSnapCoordinates( align, alignmentZones ) {
	const snapWidths = [];
	const alignedZone = alignmentZones.get( align );
	const alignedZoneRect = alignedZone?.getBoundingClientRect();

	alignmentZones?.forEach( ( node ) => {
		// TODO - possibly this includes border, so may need to remove that.
		const rect = node.getBoundingClientRect();

		// TODO - This part may need to be revised. In particular, the way drag handles work for justified content
		// is less than ideal.
		// Also consider how it works for RTL languages.
		if ( align === 'center' ) {
			// Center aligned blocks expand from the center when resizing, so the alignment zone's width can be directly used.
			// When resizing the block will naturally fill the full-width of the alignment zone.
			snapWidths.push( rect.width );
		} else if ( alignedZoneRect ) {
			// For non-centered alignments, the block will be resized using a drag handle on right, and will only expand on its right side.
			// The block will often be offset from some of the alignment zones on its left side.
			// Calculate at what widths snapping will occur by taking into account the offset.
			snapWidths.push( rect.right - alignedZoneRect.left );
		}
	} );

	return snapWidths;
}

/**
 * A component that composes together the `ResizebleBox` and `BlockAlignmentVisualizer`
 * and configures snapping to block alignments.
 *
 * @param {Object}                       props
 * @param {?string}                      props.align             The current alignment name. Defaults to 'none'.
 * @param {?string[]}                    props.allowedAlignments An optional array of allowed alignments. If not provided this will be inferred from the block supports.
 * @param {import('react').ReactElement} props.children          Children of the ResizableBox.
 * @param {string}                       props.clientId          The clientId of the block
 * @param {number}                       props.minWidth          Minimum width of the resizable box.
 * @param {number}                       props.maxWidth          Maximum width of the resizable box.
 * @param {number}                       props.minHeight         Minimum height of the resizable box.
 * @param {number}                       props.maxHeight         Maximum height of the resizable box.
 * @param {boolean}                      props.showHandle        Whether to show the drag handle.
 * @param {Function}                     props.onResizeStart     An event handler called when resizing starts.
 * @param {Function}                     props.onResizeStop      An event handler called when resizing stops.
 * @param {Object}                       props.size              The current dimensions.
 */
function ResizableAlignmentControls( {
	align = 'none',
	allowedAlignments,
	children,
	clientId,
	minWidth,
	maxWidth,
	minHeight,
	maxHeight,
	showHandle,
	onResizeStart,
	onResizeStop,
	size,
} ) {
	const [ isAlignmentVisualizerVisible, setIsAlignmentVisualizerVisible ] =
		useState( false );
	// Nearest alignment is currently used to determine when the alignment label is shown.
	const [ nearestAlignment, setNearestAlignment ] = useState();
	const alignmentZones = useBlockAlignmentZoneContext();
	const isSnapped = useRef( false );

	const snapWidths = useMemo(
		() => getSnapCoordinates( align, alignmentZones ),
		// TODO - ideally this needs to be recalculated when an alignment zone changes width.
		// The way `BlockAlignmentZoneContext` may need to be revised to achieve this.
		[ align, alignmentZones, alignmentZones.size ]
	);

	let showRightHandle = false;
	let showLeftHandle = false;

	const rootClientId = useSelect(
		( select ) =>
			select( blockEditorStore ).getBlockRootClientId( clientId ),
		[ clientId ]
	);

	/* eslint-disable no-lonely-if */
	// See https://github.com/WordPress/gutenberg/issues/7584.
	if ( align === 'center' ) {
		// When the image is centered, show both handles.
		showRightHandle = true;
		showLeftHandle = true;
	} else if ( isRTL() ) {
		// In RTL mode the image is on the right by default.
		// Show the right handle and hide the left handle only when it is
		// aligned left. Otherwise always show the left handle.
		if ( align === 'left' ) {
			showRightHandle = true;
		} else {
			showLeftHandle = true;
		}
	} else {
		// Show the left handle and hide the right handle only when the
		// image is aligned right. Otherwise always show the right handle.
		if ( align === 'right' ) {
			showLeftHandle = true;
		} else {
			showRightHandle = true;
		}
	}
	/* eslint-enable no-lonely-if */

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
							highlightedAlignment={ nearestAlignment }
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
				enable={ {
					top: false,
					right: showRightHandle,
					bottom: true,
					left: showLeftHandle,
				} }
				onResizeStart={ ( ...resizeArgs ) => {
					onResizeStart( ...resizeArgs );
					const [ , resizeDirection ] = resizeArgs;
					// TODO - reconsider supported alignments.
					// Wide and Full currently don't show drag handles, but could do.
					// Left and Right alignments could also work, but are trickier to implement.
					if (
						[ 'none', 'center' ].includes( align ) &&
						( resizeDirection === 'right' ||
							resizeDirection === 'left' )
					) {
						setIsAlignmentVisualizerVisible( true );
					}
				} }
				onResize={ ( event, resizeDirection, boxElement ) => {
					// Display the nearest alignment's label by detecting it here.
					// TODO - consider not using mouse position, but intead use
					// resizable element's bounding box. Or only show the label
					// when currently snapped.
					const newNearestAlignment = throttledDetectNearestAlignment(
						{ x: event.clientX, y: event.clientY },
						alignmentZones
					);
					if ( newNearestAlignment !== nearestAlignment ) {
						setNearestAlignment( newNearestAlignment );
					}

					// Detect when snapping occurs.
					isSnapped.current =
						isAlignmentVisualizerVisible &&
						!! snapWidths?.some( ( width ) => {
							const diff = width - boxElement.offsetWidth;
							return diff > -SNAP_GAP && diff < SNAP_GAP;
						} );
				} }
				onResizeStop={ ( ...resizeArgs ) => {
					onResizeStop( ...resizeArgs );
					setIsAlignmentVisualizerVisible( false );
				} }
				resizeRatio={ align === 'center' ? 2 : 1 }
				snap={ { x: snapWidths } }
				snapGap={ SNAP_GAP }
			>
				{ children }
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
