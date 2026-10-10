import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@petal/ui/styles.css';
import { MobileApp } from '../src/MobileApp.js';
import { mobileStore, createDefaultDemoState } from '../src/services/storage.js';

function PreviewRoot() {
  const [deviceFrame, setDeviceFrame] = useState(true);
  const [key, setKey] = useState(0);

  const isNative = typeof window !== 'undefined' && (
    (window as any).PetalNative !== undefined ||
    window.location.search.includes('native=true') ||
    window.location.hostname === 'petal.local'
  );

  function handleResetDemo() {
    mobileStore.importBackupJson(JSON.stringify({
      ...createDefaultDemoState(),
    }));
    // Re-create default demo
    const demo = createDefaultDemoState();
    mobileStore.setupPack({
      mode: 'current-pack',
      usualTime: '21:00',
      timeZone: 'Asia/Manila',
      currentPosition: 14,
      currentDate: demo.doses[13]?.localDate,
      remindersEnabled: true,
    });
    // Add past events except day 13
    for (let pos = 1; pos <= 12; pos++) {
      const dose = demo.doses[pos - 1];
      mobileStore.recordIntake({
        doseId: dose.id,
        status: 'taken',
        actualAt: `${dose.localDate}T21:05:00+08:00`,
        timePrecision: 'approximate',
      });
    }
    setKey(prev => prev + 1);
  }

  if (isNative) {
    return (
      <div style={{ width: '100%', height: '100dvh', minHeight: '100%', flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#FFF7FA', overflow: 'hidden' }}>
        <MobileApp key={key} />
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#F3EAF0',
        padding: deviceFrame ? '20px 10px 40px' : '0',
      }}
    >
      {/* Review Control Bar */}
      <div
        style={{
          width: '100%',
          maxWidth: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          padding: '10px 16px',
          marginBottom: deviceFrame ? 16 : 0,
          backgroundColor: '#FFFFFF',
          borderRadius: deviceFrame ? 14 : 0,
          border: '1px solid #E7D5DE',
          boxShadow: '0 2px 6px rgba(51, 37, 45, 0.06)',
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: '#B83D70' }}>PETAL MOBILE</span>
          <span style={{ fontSize: 12, color: '#745D69' }}>Local Review</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={() => setDeviceFrame(prev => !prev)}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid #917584',
              backgroundColor: '#FFFFFF',
              color: '#33252D',
              fontSize: 12,
              fontFamily: 'Geist Mono, monospace',
              cursor: 'pointer',
            }}
          >
            {deviceFrame ? 'Mode: Phone Frame' : 'Mode: Responsive'}
          </button>

          <button
            type="button"
            onClick={handleResetDemo}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid #B83D70',
              backgroundColor: '#FCE8EF',
              color: '#B83D70',
              fontSize: 12,
              fontFamily: 'Geist Mono, monospace',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reset Demo State
          </button>
        </div>
      </div>

      {/* Main Container: Either Phone Frame or Full View */}
      {deviceFrame ? (
        <div
          style={{
            width: 390,
            height: 844,
            maxHeight: '90vh',
            backgroundColor: '#FFF7FA',
            borderRadius: 48,
            boxShadow: '0 20px 48px rgba(51, 37, 45, 0.22), 0 0 0 10px #2D232A, 0 0 0 12px #5A4753',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
          }}
        >
          {/* Simulated Mobile Status Bar with Punch-hole */}
          <div
            style={{
              height: 44,
              backgroundColor: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 24px',
              fontSize: 12,
              fontWeight: 600,
              color: '#33252D',
              position: 'relative',
              zIndex: 30,
              borderBottom: '1px solid rgba(231, 213, 222, 0.5)',
            }}
          >
            <span>9:41</span>

            {/* Dynamic Island / Camera Notch */}
            <div
              style={{
                position: 'absolute',
                top: 8,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 90,
                height: 22,
                borderRadius: 20,
                backgroundColor: '#1E171D',
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
              <span>5G</span>
              <span>100%</span>
            </div>
          </div>

          {/* Mobile App Container */}
          <div
            style={{
              flex: 1,
              height: '100%',
              minHeight: 0,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <MobileApp key={key} />
          </div>

          {/* Bottom Home Indicator */}
          <div
            style={{
              height: 18,
              backgroundColor: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'sticky',
              bottom: 0,
              zIndex: 35,
            }}
          >
            <div
              style={{
                width: 130,
                height: 4,
                borderRadius: 9999,
                backgroundColor: '#745D69',
                opacity: 0.6,
              }}
            />
          </div>
        </div>
      ) : (
        <div
          style={{
            width: '100%',
            maxWidth: 520,
            height: '100%',
            minHeight: '100vh',
            flex: 1,
            backgroundColor: '#FFF7FA',
            boxShadow: '0 0 24px rgba(51, 37, 45, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <MobileApp key={key} />
        </div>
      )}
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<PreviewRoot />);
