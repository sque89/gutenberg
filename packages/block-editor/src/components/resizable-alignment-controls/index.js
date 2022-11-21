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
import { useEffect, useState } from '@wordpress/element';
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

function ResizableAlignmentControls( {
	align,
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
	const [ isResizingImage, setIsResizingImage ] = useState( false );
	const [ mousePosition, setMousePosition ] = useState();
	const [ nearestZone, setNearestZone ] = useState();
	const zones = useBlockAlignmentZoneContext();

	useEffect( () => {
		if ( mousePosition ) {
			const newNearestZone = throttledDetectNearestZone(
				mousePosition,
				zones
			);
			if ( newNearestZone !== nearestZone ) {
				setNearestZone( newNearestZone );
			}
		}
	}, [ mousePosition, zones ] );

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
				{ isResizingImage && (
					<motion.div
						initial={ { opacity: 0 } }
						animate={ { opacity: 1 } }
						exit={ { opacity: 0 } }
						transition={ { duration: 0.15 } }
					>
						<BlockAlignmentVisualizer
							blockListClientId={ rootClientId }
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
					setIsResizingImage( true );
				} }
				onResize={ ( event ) => {
					setMousePosition( { x: event.clientX, y: event.clientY } );
				} }
				onResizeStop={ ( ...resizeArgs ) => {
					onResizeStop( ...resizeArgs );
					setIsResizingImage( false );
				} }
				resizeRatio={ align === 'center' ? 2 : 1 }
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
