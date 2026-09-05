import { useState, useRef, useEffect } from 'react';

interface UseConnectionOptions {
  onConnected?: () => void;
}

export function useConnection({ onConnected }: UseConnectionOptions = {}) {
  const [connected, setConnected] = useState<boolean | null>(null);
  const connectedRef = useRef<boolean | null>(null);

  function refreshStatus() {
    chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (res) => {
      const isConnected = Boolean(res?.connected);
      connectedRef.current = isConnected;
      setConnected(isConnected);
    });
  }

  function connect() {
    chrome.runtime.sendMessage({ type: 'CONNECT' }, (res) => {
      refreshStatus();
      if (res?.connected) {
        onConnected?.();
      }
    });
  }

  function disconnect() {
    connectedRef.current = false;
    setConnected(false);
    chrome.runtime.sendMessage({ type: 'DISCONNECT' }, () => refreshStatus());
  }

  // Verifica o status na abertura do painel e reage a mudanças de token no storage.
  useEffect(() => {
    refreshStatus();

    const onStorageChanged = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName !== 'local' || !('extensionToken' in changes)) return;
      refreshStatus();
      if (changes.extensionToken.newValue) {
        onConnected?.();
      }
    };

    chrome.storage.onChanged.addListener(onStorageChanged);
    return () => {
      chrome.storage.onChanged.removeListener(onStorageChanged);
    };
  }, []);

  return {
    connected,
    connectedRef,
    refreshStatus,
    connect,
    disconnect,
  };
}
