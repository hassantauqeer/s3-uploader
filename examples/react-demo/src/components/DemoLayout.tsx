import { ReactNode } from 'react';

export interface Tab {
  id: string;
  label: string;
}

export interface DemoLayoutProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  children: ReactNode;
  title?: string;
  description?: string;
}

export function DemoLayout({
  tabs,
  activeTab,
  onTabChange,
  children,
  title = 'S3 Uploader React Demo',
  description = 'File upload examples with mock and real S3/MinIO providers',
}: DemoLayoutProps) {
  return (
    <div className="app">
      <header>
        <h1>{title}</h1>
        <p>{description}</p>
      </header>

      <div className="mode-selector">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`mode-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <main>{children}</main>
    </div>
  );
}

export default DemoLayout;
