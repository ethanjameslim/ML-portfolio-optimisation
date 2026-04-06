import { useState } from 'react';
import { SetupPage } from '@/pages/SetupPage';
import { RunningPage } from '@/pages/RunningPage';
import { PortfolioDashboardPage } from '@/pages/PortfolioDashboardPage';
import type { RunPipelineRequest } from '@/types/portfolio';

type AppPhase = 'setup' | 'running' | 'dashboard';

export default function App() {
  const [phase, setPhase] = useState<AppPhase>('setup');
  const [runRequest, setRunRequest] = useState<RunPipelineRequest | null>(null);

  if (phase === 'setup') {
    return (
      <SetupPage
        onRun={(request) => {
          setRunRequest(request);
          setPhase('running');
        }}
      />
    );
  }

  if (phase === 'running') {
    return (
      <RunningPage
        request={runRequest!}
        onComplete={() => setPhase('dashboard')}
        onError={() => setPhase('setup')}
      />
    );
  }

  return (
    <PortfolioDashboardPage onRerun={() => setPhase('setup')} />
  );
}
