/**
 * External dependencies
 */
import classnames from 'classnames';

/**
 * WordPress dependencies
 */

import { __ } from '@wordpress/i18n';
import { Popover, __unstableMotion as motion } from '@wordpress/components';
import { useMergeRefs, useRefEffect } from '@wordpress/compose';
import { useState } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { useBlockAlignmentGuides } from './guide-context';

const ALIGNMENTS = {
	none: {
		label: __( 'Content width' ),
	},
	wide: {
		label: __( 'Wide width' ),
		className: 'alignwide',
	},
	full: {
		label: __( 'Full width' ),
		className: 'alignfull',
	},
};

// Because the guide elements are within an iframe, styles can't be
// declared in a scss file, those styles are defined here to co-locate
// them with the component.
export const guideIframeStyles = `
.block-editor-alignment-visualizer-guide__layout {
	position: absolute;
	top: 0;
	bottom: 0;
	left: 0;
	right: 0;
}

.block-editor-alignment-visualizer-guide {
	box-sizing: border-box;
	height: 100%;
	max-width: 100%;
	margin: 0 auto;
	opacity: 0.7;
	border-left: solid 2px var(--contrast-color);
	border-right: solid 2px var(--contrast-color);
}
`;

/**
 * A guide that visualizes the position of a single block alignment.
 *
 * @param {Object}  props
 * @param {string}  props.alignment     The name of the alignment.
 * @param {string}  props.justification The content justification.
 * @param {string}  props.color         The color of the label
 * @param {boolean} props.isHighlighted Whether the alignment is highlighted
 */
export default function BlockAlignmentVisualizerGuide( {
	alignment,
	justification,
	color,
	isHighlighted,
} ) {
	const [ popoverAnchor, setPopoverAnchor ] = useState( null );

	// Register alignment guide elements to a React Context, which can then be used to determine snapping.
	const guides = useBlockAlignmentGuides();
	const updateGuideContext = useRefEffect(
		( node ) => {
			guides?.set( alignment, node );
			return () => {
				guides?.delete( alignment );
			};
		},
		[ alignment ]
	);

	const guideRef = useMergeRefs( [ updateGuideContext, setPopoverAnchor ] );

	// Simulate a block list layout, where the wrapper element is like a block list with a justification,
	// and the inner element is like a block with an alignment applied.
	return (
		<>
			<div
				className={ classnames(
					'block-editor-alignment-visualizer-guide__layout',
					{
						[ `is-content-justification-${ justification }` ]:
							justification,
					}
				) }
			>
				<div
					className={ classnames(
						'block-editor-alignment-visualizer-guide',
						ALIGNMENTS[ alignment ].className
					) }
					ref={ guideRef }
				/>
			</div>
			<Popover
				anchor={ popoverAnchor }
				className="block-editor-alignment-visualizer-guide__label-popover"
				placement="top-end"
				variant="unstyled"
				flip
				resize={ false }
				shift={ false }
			>
				<motion.div
					className={ classnames(
						'block-editor__alignment-visualizer-guide__label',
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
					{ ALIGNMENTS[ alignment ].label }
				</motion.div>
			</Popover>
		</>
	);
}
