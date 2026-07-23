import type { ShippingZone, ShippingMethod, ShippingRule } from '../../AdminShippingDataSource'

export const MOCK_ZONES: ShippingZone[] = [
  { id: 'zone_001', name: 'Afrique de l\'Ouest', countries: ['CI', 'SN', 'ML', 'BF', 'NE', 'TG', 'BJ'], isActive: true, priority: 1 },
  { id: 'zone_002', name: 'Afrique Centrale', countries: ['CM', 'GA', 'CG', 'CD'], isActive: true, priority: 2 },
  { id: 'zone_003', name: 'Afrique de l\'Est', countries: ['KE', 'UG', 'TZ', 'RW'], isActive: true, priority: 3 },
  { id: 'zone_004', name: 'International', countries: ['FR', 'BE', 'CA', 'US'], isActive: false, priority: 99 },
]

export const MOCK_METHODS: ShippingMethod[] = [
  { id: 'meth_001', zoneId: 'zone_001', name: 'Standard', baseRate: 2500, freeThreshold: 50000, estimatedDaysMin: 2, estimatedDaysMax: 5, isActive: true },
  { id: 'meth_002', zoneId: 'zone_001', name: 'Express', baseRate: 5000, estimatedDaysMin: 1, estimatedDaysMax: 2, isActive: true },
  { id: 'meth_003', zoneId: 'zone_001', name: 'Point Relais', baseRate: 1500, freeThreshold: 30000, estimatedDaysMin: 3, estimatedDaysMax: 6, isActive: true },
  { id: 'meth_004', zoneId: 'zone_002', name: 'Standard', baseRate: 3000, freeThreshold: 60000, estimatedDaysMin: 3, estimatedDaysMax: 7, isActive: true },
  { id: 'meth_005', zoneId: 'zone_002', name: 'Express', baseRate: 6000, estimatedDaysMin: 2, estimatedDaysMax: 4, isActive: true },
  { id: 'meth_006', zoneId: 'zone_003', name: 'Standard', baseRate: 3500, freeThreshold: 70000, estimatedDaysMin: 4, estimatedDaysMax: 8, isActive: true },
  { id: 'meth_007', zoneId: 'zone_004', name: 'Standard International', baseRate: 15000, freeThreshold: 200000, estimatedDaysMin: 7, estimatedDaysMax: 15, isActive: false },
  { id: 'meth_008', zoneId: 'zone_004', name: 'Express International', baseRate: 30000, estimatedDaysMin: 3, estimatedDaysMax: 7, isActive: false },
]

export const MOCK_RULES: ShippingRule[] = [
  { id: 'rule_001', zoneId: 'zone_001', name: 'Petit colis', type: 'weight', minValue: 0, maxValue: 1, rate: 2000, isActive: true },
  { id: 'rule_002', zoneId: 'zone_001', name: 'Colis moyen', type: 'weight', minValue: 1, maxValue: 5, rate: 3500, isActive: true },
  { id: 'rule_003', zoneId: 'zone_001', name: 'Gros colis', type: 'weight', minValue: 5, maxValue: 20, rate: 6000, isActive: true },
  { id: 'rule_004', zoneId: 'zone_001', name: 'Commande < 20000', type: 'price', minValue: 0, maxValue: 20000, rate: 2500, isActive: true },
  { id: 'rule_005', zoneId: 'zone_001', name: 'Commande 20000-50000', type: 'price', minValue: 20000, maxValue: 50000, rate: 1000, isActive: true },
  { id: 'rule_006', zoneId: 'zone_001', name: 'Commande > 50000', type: 'price', minValue: 50000, rate: 0, isActive: true },
  { id: 'rule_007', zoneId: 'zone_002', name: 'Petit colis', type: 'weight', minValue: 0, maxValue: 1, rate: 2500, isActive: true },
  { id: 'rule_008', zoneId: 'zone_002', name: 'Colis moyen', type: 'weight', minValue: 1, maxValue: 5, rate: 4000, isActive: true },
  { id: 'rule_009', zoneId: 'zone_002', name: 'Gros colis', type: 'weight', minValue: 5, rate: 7000, isActive: true },
  { id: 'rule_010', zoneId: 'zone_003', name: 'Frais fixes', type: 'price', minValue: 0, rate: 3500, isActive: true },
  { id: 'rule_011', zoneId: 'zone_003', name: 'Gratuit > 70000', type: 'price', minValue: 70000, rate: 0, isActive: true },
  { id: 'rule_012', zoneId: 'zone_004', name: 'International - poids', type: 'weight', minValue: 0, maxValue: 1, rate: 10000, isActive: false },
]
