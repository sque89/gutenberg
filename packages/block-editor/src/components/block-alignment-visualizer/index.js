/**
 * External dependencies
 */
import classnames from 'classnames';

/**
 * WordPress dependencies
 */
import { getBlockSupport, hasBlockSupport } from '@wordpress/blocks';
import { Popover } from '@wordpress/components';
import { useMergeRefs, useRefEffect } from '@wordpress/compose';
import { useSelect } from '@wordpress/data';
import {
	createPortal,
	useContext,
	useEffect,
	useMemo,
	useRef,
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
import { getDistanceToNearestEdge } from '../../utils/math';

const highlightedZoneEdges = [ 'right' ];
function detectNearestZone( point, zones ) {
	let candidateZone;
	let candidateDistance;

	zones?.forEach( ( zone ) => {
		const [ distance ] = getDistanceToNearestEdge(
			point,
			zone.node.getBoundingClientRect(),
			highlightedZoneEdges
		);

		if ( ! candidateDistance || candidateDistance > distance ) {
			candidateDistance = distance;
			candidateZone = zone;
		}
	} );

	return candidateZone;
}

export default function BlockAlignmentVisualizer( {
	allowedAlignments,
	layoutClientId,
	focusedClientId,
	dragPosition,
} ) {
	const layout = useLayout();
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
	const [ highlightedZone, setHighlightedZone ] = useState();
	const zones = useRef( new Set() );
	const focusedBlockElement = useBlockElement( focusedClientId );
	const layoutBlockElement = useBlockElement( layoutClientId );
	const rootBlockListElement = useContext(
		BlockList.__unstableElementContext
	);

	useEffect( () => {
		if ( dragPosition ) {
			const nearestZone = detectNearestZone(
				dragPosition,
				zones.current
			);
			if ( nearestZone?.name !== highlightedZone ) {
				setHighlightedZone( nearestZone?.name );
			}
		}
	}, [ dragPosition ] );

	const layoutSpacing = layoutBlockAttributes?.style?.spacing;
	const layoutPadding = layoutSpacing?.padding;
	const layoutMargin = layoutSpacing?.margin;

	useEffect( () => {
		const resolvedLayoutElement =
			layoutBlockElement ?? rootBlockListElement;
		if ( ! focusedBlockElement || ! resolvedLayoutElement ) {
			return;
		}

		const { ownerDocument } = focusedBlockElement;
		const { defaultView } = ownerDocument;

		const update = () => {
			setPopoverAnchor( {
				ownerDocument,
				getBoundingClientRect() {
					const layoutRect =
						resolvedLayoutElement.getBoundingClientRect();
					const focusedBlockRect =
						focusedBlockElement.getBoundingClientRect();

					// Produce a rect that has:
					// - the horizontal positioning/height of the parent block.
					// - the vertical positioning/height of the current block.
					//
					// These are the dimensions of our fake 'block list'.
					return new defaultView.DOMRect(
						layoutRect.x,
						focusedBlockRect.y,
						layoutRect.width,
						focusedBlockRect.height
					);
				},
			} );

			const paddingTop = layoutPadding?.top
				? getSpacingPresetCssVar( layoutPadding?.top )
				: 0;
			const paddingRight = layoutPadding?.right
				? getSpacingPresetCssVar( layoutPadding?.right )
				: 0;
			const paddingBottom = layoutPadding?.bottom
				? getSpacingPresetCssVar( layoutPadding?.bottom )
				: 0;
			const paddingLeft = layoutPadding?.left
				? getSpacingPresetCssVar( layoutPadding?.left )
				: 0;
			const marginTop = layoutMargin?.top
				? getSpacingPresetCssVar( layoutMargin?.top )
				: 0;
			const marginRight = layoutMargin?.right
				? getSpacingPresetCssVar( layoutMargin?.right )
				: 0;
			const marginBottom = layoutMargin?.bottom
				? getSpacingPresetCssVar( layoutMargin?.bottom )
				: 0;
			const marginLeft = layoutMargin?.left
				? getSpacingPresetCssVar( layoutMargin?.left )
				: 0;

			setCoverElementStyle( {
				position: 'absolute',
				width: resolvedLayoutElement.offsetWidth,
				height: focusedBlockElement.offsetHeight,
				paddingTop,
				paddingRight,
				paddingBottom,
				paddingLeft,
				marginTop,
				marginRight,
				marginBottom,
				marginLeft,
			} );
		};

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
		layoutMargin,
	] );

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
	}, [ availableAlignments, layout ] );

	const contrastColor = useMemo( () => {
		if ( ! focusedBlockElement ) {
			return;
		}

		return focusedBlockElement.ownerDocument.defaultView
			.getComputedStyle( focusedBlockElement )
			.getPropertyValue( 'color' );
	}, [ focusedBlockElement ] );

	const popoverRef = useRef();

	if ( availableAlignments?.length === 0 ) {
		return null;
	}

	return (
		<Popover
			ref={ popoverRef }
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
			<Iframe
				style={ coverElementStyle }
				className="block-editor__alignment-visualizer-iframe"
			>
				<head>
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
				</head>
				<body className="editor-styles-wrapper">
					{ alignments.map( ( alignment ) => (
						<BlockAlignmentVisualizerZone
							key={ alignment.name }
							alignment={ alignment }
							justification={ layout.justifyContent }
							color={ contrastColor }
							isHighlighted={ alignment.name === highlightedZone }
							addZone={ ( zone ) => zones.current.add( zone ) }
							removeZone={ ( zone ) =>
								zones.current.delete( zone )
							}
						/>
					) ) }
				</body>
			</Iframe>
		</Popover>
	);
}

function BlockAlignmentVisualizerZone( {
	alignment,
	justification,
	color,
	isHighlighted,
	addZone,
	removeZone,
} ) {
	const [ popoverAnchor, setPopoverAnchor ] = useState( null );
	const { name } = alignment;

	const updateZonesRef = useRefEffect(
		( node ) => {
			const zone = {
				name,
				node,
			};
			addZone( zone );
			return () => removeZone( zone );
		},
		[ name ]
	);

	const zoneInnerRefs = useMergeRefs( [ updateZonesRef, setPopoverAnchor ] );

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
				<div
					className={ classnames(
						'block-editor__alignment-visualizer-zone-label',
						{ 'is-highlighted': isHighlighted }
					) }
					style={ { color } }
				>
					{ alignment.label }
				</div>
			</Popover>
		</>
	);
}

function Iframe( { children, ...props } ) {
	const [ iframeDocument, setIframeDocument ] = useState( null );

	const ref = useRefEffect( ( node ) => {
		function setDocumentIfReady() {
			const contentDocument = node?.contentDocument;
			const documentElement = contentDocument?.documentElement;
			const readyState = contentDocument?.readyState;

			if ( readyState !== 'interactive' && readyState !== 'complete' ) {
				return;
			}

			documentElement.removeChild( contentDocument.head );
			documentElement.removeChild( contentDocument.body );
			setIframeDocument( documentElement );
		}

		node.addEventListener( 'load', setDocumentIfReady );

		return () => {
			node.removeEventListener( 'load', setDocumentIfReady );
			setIframeDocument( null );
		};
	}, [] );

	return (
		<iframe
			ref={ ref }
			// Correct doctype is required to enable rendering in standards mode
			srcDoc="<!doctype html>"
			title={ __( 'Alignment visualizer' ) }
			{ ...props }
		>
			{ iframeDocument && createPortal( children, iframeDocument ) }
		</iframe>
	);
}
