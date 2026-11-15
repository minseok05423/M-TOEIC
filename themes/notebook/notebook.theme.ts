// The notebook theme. `astryx experimental theme editor` wrote this file once and never changes it again.
// The checked settings live in notebook.settings.json and the generated notebook.settings.ts;
// change them with `astryx experimental theme editor set notebook ...`. Add your own changes below: they win over the settings.
import {defineTheme} from '@astryxdesign/core/theme';
import {notebookSettings} from './notebook.settings';

export const notebookTheme = defineTheme({
  extends: notebookSettings,
  name: 'notebook',
});
