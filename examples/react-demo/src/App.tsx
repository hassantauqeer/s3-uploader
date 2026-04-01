import { useState } from 'react';
import { DemoLayout, Tab } from './components';
import {
  MockExample,
  PublicApiExample,
  MultipartExample,
  ProtectedApiExample,
  ManualUploadExample,
} from './examples';
import './App.css';

type Mode = 'mock' | 'public' | 'multipart' | 'protected' | 'manual';

const TABS: Tab[] = [
  { id: 'mock', label: 'Mock Mode' },
  { id: 'public', label: 'Public API' },
  { id: 'multipart', label: 'Multipart Upload' },
  { id: 'protected', label: 'Protected API' },
  { id: 'manual', label: 'Manual Upload' },
];

function App() {
  const [mode, setMode] = useState<Mode>('mock');

  const renderExample = () => {
    switch (mode) {
      case 'mock':
        return <MockExample />;
      case 'public':
        return <PublicApiExample />;
      case 'multipart':
        return <MultipartExample />;
      case 'protected':
        return <ProtectedApiExample />;
      case 'manual':
        return <ManualUploadExample />;
    }
  };

  return (
    <DemoLayout tabs={TABS} activeTab={mode} onTabChange={(id) => setMode(id as Mode)}>
      {renderExample()}
    </DemoLayout>
  );
}

export default App;
