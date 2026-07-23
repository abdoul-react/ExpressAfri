import type { DeliveryPerson, DeliveryAssignment } from '../../AdminDeliveryDataSource'

const CI = { code: 'CI', name: "Côte d'Ivoire" }
const SN = { code: 'SN', name: 'Sénégal' }
const ML = { code: 'ML', name: 'Mali' }
const BF = { code: 'BF', name: 'Burkina Faso' }
const CM = { code: 'CM', name: 'Cameroun' }

export const MOCK_DELIVERY_PERSONS: DeliveryPerson[] = [
  {
    id: 'del_001', name: 'Kouamé Adama', phone: '+225 01 02 03 04 05', email: 'kouame.adama@example.com',
    vehicleType: 'bike', country: CI, region: 'Abidjan - Cocody',
    address: 'Cocody Angré, Rue des Bougainvilliers, Villa 12', idCardNumber: 'CI-2019-00123456',
    isActive: true, isVerified: true, rating: 4.8, ratingCount: 42, totalDeliveries: 1240, joinedAt: '2024-03-15T08:00:00Z',
  },
  {
    id: 'del_002', name: 'Koné Moussa', phone: '+225 05 06 07 08 09', email: 'kone.moussa@example.com',
    vehicleType: 'car', country: CI, region: 'Abidjan - Plateau',
    address: 'Plateau, Résidence Les Acacias, Apt 3B', idCardNumber: 'CI-2020-00234567', licensePlate: 'CI-2345-AB',
    isActive: true, isVerified: true, rating: 4.6, ratingCount: 28, totalDeliveries: 876, joinedAt: '2024-06-01T10:00:00Z',
  },
  {
    id: 'del_003', name: 'Diallo Fatoumata', phone: '+225 07 08 09 10 11', email: 'diallo.fatou@example.com',
    vehicleType: 'bike', country: CI, region: 'Abidjan - Marcory',
    address: 'Marcory Zone 4, Cité Verte', idCardNumber: 'CI-2018-00345678',
    isActive: true, isVerified: true, rating: 4.9, ratingCount: 61, totalDeliveries: 1523, joinedAt: '2024-01-10T07:00:00Z',
  },
  {
    id: 'del_004', name: 'Traoré Souleymane', phone: '+225 03 04 05 06 07', email: 'traore.souleymane@example.com',
    vehicleType: 'truck', country: CI, region: 'Abidjan - Yopougon',
    address: 'Yopougon Selmer, Quartier Millionnaire', idCardNumber: 'CI-2021-00456789', licensePlate: 'CI-5678-CD',
    isActive: true, isVerified: false, rating: 4.2, ratingCount: 18, totalDeliveries: 543, joinedAt: '2025-02-20T09:00:00Z',
  },
  {
    id: 'del_005', name: 'Touré Mariam', phone: '+225 09 10 11 12 13', email: 'toure.mariam@example.com',
    vehicleType: 'car', country: CI, region: 'Bouaké',
    isActive: false, isVerified: true, rating: 4.5, ratingCount: 22, totalDeliveries: 678, joinedAt: '2024-09-05T11:00:00Z',
  },
  {
    id: 'del_006', name: 'Cissé Oumar', phone: '+225 02 03 04 05 06', email: 'cisse.oumar@example.com',
    vehicleType: 'bike', country: CI, region: 'Abidjan - Treichville',
    isActive: true, isVerified: true, rating: 4.7, ratingCount: 35, totalDeliveries: 1102, joinedAt: '2024-04-12T08:30:00Z',
  },
  {
    id: 'del_007', name: 'Bamba Salif', phone: '+225 04 05 06 07 08', email: 'bamba.salif@example.com',
    vehicleType: 'truck', country: CI, region: 'Yamoussoukro',
    isActive: true, isVerified: true, rating: 4.4, ratingCount: 14, totalDeliveries: 432, joinedAt: '2025-01-15T10:00:00Z',
  },
  {
    id: 'del_008', name: 'Soro Aïchatou', phone: '+225 06 07 08 09 10', email: 'soro.aichatou@example.com',
    vehicleType: 'bike', country: CI, region: 'Abidjan - Adjamé',
    isActive: false, isVerified: false, rating: 3.9, ratingCount: 9, totalDeliveries: 298, joinedAt: '2025-05-01T08:00:00Z',
  },
  {
    id: 'del_009', name: 'Koffi Yao', phone: '+225 08 09 10 11 12', email: 'koffi.yao@example.com',
    vehicleType: 'car', country: CI, region: 'San-Pédro',
    isActive: true, isVerified: true, rating: 4.3, ratingCount: 19, totalDeliveries: 567, joinedAt: '2024-11-20T09:00:00Z',
  },
  {
    id: 'del_010', name: "N'Guessan Aboubacar", phone: '+225 10 11 12 13 14', email: 'nguessan.abou@example.com',
    vehicleType: 'bike', country: CI, region: 'Abidjan - Koumassi',
    isActive: true, isVerified: true, rating: 4.8, ratingCount: 51, totalDeliveries: 1345, joinedAt: '2024-02-01T07:30:00Z',
  },
  {
    id: 'del_011', name: 'Diomandé Salimata', phone: '+225 11 12 13 14 15', email: 'diomande.salimata@example.com',
    vehicleType: 'car', country: CI, region: 'Korhogo',
    isActive: true, isVerified: false, rating: 4.1, ratingCount: 12, totalDeliveries: 389, joinedAt: '2025-07-10T10:00:00Z',
  },
  {
    id: 'del_012', name: 'Konaté Seydou', phone: '+225 12 13 14 15 16', email: 'konate.seydou@example.com',
    vehicleType: 'truck', country: CI, region: 'Abidjan - Port-Bouët',
    isActive: true, isVerified: true, rating: 4.6, ratingCount: 26, totalDeliveries: 765, joinedAt: '2024-08-15T08:00:00Z',
  },
  // --- Livreurs Sénégal ---
  {
    id: 'del_013', name: 'Diagne Ibrahima', phone: '+221 77 123 45 67', email: 'diagne.ibrahima@example.com',
    vehicleType: 'bike', country: SN, region: 'Dakar - Plateau',
    isActive: true, isVerified: true, rating: 4.7, ratingCount: 30, totalDeliveries: 830, joinedAt: '2024-05-10T09:00:00Z',
  },
  {
    id: 'del_014', name: 'Fall Aminata', phone: '+221 76 234 56 78', email: 'fall.aminata@example.com',
    vehicleType: 'car', country: SN, region: 'Dakar - Médina',
    isActive: true, isVerified: true, rating: 4.5, ratingCount: 21, totalDeliveries: 612, joinedAt: '2024-08-20T10:00:00Z',
  },
  {
    id: 'del_015', name: 'Ndiaye Moustapha', phone: '+221 70 345 67 89', email: 'ndiaye.moustapha@example.com',
    vehicleType: 'bike', country: SN, region: 'Thiès',
    isActive: true, isVerified: false, rating: 4.2, ratingCount: 10, totalDeliveries: 310, joinedAt: '2025-01-05T08:00:00Z',
  },
  // --- Livreurs Mali ---
  {
    id: 'del_016', name: 'Coulibaly Dramane', phone: '+223 76 123 45 67', email: 'coulibaly.dramane@example.com',
    vehicleType: 'bike', country: ML, region: 'Bamako - ACI',
    isActive: true, isVerified: true, rating: 4.4, ratingCount: 17, totalDeliveries: 490, joinedAt: '2024-09-15T07:00:00Z',
  },
  {
    id: 'del_017', name: 'Sissoko Fatoumata', phone: '+223 65 234 56 78', email: 'sissoko.fatoumata@example.com',
    vehicleType: 'car', country: ML, region: 'Bamako - Hippodrome',
    isActive: false, isVerified: true, rating: 4.6, ratingCount: 13, totalDeliveries: 375, joinedAt: '2024-11-01T10:00:00Z',
  },
  // --- Livreurs Burkina Faso ---
  {
    id: 'del_018', name: 'Ouédraogo Adama', phone: '+226 70 123 45 67', email: 'ouedraogo.adama@example.com',
    vehicleType: 'bike', country: BF, region: 'Ouagadougou - Ouaga 2000',
    isActive: true, isVerified: true, rating: 4.3, ratingCount: 15, totalDeliveries: 420, joinedAt: '2024-07-20T08:00:00Z',
  },
  // --- Livreurs Cameroun ---
  {
    id: 'del_019', name: 'Mbarga Jean', phone: '+237 6 71 23 45 67', email: 'mbarga.jean@example.com',
    vehicleType: 'car', country: CM, region: 'Douala - Akwa',
    isActive: true, isVerified: true, rating: 4.5, ratingCount: 20, totalDeliveries: 560, joinedAt: '2024-06-10T09:00:00Z',
  },
  {
    id: 'del_020', name: 'Biya Clarisse', phone: '+237 6 52 34 56 78', email: 'biya.clarisse@example.com',
    vehicleType: 'truck', country: CM, region: 'Yaoundé - Centre',
    isActive: true, isVerified: false, rating: 4.1, ratingCount: 8, totalDeliveries: 280, joinedAt: '2025-03-01T10:00:00Z',
  },
]

export const MOCK_DELIVERY_ASSIGNMENTS: DeliveryAssignment[] = [
  { id: 'ass_001', deliveryPersonId: 'del_001', deliveryPersonName: 'Kouamé Adama', orderId: 'ord_101', orderNumber: 'EX-2026-00101', customerName: 'Marie Koné', customerAddress: 'Cocody, Rue des Jardins', status: 'delivered', assignedAt: '2026-07-10T08:00:00Z', pickedUpAt: '2026-07-10T09:15:00Z', deliveredAt: '2026-07-10T11:30:00Z' },
  { id: 'ass_002', deliveryPersonId: 'del_001', deliveryPersonName: 'Kouamé Adama', orderId: 'ord_102', orderNumber: 'EX-2026-00102', customerName: 'Jean Traoré', customerAddress: 'Cocody, Angré', status: 'in-transit', assignedAt: '2026-07-12T07:30:00Z', pickedUpAt: '2026-07-12T08:45:00Z' },
  { id: 'ass_003', deliveryPersonId: 'del_001', deliveryPersonName: 'Kouamé Adama', orderId: 'ord_103', orderNumber: 'EX-2026-00103', customerName: 'Aminata Diallo', customerAddress: 'Cocody, Danga', status: 'assigned', assignedAt: '2026-07-14T10:00:00Z' },
  { id: 'ass_004', deliveryPersonId: 'del_002', deliveryPersonName: 'Koné Moussa', orderId: 'ord_201', orderNumber: 'EX-2026-00201', customerName: 'Paul Koffi', customerAddress: 'Plateau, Avenue Botreau', status: 'delivered', assignedAt: '2026-07-09T09:00:00Z', pickedUpAt: '2026-07-09T10:00:00Z', deliveredAt: '2026-07-09T12:15:00Z' },
  { id: 'ass_005', deliveryPersonId: 'del_002', deliveryPersonName: 'Koné Moussa', orderId: 'ord_202', orderNumber: 'EX-2026-00202', customerName: "Sophie N'Guessan", customerAddress: 'Plateau, Rue des Banques', status: 'picked-up', assignedAt: '2026-07-13T08:00:00Z', pickedUpAt: '2026-07-13T09:30:00Z' },
  { id: 'ass_006', deliveryPersonId: 'del_002', deliveryPersonName: 'Koné Moussa', orderId: 'ord_203', orderNumber: 'EX-2026-00203', customerName: 'David Yapi', customerAddress: 'Plateau, Cité administrative', status: 'assigned', assignedAt: '2026-07-14T07:00:00Z' },
  { id: 'ass_007', deliveryPersonId: 'del_003', deliveryPersonName: 'Diallo Fatoumata', orderId: 'ord_301', orderNumber: 'EX-2026-00301', customerName: 'Fatima Koné', customerAddress: 'Marcory, Zone 4', status: 'in-transit', assignedAt: '2026-07-12T06:00:00Z', pickedUpAt: '2026-07-12T07:20:00Z' },
  { id: 'ass_008', deliveryPersonId: 'del_003', deliveryPersonName: 'Diallo Fatoumata', orderId: 'ord_302', orderNumber: 'EX-2026-00302', customerName: 'Ibrahim Cissé', customerAddress: 'Marcory, Anoumabo', status: 'delivered', assignedAt: '2026-07-11T10:00:00Z', pickedUpAt: '2026-07-11T11:00:00Z', deliveredAt: '2026-07-11T13:45:00Z' },
  { id: 'ass_009', deliveryPersonId: 'del_004', deliveryPersonName: 'Traoré Souleymane', orderId: 'ord_401', orderNumber: 'EX-2026-00401', customerName: 'Alima Ouattara', customerAddress: 'Yopougon, Sogephia', status: 'failed', assignedAt: '2026-07-10T08:30:00Z', pickedUpAt: '2026-07-10T09:00:00Z', notes: 'Client absent après 3 tentatives' },
  { id: 'ass_010', deliveryPersonId: 'del_005', deliveryPersonName: 'Touré Mariam', orderId: 'ord_501', orderNumber: 'EX-2026-00501', customerName: 'Mamadou Diaby', customerAddress: 'Bouaké, Air France', status: 'delivered', assignedAt: '2026-07-08T07:00:00Z', pickedUpAt: '2026-07-08T08:30:00Z', deliveredAt: '2026-07-08T10:00:00Z' },
  { id: 'ass_011', deliveryPersonId: 'del_005', deliveryPersonName: 'Touré Mariam', orderId: 'ord_502', orderNumber: 'EX-2026-00502', customerName: 'Adama Bamba', customerAddress: 'Bouaké, Belleville', status: 'assigned', assignedAt: '2026-07-13T09:00:00Z' },
  { id: 'ass_012', deliveryPersonId: 'del_006', deliveryPersonName: 'Cissé Oumar', orderId: 'ord_601', orderNumber: 'EX-2026-00601', customerName: 'Kady Touré', customerAddress: 'Treichville, Rue 12', status: 'delivered', assignedAt: '2026-07-11T07:30:00Z', pickedUpAt: '2026-07-11T08:45:00Z', deliveredAt: '2026-07-11T10:15:00Z' },
  { id: 'ass_013', deliveryPersonId: 'del_006', deliveryPersonName: 'Cissé Oumar', orderId: 'ord_602', orderNumber: 'EX-2026-00602', customerName: 'Lassina Konaté', customerAddress: 'Treichville, Rue du Commerce', status: 'picked-up', assignedAt: '2026-07-14T07:00:00Z', pickedUpAt: '2026-07-14T08:30:00Z' },
  { id: 'ass_014', deliveryPersonId: 'del_007', deliveryPersonName: 'Bamba Salif', orderId: 'ord_701', orderNumber: 'EX-2026-00701', customerName: 'Yao Kouassi', customerAddress: 'Yamoussoukro, Habitat', status: 'delivered', assignedAt: '2026-07-09T08:00:00Z', pickedUpAt: '2026-07-09T09:00:00Z', deliveredAt: '2026-07-09T11:30:00Z' },
  { id: 'ass_015', deliveryPersonId: 'del_008', deliveryPersonName: 'Soro Aïchatou', orderId: 'ord_801', orderNumber: 'EX-2026-00801', customerName: 'Bintou Koné', customerAddress: 'Adjamé, Liberté', status: 'in-transit', assignedAt: '2026-07-12T09:00:00Z', pickedUpAt: '2026-07-12T10:15:00Z' },
  { id: 'ass_016', deliveryPersonId: 'del_009', deliveryPersonName: 'Koffi Yao', orderId: 'ord_901', orderNumber: 'EX-2026-00901', customerName: 'Emmanuel Drogba', customerAddress: 'San-Pédro, Cité Félix', status: 'delivered', assignedAt: '2026-07-10T06:30:00Z', pickedUpAt: '2026-07-10T07:45:00Z', deliveredAt: '2026-07-10T09:00:00Z' },
  { id: 'ass_017', deliveryPersonId: 'del_010', deliveryPersonName: "N'Guessan Aboubacar", orderId: 'ord_1001', orderNumber: 'EX-2026-01001', customerName: 'Moussa Fofana', customerAddress: 'Koumassi, Camp Militaire', status: 'delivered', assignedAt: '2026-07-11T08:00:00Z', pickedUpAt: '2026-07-11T09:30:00Z', deliveredAt: '2026-07-11T12:00:00Z' },
  { id: 'ass_018', deliveryPersonId: 'del_010', deliveryPersonName: "N'Guessan Aboubacar", orderId: 'ord_1002', orderNumber: 'EX-2026-01002', customerName: 'Rokia Diallo', customerAddress: 'Koumassi, Abattoir', status: 'assigned', assignedAt: '2026-07-14T08:00:00Z' },
  { id: 'ass_019', deliveryPersonId: 'del_012', deliveryPersonName: 'Konaté Seydou', orderId: 'ord_1201', orderNumber: 'EX-2026-01201', customerName: 'Hassan Ouédraogo', customerAddress: 'Port-Bouët, Vridi', status: 'in-transit', assignedAt: '2026-07-13T07:00:00Z', pickedUpAt: '2026-07-13T08:15:00Z' },
  { id: 'ass_020', deliveryPersonId: 'del_012', deliveryPersonName: 'Konaté Seydou', orderId: 'ord_1202', orderNumber: 'EX-2026-01202', customerName: 'Christiane Yao', customerAddress: 'Port-Bouët, Gonzague', status: 'delivered', assignedAt: '2026-07-11T10:00:00Z', pickedUpAt: '2026-07-11T11:00:00Z', deliveredAt: '2026-07-11T13:00:00Z' },
  // --- Assignations Sénégal ---
  { id: 'ass_021', deliveryPersonId: 'del_013', deliveryPersonName: 'Diagne Ibrahima', orderId: 'ord_1301', orderNumber: 'EX-2026-01301', customerName: 'Fatou Sow', customerAddress: 'Dakar, Plateau - Rue Vincens', status: 'delivered', assignedAt: '2026-07-10T08:00:00Z', pickedUpAt: '2026-07-10T09:00:00Z', deliveredAt: '2026-07-10T11:00:00Z' },
  { id: 'ass_022', deliveryPersonId: 'del_014', deliveryPersonName: 'Fall Aminata', orderId: 'ord_1401', orderNumber: 'EX-2026-01401', customerName: 'Omar Diop', customerAddress: 'Dakar, Médina - Allées Papa Guèye', status: 'assigned', assignedAt: '2026-07-14T09:00:00Z' },
]
