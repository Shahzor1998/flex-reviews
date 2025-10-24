import { mdToPdf } from 'md-to-pdf';

const src = 'docs/BriefDocumentation.md';
const dest = 'docs/BriefDocumentation.pdf';

(async () => {
  const result = await mdToPdf({ path: src }, {
    dest,
    pdf_options: {
      format: 'A4',
      margin: '20mm',
      printBackground: true,
    },
  }).catch(err => {
    console.error('Failed to generate PDF:', err);
    process.exit(1);
  });

  if (result) {
    console.log('PDF written to', dest);
  }
})();
