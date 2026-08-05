import { useOutletContext } from 'react-router-dom';
import type { Client, Household } from '../../types';

export interface ClientTabContext {
  client: Client;
  setClient: (client: Client) => void;
  household: Household | null;
}

export function useClientTab(): ClientTabContext {
  return useOutletContext<ClientTabContext>();
}
