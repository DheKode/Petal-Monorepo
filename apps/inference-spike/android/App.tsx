/**
 * Petal Android inference spike (issue #3, A01).
 *
 * Loads a locally stored GGUF with llama.rn, streams fresh replies to the
 * fictional prompts and shows load time, time to first token and latency.
 * On first launch it downloads and verifies the model (internet needed once),
 * then works offline. It runs once on launch; each summary is also logged as
 * `PETAL_BENCH {json}` so `adb logcat -s ReactNativeJS` can capture it.
 * No network access is used after the model is verified.
 *
 * @format
 */

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Button, ScrollView, StatusBar, StyleSheet, Text, View} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import {initLlama, LlamaContext} from 'llama.rn';
import {prompts, system} from './src/prompts';
import {ensureModel, MODEL, SetupProgress} from './src/model';

function describeSetup(progress: SetupProgress): string {
  if (progress.phase === 'checking') return 'Checking for the on-device model…';
  if (progress.phase === 'verifying') return 'Verifying the model file (one time)…';
  const mb = (bytes: number) => (bytes / 1e6).toFixed(0);
  return `Downloading the AI model (one time): ${mb(progress.bytesWritten)} / ${mb(progress.totalBytes)} MB`;
}

type RunResult = {
  prompt: string;
  round: number;
  firstTokenMs: number | null;
  totalMs: number;
  outputTokens: number;
  tokensPerSecond: number;
  promptTokens: number;
  reasoningChars: number;
  text: string;
};

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.container}>
        <Bench />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function Bench() {
  const [status, setStatus] = useState('Starting…');
  const [streaming, setStreaming] = useState('');
  const [results, setResults] = useState<RunResult[]>([]);
  const [loadInfo, setLoadInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const contextRef = useRef<LlamaContext | null>(null);

  const ensureContext = useCallback(async () => {
    if (contextRef.current) return contextRef.current;
    const setupStart = Date.now();
    const path = await ensureModel(progress => setStatus(describeSetup(progress)));
    const setupMs = Date.now() - setupStart;
    setStatus('Loading the model…');
    const start = Date.now();
    const context = await initLlama({
      model: path,
      n_ctx: 2048,
      n_gpu_layers: 0,
      use_mlock: false,
    });
    const loadMs = Date.now() - start;
    contextRef.current = context;
    const info = {event: 'load', path, setupMs, loadMs, gpu: context.gpu, reasonNoGPU: context.reasonNoGPU};
    console.log(`PETAL_BENCH ${JSON.stringify(info)}`);
    setLoadInfo(`${MODEL.file} loaded in ${loadMs} ms on this phone (GPU: ${context.gpu ? 'yes' : 'no'})`);
    return context;
  }, []);

  const run = useCallback(async () => {
    setBusy(true);
    try {
      const context = await ensureContext();
      for (let round = 1; round <= 2; round++) {
        for (const prompt of prompts) {
          setStatus(`Generating ${prompt.id} (round ${round})`);
          setStreaming('');
          let firstTokenMs: number | null = null;
          let text = '';
          const start = Date.now();
          const result = await context.completion(
            {
              messages: [
                {role: 'system', content: system},
                {role: 'user', content: prompt.text},
              ],
              jinja: true,
              enable_thinking: false,
              reasoning_format: 'auto',
              n_predict: 160,
              temperature: 0.7,
            },
            data => {
              if (firstTokenMs == null && data.token.trim() !== '') firstTokenMs = Date.now() - start;
              text += data.token;
              setStreaming(text);
            },
          );
          const totalMs = Date.now() - start;
          const runResult: RunResult = {
            prompt: prompt.id,
            round,
            firstTokenMs,
            totalMs,
            outputTokens: result.timings.predicted_n,
            tokensPerSecond: Number(result.timings.predicted_per_second.toFixed(1)),
            promptTokens: result.timings.prompt_n,
            reasoningChars: (result.reasoning_content ?? '').length,
            text: result.text,
          };
          console.log(`PETAL_BENCH ${JSON.stringify({event: 'run', ...runResult})}`);
          setResults(previous => [...previous, runResult]);
        }
      }
      setStatus('Done');
    } catch (error) {
      console.log(`PETAL_BENCH ${JSON.stringify({event: 'error', error: String(error)})}`);
      setStatus(`Error: ${String(error)}`);
    } finally {
      setBusy(false);
    }
  }, [ensureContext]);

  useEffect(() => {
    run();
  }, [run]);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Petal AI preview (test build)</Text>
      <Text style={styles.note}>
        Tests the small AI model running entirely on this phone. This is not the Petal pill tracker, and it gives no medical
        guidance. Prompts use fictional data. The first launch downloads the model (about 400 MB); after that it works
        offline.
      </Text>
      <Text style={styles.status}>{status}</Text>
      {loadInfo ? <Text style={styles.metric}>{loadInfo}</Text> : null}
      <View style={styles.box}>
        <Text style={styles.stream}>{streaming}</Text>
      </View>
      {results.map(result => (
        <Text key={`${result.prompt}-${result.round}`} style={styles.metric}>
          {`${result.prompt} r${result.round}: first token ${result.firstTokenMs} ms, total ${result.totalMs} ms, ${result.outputTokens} tok (${result.tokensPerSecond} tok/s)`}
        </Text>
      ))}
      <Button title={busy ? 'Running…' : 'Run again'} onPress={run} disabled={busy} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#ffffff'},
  content: {padding: 16, gap: 8},
  title: {fontSize: 20, fontWeight: '600', color: '#111111'},
  note: {fontSize: 13, color: '#555555'},
  status: {fontSize: 15, color: '#111111'},
  box: {minHeight: 120, padding: 12, borderWidth: 1, borderColor: '#cccccc', borderRadius: 8},
  stream: {fontSize: 15, color: '#111111'},
  metric: {fontSize: 13, color: '#333333'},
});

export default App;
