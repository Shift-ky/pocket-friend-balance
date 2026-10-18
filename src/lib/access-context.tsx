import { createContext, useContext } from 'react';
import { NO_ACCESS, type Access } from './access';
export const AccessContext = createContext<Access>(NO_ACCESS);
export const useAccess = () => useContext(AccessContext);