import { createRoot } from 'react-dom/client';
import SidePanel from './sidepanel/SidePanel';

const root = document.getElementById('root');
if (root) createRoot(root).render(<SidePanel />);
