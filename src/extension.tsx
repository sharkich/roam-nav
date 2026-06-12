import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { NavPalette } from '~/components/NavPalette';

const CONTAINER_ID = 'roam-nav-root';
const COMMAND_LABEL = 'Open Navigation Palette';

function App() {
  const [isOpen, setOpen] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return <NavPalette isOpen={isOpen} onClose={() => setOpen(false)} />;
}

function onload({ extensionAPI }: { extensionAPI: ExtensionAPI }) {
  const container = document.createElement('div');
  container.id = CONTAINER_ID;
  document.body.appendChild(container);

  ReactDOM.render(<App />, container);

  extensionAPI.ui.commandPalette.addCommand({
    label: COMMAND_LABEL,
    callback: () => {
      const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true });
      document.dispatchEvent(event);
    },
  });
}

function onunload() {
  const container = document.getElementById(CONTAINER_ID);
  if (container) {
    ReactDOM.unmountComponentAtNode(container);
    container.remove();
  }
}

export default { onload, onunload };
