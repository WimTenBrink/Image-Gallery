
import React, { useState } from 'react';
import { LogEntry, LogLevel } from '../types';
import { useLogger } from '../hooks/useLogger';
import { ChevronDownIcon, ChevronRightIcon, CopyIcon } from './Icons';

const LOG_LEVEL_COLORS: { [key in LogLevel]: string } = {
  [LogLevel.INFO]: 'bg-blue-500',
  [LogLevel.WARN]: 'bg-yellow-500',
  [LogLevel.ERROR]: 'bg-red-500',
  [LogLevel.API]: 'bg-green-500',
};

const LogEntryItem: React.FC<{ log: LogEntry }> = ({ log }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(`[${log.timestamp}] [${log.level}] ${log.header}\n${log.body}`);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div className="border-b border-gray-700">
      <div 
        className="flex items-center p-2 cursor-pointer hover:bg-gray-700 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className={`w-2 h-2 rounded-full mr-3 ${LOG_LEVEL_COLORS[log.level]}`}></div>
        <span className="text-sm font-mono text-gray-400 mr-3">{new Date(log.timestamp).toLocaleTimeString()}</span>
        <span className="flex-grow font-semibold text-gray-200 truncate">{log.header}</span>
        <button onClick={(e) => { e.stopPropagation(); handleCopy(); }} className="p-1 rounded hover:bg-gray-600 text-gray-400 hover:text-white mr-2">
          {copySuccess ? <span className="text-xs text-green-400">Copied!</span> : <CopyIcon className="w-4 h-4" />}
        </button>
        {isExpanded ? <ChevronDownIcon className="w-5 h-5 text-gray-400" /> : <ChevronRightIcon className="w-5 h-5 text-gray-400" />}
      </div>
      {isExpanded && (
        <div className="p-4 bg-gray-900">
          <pre className="text-sm text-gray-300 whitespace-pre-wrap break-all bg-transparent border-none p-0">
            <code>{log.body}</code>
          </pre>
        </div>
      )}
    </div>
  );
};

const Console: React.FC = () => {
  const { logs } = useLogger();
  const [activeTab, setActiveTab] = useState<LogLevel | 'ALL'>('ALL');

  const TABS: (LogLevel | 'ALL')[] = ['ALL', LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.API];

  const filteredLogs = logs.filter(log => activeTab === 'ALL' || log.level === activeTab);

  return (
    <div className="h-full flex flex-col bg-gray-800 text-white">
      <nav className="flex-shrink-0 border-b border-gray-700">
        <div className="flex space-x-4 px-4">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                activeTab === tab 
                ? 'border-brand-secondary text-brand-secondary' 
                : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </nav>
      <div className="flex-grow overflow-y-auto">
        {filteredLogs.length > 0 ? (
          filteredLogs.map(log => <LogEntryItem key={log.id} log={log} />)
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">No logs for this category.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Console;
