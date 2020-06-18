/**
 * WordPress dependencies
 */
import {
	PostTitle,
	VisualEditorGlobalKeyboardShortcuts,
} from '@wordpress/editor';

import {
	WritingFlow,
	Typewriter,
	ObserveTyping,
	BlockList,
	CopyHandler,
	BlockSelectionClearer,
	MultiSelectScrollIntoView,
	__experimentalBlockSettingsMenuFirstItem,
	__experimentalUseResizeCanvas as useResizeCanvas,
} from '@wordpress/block-editor';

import { Popover, SelectionBox } from '@wordpress/components';

/**
 * Internal dependencies
 */
import BlockInspectorButton from './block-inspector-button';
import { useSelect } from '@wordpress/data';

function VisualEditor() {
	const deviceType = useSelect( ( select ) => {
		return select( 'core/edit-post' ).__experimentalGetPreviewDeviceType();
	}, [] );

	const hasMultiSelection = useSelect( ( select ) => {
		return select( 'core/block-editor' ).hasMultiSelection();
	} );

	const inlineStyles = useResizeCanvas( deviceType );

	return (
		<BlockSelectionClearer
			className="edit-post-visual-editor editor-styles-wrapper"
			style={ inlineStyles }
		>
			<SelectionBox
				isVisible={ hasMultiSelection }
				boundariesElement=".interface-interface-skeleton__content"
				containerElement=".edit-post-visual-editor.editor-styles-wrapper"
			/>
			<VisualEditorGlobalKeyboardShortcuts />
			<MultiSelectScrollIntoView />
			<Popover.Slot name="block-toolbar" />
			<Typewriter>
				<CopyHandler>
					<WritingFlow>
						<ObserveTyping>
							<div className="edit-post-visual-editor__post-title-wrapper">
								<PostTitle />
							</div>
							<BlockList />
						</ObserveTyping>
					</WritingFlow>
				</CopyHandler>
			</Typewriter>
			<__experimentalBlockSettingsMenuFirstItem>
				{ ( { onClose } ) => (
					<BlockInspectorButton onClick={ onClose } />
				) }
			</__experimentalBlockSettingsMenuFirstItem>
		</BlockSelectionClearer>
	);
}

export default VisualEditor;
