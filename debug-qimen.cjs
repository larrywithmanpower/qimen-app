const qimen = require('qimen-dunjia');
const { generateChartByDatetime } = qimen;

console.log('Keys:', Object.keys(qimen));

const testFormats = [
  '2024020912',
  '2024-02-09 12:00',
  '2024-02-09 12:00:00',
  new Date(),
];

testFormats.forEach(fmt => {
  try {
    console.log(`\nTesting format: ${fmt}`);
    const chart = generateChartByDatetime(fmt);
    console.log('Result keys:', Object.keys(chart || {}));
    if (chart && chart.palaces) {
      console.log('Palaces found!');
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
});
