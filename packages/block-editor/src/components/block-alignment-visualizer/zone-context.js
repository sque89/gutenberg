/**
 * WordPress dependencies
 */
import { createContext, useContext, useRef } from '@wordpress/element';

const BlockAlignmentZoneContext = createContext( new Map() );
export const useBlockAlignmentZoneContext = () =>
	useContext( BlockAlignmentZoneContext );

export const BlockAlignmentZoneContextProvider = ( { children } ) => {
	const zones = useRef( new Map() );

	return (
		<BlockAlignmentZoneContext.Provider value={ zones.current }>
			{ children }
		</BlockAlignmentZoneContext.Provider>
	);
};
