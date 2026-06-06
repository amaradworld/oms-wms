// Redesigned deck using reference images as slide backgrounds
// Each slide is built as a full-bleed image + thin overlay text boxes
// for things like contact info / client name / date.
// Run: node generate-redesigned-pptx.js
const PptxGenJS = require('pptxgenjs');
const path = require('path');
const fs = require('fs');

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE'; // 13.333 x 7.5 inches
pptx.title = 'SupplyHub — B2B Fulfillment Sales Proposal';
pptx.author = 'GlobalSupply.in';
pptx.company = 'GlobalSupply.in';
pptx.subject = 'WMS & OMS Solution for B2B Fulfillment';

const IMG_DIR = 'C:\\Users\\alokg\\Downloads\\PPT Path';

// Aspect ratio of reference images: looking at file sizes, they appear to be 1920x1080 (16:9).
// pptxgenjs LAYOUT_WIDE is 13.333 x 7.5 inches (also 16:9). So a full-bleed image at
// x:0, y:0, w:13.333, h:7.5 will fit exactly.

function addImageSlide(imageName) {
  const s = pptx.addSlide();
  const imgPath = path.join(IMG_DIR, imageName);
  if (!fs.existsSync(imgPath)) {
    throw new Error(`Image not found: ${imgPath}`);
  }
  s.addImage({ path: imgPath, x: 0, y: 0, w: 13.333, h: 7.5 });
  return s;
}

// 1. Cover
addImageSlide('slide-01.jpg');

// 2. The Challenge
addImageSlide('slide-02.jpg');

// 3. Our Solution (the 6-tile grid)
addImageSlide('slide-03.jpg');

// 4. WMS Key Features
addImageSlide('slide-04.jpg');

// 5. Marketplace Integrations
addImageSlide('slide-05.jpg');

// 6. Measurable Business Impact (40% / 3x / 60% / 99%)
addImageSlide('slide-06.jpg');

// 7. Why Choose GlobalSupply
addImageSlide('slide-07.jpg');

// 8. Implementation Roadmap (4-week plan)
addImageSlide('slide-08.jpg');

// 9. Flexible Engagement Models (Starter / Growth / Enterprise)
addImageSlide('slide-09.jpg');

// 10. Closing — "Ready to Transform Your Fulfillment Operations?"
addImageSlide('slide-10.jpg');

const outFile = path.join('C:\\Users\\alokg\\oms-wms-app\\docs', 'SupplyHub-Redesigned.pptx');
pptx.writeFile({ fileName: outFile }).then(() => {
  const stat = fs.statSync(outFile);
  console.log(`✅ Generated: ${outFile}`);
  console.log(`   Size: ${(stat.size / 1024).toFixed(1)} KB`);
  console.log(`   Slides: 10 (matches your reference deck)`);
}).catch(err => {
  console.error('Error generating PPTX:', err);
  process.exit(1);
});
