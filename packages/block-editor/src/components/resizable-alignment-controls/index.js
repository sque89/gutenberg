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
import { useMemo, useState } from '@wordpress/element';
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

const highlightedZoneEdges = [ 'right' ];
function detectNearestZone( point, zones ) {
	let candidateZone;
	let candidateDistance;

	zones?.forEach( ( node, name ) => {
		const iframeElement = node?.ownerDocument?.defaultView?.frameElement;
		const iframeRect = iframeElement?.getBoundingClientRect();
		const offsetLeft = -( iframeRect?.left ?? 0 );
		const offsetTop = -( iframeRect?.top ?? 0 );

		const [ distance ] = getDistanceToNearestEdge(
			{ x: point.x + offsetLeft, y: point.y + offsetTop },
			node.getBoundingClientRect(),
			highlightedZoneEdges
		);

		if ( ! candidateDistance || candidateDistance > distance ) {
			candidateDistance = distance;
			candidateZone = name;
		}
	} );

	return candidateZone;
}
const throttledDetectNearestZone = throttle( detectNearestZone, 100 );

function getSnapCoordinates( align, zones ) {
	const snapCoordinates = [];
	const alignedZone = zones.get( align );
	const alignedZoneRect = alignedZone?.getBoundingClientRect();

	zones?.forEach( ( node ) => {
		// TODO - possibly this includes border, so may need to remove that.
		const rect = node.getBoundingClientRect();

		if ( align === 'center' ) {
			snapCoordinates.push( rect.width );
		} else if ( alignedZoneRect ) {
			snapCoordinates.push( rect.right - alignedZoneRect.left );
		}
	} );

	return snapCoordinates;
}

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
	const [ nearestZone, setNearestZone ] = useState();
	const zones = useBlockAlignmentZoneContext();

	const snapCoordinates = useMemo(
		() => getSnapCoordinates( align, zones ),
		[ align, zones, zones.size ]
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
							highlightedZone={ nearestZone }
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
				onResize={ ( event ) => {
					const newNearestZone = throttledDetectNearestZone(
						{ x: event.clientX, y: event.clientY },
						zones
					);
					if ( newNearestZone !== nearestZone ) {
						setNearestZone( newNearestZone );
					}
				} }
				onResizeStop={ ( ...resizeArgs ) => {
					onResizeStop( ...resizeArgs );
					setIsAlignmentVisualizerVisible( false );
				} }
				resizeRatio={ align === 'center' ? 2 : 1 }
				snap={ { x: snapCoordinates } }
				snapGap={ 20 }
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
