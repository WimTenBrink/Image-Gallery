
import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react';
import { LogEntry, LogLevel } from '../types';

interface LoggerContextType {
  logs: LogEntry[];
  addLog: (level: LogLevel, header: string, body: any) => void;
}

const LoggerContext = createContext<LoggerContextType | undefined>(undefined);

export const LoggerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = useCallback((level: LogLevel, header: string, body: any) => {
    const newLog: LogEntry = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      level,
      header,
      body: typeof body === 'string' ? body : JSON.stringify(body, null, 2),
    };
    setLogs(prevLogs => [newLog, ...prevLogs]); // Prepend new logs
  }, []);

  return (
    <LoggerContext.Provider value={{ logs, addLog }}>
      {children}
    </LoggerContext.Provider>
  );
};

export const useLogger = (): LoggerContextType => {
  const context = useContext(LoggerContext);
  if (!context) {
    throw new Error('useLogger must be used within a LoggerProvider');
  }
  return context;
};
