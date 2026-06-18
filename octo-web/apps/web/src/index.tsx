import '@octo/base/src/theme/tokens.css';
import './index.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element #root not found');
}

if (window.location.pathname === '/matter-richcard-preview') {
  import('./dev/richCardPreview/RichCardPreviewApp').then(({ mountRichCardPreview }) => {
    mountRichCardPreview(root);
  });
} else {
  import('./bootstrapOctoApp').then(({ bootstrapOctoApp }) => {
    bootstrapOctoApp();
  });
}
