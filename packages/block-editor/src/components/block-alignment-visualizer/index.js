/**
 * WordPress dependencies
 */
import { getBlockSupport, hasBlockSupport } from '@wordpress/blocks';
import { useSelect } from '@wordpress/data';
import { useMemo } from '@wordpress/element';

/**
 * Internal dependencies
 */
import ShadowDOMContainer from './shadow-dom-container';
import BlockAlignmentVisualizerGuide, { guideIframeStyles } from './guide';
import LayoutPopover from './layout-popover';
import { useLayout, LayoutStyle } from '../block-list/layout';
import { __unstableUseBlockElement as useBlockElement } from '../block-list/use-block-props/use-block-refs';
import useAvailableAlignments from '../block-alignment-control/use-available-alignments';
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
	const { focusedBlockName, layoutBlockName } = useSelect(
		( select ) => {
			const { getBlockName } = select( blockEditorStore );

			return {
				focusedBlockName: getBlockName( focusedClientId ),
				layoutBlockName: getBlockName( layoutClientId ),
			};
		},
		[ focusedClientId, layoutClientId ]
	);

	const focusedBlockElement = useBlockElement( focusedClientId );

	// Get the valid alignments of the focused block, or use the supplied `allowedAlignments`,
	// which allows this to work for blocks like 'image' that don't use block supports.
	const validAlignments =
		allowedAlignments ??
		getValidAlignments(
			getBlockSupport( focusedBlockName, 'align' ),
			hasBlockSupport( focusedBlockName, 'alignWide', true )
		);

	// Filter the alignments down to those supported by the layout.
	const availableAlignments = useAvailableAlignments( validAlignments );

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
		<LayoutPopover
			className="block-editor-alignment-visualizer"
			coverClassName="block-editor-alignment-visualizer__cover-element"
			layoutClientId={ layoutClientId }
			focusedClientId={ focusedClientId }
			isConstrained={ layout.type === 'constrained' }
		>
			<ShadowDOMContainer>
				<LayoutStyle
					blockName={ layoutBlockName }
					layout={ layout }
					selector=".block-editor-alignment-visualizer-guide__layout"
				/>
				<style>{ guideIframeStyles }</style>
				<div className="editor-styles-wrapper">
					{ availableAlignments.map( ( { name } ) => (
						<BlockAlignmentVisualizerGuide
							key={ name }
							alignment={ name }
							justification={ layout.justifyContent }
							color={ contrastColor }
							isHighlighted={ name === highlightedAlignment }
						/>
					) ) }
				</div>
			</ShadowDOMContainer>
		</LayoutPopover>
	);
}
