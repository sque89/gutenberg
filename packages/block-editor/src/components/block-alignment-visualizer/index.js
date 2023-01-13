/**
 * WordPress dependencies
 */
import { getBlockSupport, hasBlockSupport } from '@wordpress/blocks';
import { Popover } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { useContext, useEffect, useMemo, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import Iframe from './iframe';
import BlockAlignmentVisualizerGuide, { guideIframeStyles } from './guide';
import { BlockList } from '../';
import { useLayout, LayoutStyle } from '../block-list/layout';
import { __unstableUseBlockElement as useBlockElement } from '../block-list/use-block-props/use-block-refs';
import useAvailableAlignments from '../block-alignment-control/use-available-alignments';
import { getSpacingPresetCssVar } from '../spacing-sizes-control/utils';
import { store as blockEditorStore } from '../../store';
import { getValidAlignments } from '../../hooks/align';

/**
 * A component that displays block alignment guidelines.
 *
 * @param {Object}      props
 * @param {?string[]}   props.allowedAlignments    An optional array of alignments names. By default, the alignment support will be derived from the
 *                                                 'focused' block's block supports, but some blocks (image) have an ad-hoc alignment implementation.
 * @param {string|null} props.layoutClientId       The client id of the block that provides the layout.
 * @param {string}      props.focusedClientId      The client id of the block to show the alignment guides for.
 * @param {?string}     props.highlightedAlignment The alignment name to show the label of.
 */
export default function BlockAlignmentVisualizer( {
	allowedAlignments,
	layoutClientId,
	focusedClientId,
	highlightedAlignment,
} ) {
	const { focusedBlockName, layoutBlockName, layoutBlockAttributes } =
		useSelect(
			( select ) => {
				const { getBlockName, getBlockAttributes } =
					select( blockEditorStore );

				return {
					focusedBlockName: getBlockName( focusedClientId ),
					layoutBlockName: getBlockName( layoutClientId ),
					layoutBlockAttributes: getBlockAttributes( layoutClientId ),
				};
			},
			[ focusedClientId, layoutClientId ]
		);

	const [ popoverAnchor, setPopoverAnchor ] = useState( null );
	const [ coverElementStyle, setCoverElementStyle ] = useState( null );
	const focusedBlockElement = useBlockElement( focusedClientId );
	const layoutBlockElement = useBlockElement( layoutClientId );

	// useBlockElement is unable to return the document's root block list.
	// __unstableElementContext seems to provide this.
	const rootBlockListElement = useContext(
		BlockList.__unstableElementContext
	);

	// TODO - this won't work for the root block list. For example - if the post template itself has padding.
	const layoutPadding = layoutBlockAttributes?.style?.spacing?.padding;

	useEffect( () => {
		const resolvedLayoutElement =
			layoutBlockElement ?? rootBlockListElement;
		if ( ! focusedBlockElement || ! resolvedLayoutElement ) {
			return;
		}

		const { ownerDocument } = focusedBlockElement;
		const { defaultView } = ownerDocument;

		const update = () => {
			// The popover is positioned to the top of the block list that provides the layout
			// and left of the 'focused' block.
			setPopoverAnchor( {
				ownerDocument,
				getBoundingClientRect() {
					const layoutRect =
						resolvedLayoutElement.getBoundingClientRect();
					const focusedBlockRect =
						focusedBlockElement.getBoundingClientRect();

					return new defaultView.DOMRect(
						layoutRect.x,
						focusedBlockRect.y,
						layoutRect.width,
						focusedBlockRect.height
					);
				},
			} );

			// Determine any padding in the layout.
			const paddingRight = layoutPadding?.right
				? getSpacingPresetCssVar( layoutPadding?.right )
				: 0;
			const paddingLeft = layoutPadding?.left
				? getSpacingPresetCssVar( layoutPadding?.left )
				: 0;

			// The cover element is an inner element within the popover. It has the width of the layout
			// and height of the focused block, and also matches any padding of the layout.
			setCoverElementStyle( {
				position: 'absolute',
				width: resolvedLayoutElement.offsetWidth,
				height: focusedBlockElement.offsetHeight,
				paddingRight,
				paddingLeft,
			} );
		};

		// Observe any resizes of both the layout and focused elements.
		const resizeObserver = defaultView.ResizeObserver
			? new defaultView.ResizeObserver( update )
			: undefined;
		resizeObserver?.observe( resolvedLayoutElement );
		resizeObserver?.observe( focusedBlockElement );
		update();

		return () => {
			resizeObserver?.disconnect();
		};
	}, [
		focusedBlockElement,
		layoutBlockElement,
		rootBlockListElement,
		layoutPadding,
	] );

	// Get the allowed alignments of the focused block.
	const focusedBlockAllowedAlignments = getValidAlignments(
		getBlockSupport( focusedBlockName, 'align' ),
		hasBlockSupport( focusedBlockName, 'alignWide', true )
	);

	// Allow override of `blockAllowedAlignments`. The image block doesn't use
	// alignment block supports, so this allows the image block to directly
	// declare what it supports.
	const availableAlignments = useAvailableAlignments(
		allowedAlignments ?? focusedBlockAllowedAlignments
	);

	// Produce an array of the alignments that is ultimately used to simulate block alignments.
	const alignments = useMemo( () => {
		return availableAlignments
			.map( ( { name } ) => {
				if ( name === 'none' ) {
					return {
						name,
						label: __( 'Content width' ),
					};
				}
				if ( name === 'wide' ) {
					return {
						name,
						label: __( 'Wide width' ),
						className: 'alignwide',
					};
				}
				if ( name === 'full' ) {
					return {
						name,
						label: __( 'Full width' ),
						className: 'alignfull',
					};
				}
				return null;
			} )
			.filter( ( alignment ) => alignment !== null );
	}, [ availableAlignments ] );

	// Get the current text color and use it as the basis of the color scheme for the visualizer.
	// This should provide a good contrast with the background.
	const contrastColor = useMemo( () => {
		if ( ! focusedBlockElement ) {
			return;
		}

		return focusedBlockElement.ownerDocument.defaultView
			.getComputedStyle( focusedBlockElement )
			.getPropertyValue( 'color' );
	}, [ focusedBlockElement ] );

	// Get the current layout, which is used for rendering `<LayoutStyle>`.
	const layout = useLayout();

	if ( availableAlignments?.length === 0 ) {
		return null;
	}

	return (
		<Popover
			anchor={ popoverAnchor }
			placement="top-start"
			className="block-editor__alignment-visualizer"
			animate={ false }
			focusOnMount={ false }
			flip={ false }
			resize={ false }
			variant="unstyled"
			__unstableInline
		>
			<div
				className="block-editor__alignment-visualizer-cover-element"
				style={ coverElementStyle }
			>
				<Iframe
					className="block-editor__alignment-visualizer-iframe"
					title={ __( 'Alignment visualizer' ) }
					headChildren={
						<>
							<style>
								{ `
								:root {
									--contrast-color: ${ contrastColor }
								}

								html {
									overflow: hidden;
								}

								body::before {
									content: "";
									position: absolute;
									top: 0;
									right: 0;
									bottom: 0;
									left: 0;
									background-color: var(--contrast-color);
									opacity: 0.05;
								}

								${ guideIframeStyles }
								` }
							</style>
							<LayoutStyle
								blockName={ layoutBlockName }
								layout={ layout }
								selector=".block-editor-alignment-visualizer-guide__layout"
							/>
						</>
					}
				>
					<div className="editor-styles-wrapper">
						{ alignments.map( ( alignment ) => (
							<BlockAlignmentVisualizerGuide
								key={ alignment.name }
								alignment={ alignment }
								justification={ layout.justifyContent }
								color={ contrastColor }
								isHighlighted={
									alignment.name === highlightedAlignment
								}
							/>
						) ) }
					</div>
				</Iframe>
			</div>
		</Popover>
	);
}
