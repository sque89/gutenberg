/**
 * WordPress dependencies
 */
import {
	__experimentalListView as ListView,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { Button } from '@wordpress/components';
import {
	useFocusOnMount,
	useFocusReturn,
	useInstanceId,
	useMergeRefs,
} from '@wordpress/compose';
import { useDispatch, useSelect } from '@wordpress/data';
import { speak } from '@wordpress/a11y';
import { __ } from '@wordpress/i18n';
import { closeSmall } from '@wordpress/icons';
import { ESCAPE } from '@wordpress/keycodes';

/**
 * Internal dependencies
 */
import { store as editSiteStore } from '../../store';

export default function ListViewSidebar() {
	const { setIsListViewOpened } = useDispatch( editSiteStore );
	const { clearSelectedBlock } = useDispatch( blockEditorStore );
	const { hasBlockSelection } = useSelect(
		( select ) => ( {
			hasBlockSelection:
				!! select( blockEditorStore ).getBlockSelectionStart(),
		} ),
		[]
	);

	const focusOnMountRef = useFocusOnMount( 'firstElement' );
	const headerFocusReturnRef = useFocusReturn();
	const contentFocusReturnRef = useFocusReturn();

	function closeOnEscape( event ) {
		// If there is a block selection, then skip closing the list view
		// and clear out the block selection instead.
		if (
			event.keyCode === ESCAPE &&
			! event.defaultPrevented &&
			hasBlockSelection
		) {
			event.preventDefault();
			clearSelectedBlock();
			speak( __( 'All blocks deselected.' ), 'assertive' );
			return;
		}

		if ( event.keyCode === ESCAPE && ! event.defaultPrevented ) {
			setIsListViewOpened( false );
		}
	}

	const instanceId = useInstanceId( ListViewSidebar );
	const labelId = `edit-site-editor__list-view-panel-label-${ instanceId }`;

	return (
		// eslint-disable-next-line jsx-a11y/no-static-element-interactions
		<div
			aria-labelledby={ labelId }
			className="edit-site-editor__list-view-panel"
			onKeyDown={ closeOnEscape }
		>
			<div
				className="edit-site-editor__list-view-panel-header"
				ref={ headerFocusReturnRef }
			>
				<strong id={ labelId }>{ __( 'List View' ) }</strong>
				<Button
					icon={ closeSmall }
					label={ __( 'Close List View Sidebar' ) }
					onClick={ () => setIsListViewOpened( false ) }
				/>
			</div>
			<div
				className="edit-site-editor__list-view-panel-content"
				ref={ useMergeRefs( [
					contentFocusReturnRef,
					focusOnMountRef,
				] ) }
			>
				<ListView />
			</div>
		</div>
	);
}
