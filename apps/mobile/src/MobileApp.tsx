import React, { useEffect, useMemo, useRef, useState } from 'react';
import { petalNativeTheme as theme } from '@petal/ui/theme/native';
import { listUnresolvedDoses } from '@petal/domain';
import { mobileStore } from './services/storage.js';
import { PetalHeader } from './components/PetalHeader.js';
import { TabBar } from './components/TabBar.js';
import { TodayScreen } from './screens/TodayScreen.js';
import { PackScreen } from './screens/PackScreen.js';
import { ClarifyScreen } from './screens/ClarifyScreen.js';
import { BleedingScreen } from './screens/BleedingScreen.js';
import { SettingsScreen } from './screens/SettingsScreen.js';
import { SetupScreen } from './screens/SetupScreen.js';
import type { BleedingInput, PetalMobileState, RecordIntakeInput, SetupPayload, TabId } from './types/state.js';

interface MobileAppProps {
  initialState?: PetalMobileState;
}

export function MobileApp({ initialState }: MobileAppProps) {
  const [state, setState] = useState<PetalMobileState>(() => initialState ?? mobileStore.getState());
  const [activeTab, setActiveTab] = useState<TabId>('today');
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [notice, setNotice] = useState<{ text: string; undoDoseId?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function handleResize() {
      if (typeof window !== 'undefined') {
        const isSmall = window.innerHeight < 480;
        setIsKeyboardOpen(isSmall);
      }
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    return mobileStore.subscribe(updated => {
      setState(updated);
    });
  }, []);

  const now = useMemo(() => new Date(), []);
  const unresolvedCount = useMemo(() => {
    if (!state.isConfigured) return 0;
    return listUnresolvedDoses(state.doses, state.events, now).length;
  }, [state.doses, state.events, state.isConfigured, now]);

  function handleRecordIntake(input: RecordIntakeInput) {
    setError(null);
    const dose = state.doses.find(d => d.id === input.doseId);
    const tabletLabel = dose ? `Tablet ${dose.position}` : 'Dose';

    const result = mobileStore.recordIntake(input);
    if (!result.ok) {
      setError(result.message || 'Could not record intake.');
      return;
    }

    if (result.change === 'unchanged') {
      setNotice({ text: `${tabletLabel} was already recorded as ${input.status}.` });
    } else {
      setNotice({
        text: `Recorded ${tabletLabel} as ${input.status}.`,
        undoDoseId: result.undoable ? input.doseId : undefined,
      });
    }

    setTimeout(() => {
      setNotice(prev => (prev?.undoDoseId === input.doseId ? prev : null));
    }, 6000);
  }

  function handleUndo(doseId: string) {
    setError(null);
    const result = mobileStore.undoIntake(doseId);
    if (!result.ok) {
      setError(result.message || 'Could not undo entry.');
      return;
    }
    setNotice({ text: 'Previous entry restored.' });
    setTimeout(() => setNotice(null), 3000);
  }

  function handleSetupComplete(payload: SetupPayload) {
    mobileStore.setupPack(payload);
    setIsSettingUp(false);
    setActiveTab('today');
    setNotice({ text: 'Pack schedule initialized successfully.' });
    setTimeout(() => setNotice(null), 4000);
  }

  function handleAddBleeding(input: BleedingInput) {
    mobileStore.addBleeding(input);
  }

  function handleDeleteBleeding(id: string) {
    mobileStore.deleteBleeding(id);
  }

  function handleUpdateUsualTime(time: string) {
    mobileStore.updateSettings({ usualTime: time });
  }

  function handleToggleReminders() {
    const cur = state.settings.notificationPreference;
    const next = cur === 'enabled' ? 'disabled' : 'enabled';
    mobileStore.updateSettings({ notificationPreference: next });
  }

  function handleExportBackup(): string {
    return mobileStore.exportBackupJson();
  }

  function handleImportBackup(jsonStr: string) {
    const res = mobileStore.importBackupJson(jsonStr);
    if (res.ok) {
      setActiveTab('today');
    }
    return res;
  }

  function handleResetData() {
    mobileStore.resetAll();
    setIsSettingUp(true);
  }

  // Render Setup if not configured or explicitly re-running setup
  if (!state.isConfigured || isSettingUp) {
    return (
      <div
        data-petal-ui=""
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          width: '100%',
          flex: 1,
          backgroundColor: theme.semantic.color.background,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <PetalHeader showPrivacyBadge />
        <main
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <SetupScreen
            onComplete={handleSetupComplete}
            initialTimeZone={state.settings.timeZone}
          />
        </main>
      </div>
    );
  }

  return (
    <div
      data-petal-ui=""
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        flex: 1,
        backgroundColor: theme.semantic.color.background,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <PetalHeader showPrivacyBadge />

      <main
        ref={mainRef}
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: activeTab === 'today' ? 'flex' : 'none',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <TodayScreen
            state={state}
            onRecordIntake={handleRecordIntake}
            onUndo={handleUndo}
            onNavigateToClarify={() => setActiveTab('clarify')}
            notice={notice}
            error={error}
          />
        </div>

        <div
          style={{
            display: activeTab === 'pack' ? 'flex' : 'none',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <PackScreen
            state={state}
            onRecordIntake={handleRecordIntake}
          />
        </div>

        <div
          style={{
            display: activeTab === 'clarify' ? 'flex' : 'none',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            height: '100%',
            overflow: 'hidden',
          }}
        >
          <ClarifyScreen
            state={state}
            onRecordIntake={handleRecordIntake}
          />
        </div>

        <div
          style={{
            display: activeTab === 'bleeding' ? 'flex' : 'none',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <BleedingScreen
            state={state}
            onAddBleeding={handleAddBleeding}
            onDeleteBleeding={handleDeleteBleeding}
          />
        </div>

        <div
          style={{
            display: activeTab === 'settings' ? 'flex' : 'none',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <SettingsScreen
            state={state}
            onUpdateUsualTime={handleUpdateUsualTime}
            onToggleReminders={handleToggleReminders}
            onExportBackup={handleExportBackup}
            onImportBackup={handleImportBackup}
            onResetData={handleResetData}
            onRerunSetup={() => setIsSettingUp(true)}
          />
        </div>
      </main>

      {(!isKeyboardOpen || activeTab !== 'clarify') && (
        <TabBar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          unresolvedCount={unresolvedCount}
        />
      )}
    </div>
  );
}
