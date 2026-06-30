import { runVisionCheck } from './src/lib/ai-vision-check';
import fs from 'fs';

async function main() {
  console.log('Reading BangBaoGia.png...');
  const base64Image = fs.readFileSync('BangBaoGia.png', 'base64');
  console.log('Sending image to Kimi Vision via AI Box (base64)...');
  try {
    const result = await runVisionCheck({
      base64Image,
      mimeType: 'image/png',
      expectedName: 'Khách hàng',
      expectedTitle: 'Báo giá dịch vụ',
    });
    console.log('Success! Extracted and Analyzed Result:');
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Error in Vision Check:', err);
  }
}
main();
