/**
 * External dependencies
 */
import classnames from 'classnames';

export default function Visualization( {
	contentSize,
	wideSize,
	alignments,
	justification,
} ) {
	return (
		<>
			<style>
				{ `
					.block-editor-alignment-visualizer__visualization {
						--content-size: ${ contentSize ?? '0px' };
						--wide-size: ${ wideSize ?? '0px' };
						--gap: 8px;
						--wide-segment-width: calc( ((var(--wide-size) - var(--content-size)) / 2) - var(--gap) );

						position: absolute;
						width: 100%;
						height: 100%;
						display: grid;
						gap: var(--gap);
						grid-template-columns: 1fr var(--wide-segment-width) var(--content-size) var(--wide-segment-width) 1fr;
					}

					.block-editor-alignment-visualizer__visualization.is-content-justification-right {
						--wide-segment-width: calc( ((var(--wide-size) - var(--content-size))) - var(--gap) );
						grid-template-columns: 1fr var(--wide-segment-width) var(--content-size);
					}

					.block-editor-alignment-visualizer__visualization.is-content-justification-left {
						--wide-segment-width: calc( ((var(--wide-size) - var(--content-size))) - var(--gap) );
						grid-template-columns: var(--content-size) var(--wide-segment-width) 1fr;
					}

					.block-editor-alignment-visualizer__visualization-segment {
						background: #3d5af2;
						opacity: 0.2;
						border-radius: 2px;
					}
				` }
			</style>
			<div
				className={ classnames(
					'block-editor-alignment-visualizer__visualization',
					{
						[ `is-content-justification-${ justification }` ]:
							justification,
					}
				) }
			>
				{ justification !== 'left' &&
					[ ...alignments ]
						.reverse()
						.map(
							( { name } ) =>
								( name === 'full' || name === 'wide' ) && (
									<div
										key={ `${ name }-left` }
										className={ `block-editor-alignment-visualizer__visualization-segment ${ name }-width left` }
									/>
								)
						) }
				<div
					className={ `block-editor-alignment-visualizer__visualization-segment content` }
				/>
				{ justification !== 'right' &&
					alignments.map(
						( { name } ) =>
							( name === 'full' || name === 'wide' ) && (
								<div
									key={ `${ name }-right` }
									className={ `block-editor-alignment-visualizer__visualization-segment ${ name }-width right` }
								/>
							)
					) }
			</div>
		</>
	);
}
