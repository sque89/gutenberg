/**
 * WordPress dependencies
 */
import { useState } from '@wordpress/element';

/**
 * WordPress dependencies
 */
import {
	ResizableBox,
	__unstableAnimatePresence as AnimatePresence,
	__unstableMotion as motion,
} from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { isRTL } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import BlockAlignmentVisualizer from '../block-alignment-visualizer';
import { store as blockEditorStore } from '../../store';

export default function ResizableAlignmentControls( {
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
	let showRightHandle = false;
	let showLeftHandle = false;
	const [ isResizingImage, setIsResizingImage ] = useState( false );
	const [ mousePosition, setMousePosition ] = useState();

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
							dragPosition={ mousePosition }
							allowedAlignments={ allowedAlignments }
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
