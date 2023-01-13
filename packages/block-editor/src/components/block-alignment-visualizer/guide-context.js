/**
 * WordPress dependencies
 */
import { createContext, useContext, useRef } from '@wordpress/element';

const BlockAlignmentGuideContext = createContext( new Map() );
export const useBlockAlignmentGuides = () =>
	useContext( BlockAlignmentGuideContext );

export const BlockAlignmentGuideContextProvider = ( { children } ) => {
	const guides = useRef( new Map() );

	return (
		<BlockAlignmentGuideContext.Provider value={ guides.current }>
			{ children }
		</BlockAlignmentGuideContext.Provider>
	);
};
