import { ReactNode } from 'react';

export interface InfoPanelProps {
  children: ReactNode;
}

export function InfoPanel({ children }: InfoPanelProps) {
  return <div className="info">{children}</div>;
}

export default InfoPanel;
