import { generateChartByDatetime, chartToObject } from 'qimen-dunjia';

try {
  const chart = generateChartByDatetime('2024020912');
  const data = chartToObject(chart);
  
  console.log('Data keys:', Object.keys(data));
  console.log('天盤:', data['天盤']);
  console.log('九星:', data['九星']);
  console.log('八門:', data['天門']); // "天門" seems to be Eight Doors in the code (line 225)
  console.log('八神:', data['八神']);
  
} catch (error) {
  console.error('Error:', error);
}
