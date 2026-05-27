import { standardPrices as defaultStandardPrices } from './standardPrices';

export function checkPriceCompliance(category, standardItemId, price) {
  let activePrices = defaultStandardPrices;
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('da_standard_prices');
    if (saved) {
      try {
        activePrices = JSON.parse(saved);
      } catch (e) {}
    }
  }

  if (!category || standardItemId === 'custom' || !activePrices[category]) {
    return { status: 'custom', standardPrice: null, difference: 0 };
  }

  const items = activePrices[category].items;
  const match = items.find(i => i.id === standardItemId);
  if (!match) {
    return { status: 'custom', standardPrice: null, difference: 0 };
  }

  const standard = match.standardPrice;
  const priceNum = Number(price);

  if (priceNum <= standard) {
    return { status: 'compliant', standardPrice: standard, difference: standard - priceNum };
  } else {
    return { status: 'over', standardPrice: standard, difference: priceNum - standard };
  }
}

export function getCategoryLabel(category) {
  switch (category) {
    case 'computer': return 'ครุภัณฑ์คอมพิวเตอร์';
    case 'office': return 'ครุภัณฑ์สำนักงาน';
    case 'vehicle': return 'ครุภัณฑ์ยานพาหนะและขนส่ง';
    case 'science': return 'ครุภัณฑ์วิทยาศาสตร์การแพทย์';
    case 'construction': return 'ครุภัณฑ์ก่อสร้าง';
    case 'agriculture': return 'ครุภัณฑ์การเกษตร';
    default: return 'ครุภัณฑ์อื่นๆ';
  }
}
