/**
 * External dependencies
 */
import classnames from 'classnames';

/**
 * WordPress dependencies
 */
import { getBlockSupport, hasBlockSupport } from '@wordpress/blocks';
import { Popover, __unstableMotion as motion } from '@wordpress/components';
import { useMergeRefs, useRefEffect } from '@wordpress/compose';
import { useSelect } from '@wordpress/data';
import {
	createPortal,
	useContext,
	useEffect,
	useMemo,
	useState,
} from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { BlockList } from '../';
import { useLayout, LayoutStyle } from '../block-list/layout';
import { __unstableUseBlockElement as useBlockElement } from '../block-list/use-block-props/use-block-refs';
import useAvailableAlignments from '../block-alignment-control/use-available-alignments';
import { getSpacingPresetCssVar } from '../spacing-sizes-control/utils';
import { store as blockEditorStore } from '../../store';
import { getValidAlignments } from '../../hooks/align';
import { useBlockAlignmentZoneContext } from './zone-context';

/**
 * A component that displays block alignment guidelines.
 *
 * @param {Object}      root0
 * @param {?string[]}   root0.allowedAlignments    An optional array of alignments names. By default, the alignment support will be derived from the
 *                                                 'focused' block's block supports, but some blocks (image) have an ad-hoc alignment implementation.
 * @param {string|null} root0.layoutClientId       The client id of the block that provides the layout.
 * @param {string}      root0.focusedClientId      The client id of the block to show the alignment guides for.
 * @param {?string}     root0.highlightedAlignment The alignment name to show the label of.
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

								.block-editor__alignment-visualizer-zone {
									position: absolute;
									top: 0;
									bottom: 0;
									left: 0;
									right: 0;
								}

								.block-editor__alignment-visualizer-zone-inner {
									box-sizing: border-box;
									height: 100%;
									max-width: 100%;
									margin: 0 auto;
									opacity: 0.7;
									border-left: solid 2px var(--contrast-color);
									border-right: solid 2px var(--contrast-color);
								}
								` }
							</style>
							<LayoutStyle
								blockName={ layoutBlockName }
								layout={ layout }
								selector=".block-editor__alignment-visualizer-zone"
							/>
						</>
					}
				>
					<div className="editor-styles-wrapper">
						{ alignments.map( ( alignment ) => (
							<BlockAlignmentVisualizerZone
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

function BlockAlignmentVisualizerZone( {
	alignment,
	justification,
	color,
	isHighlighted,
} ) {
	const [ popoverAnchor, setPopoverAnchor ] = useState( null );

	// Register alignment zone rects to a React Context, which can then be used to determine alignment sizes.
	const zones = useBlockAlignmentZoneContext();
	const { name } = alignment;
	const updateZonesRef = useRefEffect(
		( node ) => {
			const ownerDocument = node.ownerDocument;
			const defaultView = ownerDocument.defaultView;
			const resizeObserver = defaultView.ResizeObserver
				? new defaultView.ResizeObserver( () => {
						zones.set( name, node );
				  } )
				: undefined;
			resizeObserver?.observe( node );

			return () => {
				zones?.delete( name );
				resizeObserver.disconnect();
			};
		},
		[ name ]
	);

	const zoneInnerRefs = useMergeRefs( [ updateZonesRef, setPopoverAnchor ] );

	// Each visualized alignment zone overlaps. The outer div element is absolutely positioned
	// to the fill the entire space of the iframe. This represents a simulated block list and
	// so has the content justification class name applied.
	// The inner div element is the simulated block, it has the alignment class name applied.
	return (
		<>
			<div
				className={ classnames(
					'block-editor__alignment-visualizer-zone',
					{
						[ `is-content-justification-${ justification }` ]:
							justification,
					}
				) }
			>
				<div
					className={ classnames(
						'block-editor__alignment-visualizer-zone-inner',
						alignment.className
					) }
					ref={ zoneInnerRefs }
				/>
			</div>
			<Popover
				anchor={ popoverAnchor }
				className="block-editor__alignment-visualizer-zone-label-popover"
				placement="top-end"
				variant="unstyled"
				flip
				resize={ false }
				shift={ false }
			>
				<motion.div
					className={ classnames(
						'block-editor__alignment-visualizer-zone-label',
						{ 'is-highlighted': isHighlighted }
					) }
					style={ { color } }
					initial="inactive"
					variants={ {
						active: { opacity: 1 },
						inactive: { opacity: 0 },
					} }
					animate={ isHighlighted ? 'active' : 'inactive' }
					transition={ { duration: 0.2 } }
				>
					{ alignment.label }
				</motion.div>
			</Popover>
		</>
	);
}

/**
 * A generic Iframe component. Used by the visualizer to ensure `<LayoutStyles>` don't leak into the public namespace.
 *
 * @param {import('@wordpress/element').WPElement} children
 */
function Iframe( { children, headChildren, title, ...props } ) {
	const [ head, setHead ] = useState( null );
	const [ body, setBody ] = useState( null );

	const ref = useRefEffect( ( node ) => {
		function setIframePortalElements() {
			const contentDocument = node?.contentDocument;
			const headElement = contentDocument?.head;
			const bodyElement = contentDocument?.body;

			if ( ! headElement || ! bodyElement ) {
				return;
			}
			setHead( headElement );
			setBody( bodyElement );
		}

		node.addEventListener( 'load', setIframePortalElements );

		return () => {
			node.removeEventListener( 'load', setIframePortalElements );
			setHead( null );
			setBody( null );
		};
	}, [] );

	return (
		<iframe
			ref={ ref }
			// Correct doctype is required to enable rendering in standards mode
			srcDoc="<!doctype html>"
			title={ title }
			{ ...props }
		>
			{ head && createPortal( headChildren, head ) }
			{ body && createPortal( children, body ) }
		</iframe>
	);
}
