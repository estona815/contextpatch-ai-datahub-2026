export const VIBERS_SAMPLE_VERSION = 'vibers-synthetic-inventory-2026-09-29-v1';
export const VIBERS_SAMPLES = [
  {
    id: 'issues',
    label: '누락·중복·수량 차이가 있는 파일',
    csv: 'sku,region,expected_qty,counted_qty,unit_cost,currency\nSKU-A01,US-WEST,120,118,8.50,USD\nSKU-A02,US-WEST,45,45,12.00,USD\nSKU-A03,EU-DE,60,66,9.25,EUR\nSKU-A03,EU-DE,60,66,9.25,EUR\nSKU-A04,EU-DE,30,,8.00,EUR\nSKU-A05,KR-SEL,-3,7,4500,KRW\nSKU-A06,US-WEST,20,20,5.00,USD',
  },
  {
    id: 'conflict',
    label: '같은 SKU·지역의 수량이 충돌하는 파일',
    csv: 'sku,region,expected_qty,counted_qty,unit_cost,currency\nSKU-A01,US-WEST,120,118,8.50,USD\nSKU-A03,EU-DE,60,66,9.25,EUR\nSKU-A03,EU-DE,60,61,9.25,EUR\nSKU-A06,US-WEST,20,20,5.00,USD',
  },
  {
    id: 'clean',
    label: '검토 가능한 정상 파일',
    csv: 'sku,region,expected_qty,counted_qty,unit_cost,currency\nSKU-A01,US-WEST,120,118,8.50,USD\nSKU-A02,US-WEST,45,45,12.00,USD\nSKU-A03,EU-DE,60,66,9.25,EUR\nSKU-A04,EU-DE,30,30,8.00,EUR\nSKU-A05,KR-SEL,7,7,4500,KRW',
  },
  {
    id: 'mapping',
    label: '열 이름이 다른 파일 · 직접 연결',
    csv: '상품코드,시장,장부재고,실사재고,매입단가,통화\nSKU-A01,US-WEST,120,118,8.50,USD\nSKU-A03,EU-DE,60,66,9.25,EUR',
  },
];
