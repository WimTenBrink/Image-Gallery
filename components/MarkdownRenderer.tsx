
import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const renderBlocks = () => {
    const blocks: React.ReactNode[] = [];
    const lines = content.split('\n');
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];

      if (line.startsWith('## ')) {
        blocks.push(<h2 key={i}>{line.substring(3)}</h2>);
        i++;
        continue;
      }
      if (line.startsWith('# ')) {
        blocks.push(<h1 key={i}>{line.substring(2)}</h1>);
        i++;
        continue;
      }
      if (line.startsWith('* ') || line.startsWith('- ')) {
        const listItems = [];
        while(i < lines.length && (lines[i].startsWith('* ') || lines[i].startsWith('- '))) {
          listItems.push(<li key={i}>{lines[i].substring(2)}</li>);
          i++;
        }
        blocks.push(<ul key={`ul-${i}`}>{listItems}</ul>);
        continue;
      }
      if (line.trim() !== '') {
        const paraLines = [];
        while(i < lines.length && lines[i].trim() !== '' && !/^(# |## |[-*] )/.test(lines[i])) {
          paraLines.push(lines[i]);
          i++;
        }
        blocks.push(<p key={i}>{paraLines.join('\n')}</p>);
        continue;
      }
      // It's a blank line, just advance
      i++;
    }
    return blocks;
  };

  return <div className="markdown-content">{renderBlocks()}</div>;
};

export default MarkdownRenderer;
