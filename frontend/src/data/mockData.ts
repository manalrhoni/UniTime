// Types de données
export type UserRole = 'admin' | 'teacher' | 'student';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  departmentId?: string;
  groupId?: string;
}

export interface Room {
  id: string;
  name: string;
  type: 'classroom' | 'lab' | 'amphitheater';
  capacity: number;
  equipment: string[];
  building: string;
}

export interface Teacher {
  id: string;
  name: string;
  email: string;
  department: string;
  unavailableSlots: string[]; // Format: "YYYY-MM-DD HH:mm"
}

export interface Course {
  id: string;
  name: string;
  type: 'cours' | 'td' | 'tp' | 'examen';
  teacherId: string;
  departmentId: string;
  duration: number; // en heures
  requiredEquipment: string[];
  groupSize: number;
}

export interface TimeSlot {
  id: string;
  courseId: string;
  roomId: string;
  teacherId: string;
  groupId: string;
  dayOfWeek: number; // 0-6 (0 = Lundi)
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  date?: string; // Pour les réservations ponctuelles
  status: 'confirmed' | 'pending' | 'rejected';
}

export interface RoomRequest {
  id: string;
  teacherId: string;
  roomId?: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
  capacity: number;
  equipment: string[];
  status: 'pending' | 'approved' | 'rejected';
}

export interface Department {
  id: string;
  name: string;
  code: string;
}

export interface Group {
  id: string;
  name: string;
  departmentId: string;
  studentCount: number;
}

// Données mockées
export const departments: Department[] = [
  { id: 'd1', name: 'Informatique', code: 'INFO' },
  { id: 'd2', name: 'Mathématiques', code: 'MATH' },
  { id: 'd3', name: 'Physique', code: 'PHY' },
  { id: 'd4', name: 'Chimie', code: 'CHIM' },
];

export const groups: Group[] = [
  { id: 'g1', name: 'INFO L3 - Groupe A', departmentId: 'd1', studentCount: 45 },
  { id: 'g2', name: 'INFO L3 - Groupe B', departmentId: 'd1', studentCount: 42 },
  { id: 'g3', name: 'MATH L2 - Groupe A', departmentId: 'd2', studentCount: 38 },
  { id: 'g4', name: 'PHY L3 - Groupe A', departmentId: 'd3', studentCount: 35 },
  { id: 'g5', name: 'CHIM L2 - Groupe A', departmentId: 'd4', studentCount: 30 },
];

export const rooms: Room[] = [
  { id: 'r1', name: 'Amphi A', type: 'amphitheater', capacity: 200, equipment: ['Projecteur', 'Sono', 'Tableau'], building: 'Bâtiment A' },
  { id: 'r2', name: 'Amphi B', type: 'amphitheater', capacity: 150, equipment: ['Projecteur', 'Sono'], building: 'Bâtiment A' },
  { id: 'r3', name: 'Salle 101', type: 'classroom', capacity: 50, equipment: ['Projecteur', 'Tableau'], building: 'Bâtiment B' },
  { id: 'r4', name: 'Salle 102', type: 'classroom', capacity: 50, equipment: ['Projecteur', 'Tableau'], building: 'Bâtiment B' },
  { id: 'r5', name: 'Salle 103', type: 'classroom', capacity: 45, equipment: ['Tableau'], building: 'Bâtiment B' },
  { id: 'r6', name: 'Lab Info 1', type: 'lab', capacity: 30, equipment: ['Ordinateurs', 'Projecteur'], building: 'Bâtiment C' },
  { id: 'r7', name: 'Lab Info 2', type: 'lab', capacity: 30, equipment: ['Ordinateurs', 'Projecteur'], building: 'Bâtiment C' },
  { id: 'r8', name: 'Lab Chimie 1', type: 'lab', capacity: 25, equipment: ['Paillasse', 'Hotte'], building: 'Bâtiment D' },
  { id: 'r9', name: 'Lab Physique 1', type: 'lab', capacity: 25, equipment: ['Paillasse', 'Oscilloscope'], building: 'Bâtiment D' },
  { id: 'r10', name: 'Salle 201', type: 'classroom', capacity: 40, equipment: ['Projecteur'], building: 'Bâtiment B' },
];

export const teachers: Teacher[] = [
  { id: 't1', name: 'Dr. Karim Benali', email: 'k.benali@univ.ma', department: 'Informatique', unavailableSlots: [] },
  { id: 't2', name: 'Pr. Fatima Zahra El Idrissi', email: 'f.elidrissi@univ.ma', department: 'Informatique', unavailableSlots: [] },
  { id: 't3', name: 'Dr. Ahmed Mansouri', email: 'a.mansouri@univ.ma', department: 'Mathématiques', unavailableSlots: [] },
  { id: 't4', name: 'Pr. Samira Alami', email: 's.alami@univ.ma', department: 'Physique', unavailableSlots: [] },
  { id: 't5', name: 'Dr. Mohamed Tazi', email: 'm.tazi@univ.ma', department: 'Chimie', unavailableSlots: [] },
  { id: 't6', name: 'Dr. Laila Ouazzani', email: 'l.ouazzani@univ.ma', department: 'Informatique', unavailableSlots: [] },
  { id: 't7', name: 'Dr. Youssef Benjelloun', email: 'y.benjelloun@univ.ma', department: 'Mathématiques', unavailableSlots: [] },
  { id: 't8', name: 'Pr. Nadia El Amrani', email: 'n.elamrani@univ.ma', department: 'Physique', unavailableSlots: [] },
];

export const courses: Course[] = [
  { id: 'c1', name: 'Programmation Orientée Objet', type: 'cours', teacherId: 't1', departmentId: 'd1', duration: 2, requiredEquipment: ['Projecteur'], groupSize: 45 },
  { id: 'c2', name: 'POO - TD', type: 'td', teacherId: 't2', departmentId: 'd1', duration: 1.5, requiredEquipment: ['Tableau'], groupSize: 45 },
  { id: 'c3', name: 'POO - TP', type: 'tp', teacherId: 't6', departmentId: 'd1', duration: 2, requiredEquipment: ['Ordinateurs'], groupSize: 30 },
  { id: 'c4', name: 'Base de Données', type: 'cours', teacherId: 't2', departmentId: 'd1', duration: 2, requiredEquipment: ['Projecteur'], groupSize: 45 },
  { id: 'c5', name: 'Base de Données - TP', type: 'tp', teacherId: 't2', departmentId: 'd1', duration: 2, requiredEquipment: ['Ordinateurs'], groupSize: 30 },
  { id: 'c6', name: 'Algorithmes Avancés', type: 'cours', teacherId: 't1', departmentId: 'd1', duration: 2, requiredEquipment: ['Projecteur'], groupSize: 45 },
  { id: 'c7', name: 'Analyse Numérique', type: 'cours', teacherId: 't3', departmentId: 'd2', duration: 2, requiredEquipment: ['Projecteur'], groupSize: 38 },
  { id: 'c8', name: 'Analyse Numérique - TD', type: 'td', teacherId: 't7', departmentId: 'd2', duration: 1.5, requiredEquipment: ['Tableau'], groupSize: 38 },
  { id: 'c9', name: 'Mécanique Quantique', type: 'cours', teacherId: 't4', departmentId: 'd3', duration: 2, requiredEquipment: ['Projecteur'], groupSize: 35 },
  { id: 'c10', name: 'Mécanique Quantique - TP', type: 'tp', teacherId: 't8', departmentId: 'd3', duration: 2, requiredEquipment: ['Paillasse', 'Oscilloscope'], groupSize: 25 },
  { id: 'c11', name: 'Chimie Organique', type: 'cours', teacherId: 't5', departmentId: 'd4', duration: 2, requiredEquipment: ['Projecteur'], groupSize: 30 },
  { id: 'c12', name: 'Chimie Organique - TP', type: 'tp', teacherId: 't5', departmentId: 'd4', duration: 2, requiredEquipment: ['Paillasse', 'Hotte'], groupSize: 25 },
];

export const timeSlots: TimeSlot[] = [
  // Lundi (0)
  { id: 'ts1', courseId: 'c1', roomId: 'r1', teacherId: 't1', groupId: 'g1', dayOfWeek: 0, startTime: '08:00', endTime: '10:00', status: 'confirmed' },
  { id: 'ts2', courseId: 'c4', roomId: 'r3', teacherId: 't2', groupId: 'g1', dayOfWeek: 0, startTime: '10:15', endTime: '12:15', status: 'confirmed' },
  { id: 'ts3', courseId: 'c3', roomId: 'r6', teacherId: 't6', groupId: 'g1', dayOfWeek: 0, startTime: '14:00', endTime: '16:00', status: 'confirmed' },
  
  // Mardi (1)
  { id: 'ts4', courseId: 'c2', roomId: 'r4', teacherId: 't2', groupId: 'g1', dayOfWeek: 1, startTime: '08:00', endTime: '09:30', status: 'confirmed' },
  { id: 'ts5', courseId: 'c6', roomId: 'r1', teacherId: 't1', groupId: 'g1', dayOfWeek: 1, startTime: '10:15', endTime: '12:15', status: 'confirmed' },
  { id: 'ts6', courseId: 'c5', roomId: 'r7', teacherId: 't2', groupId: 'g1', dayOfWeek: 1, startTime: '14:00', endTime: '16:00', status: 'confirmed' },
  
  // Mercredi (2)
  { id: 'ts7', courseId: 'c1', roomId: 'r1', teacherId: 't1', groupId: 'g2', dayOfWeek: 2, startTime: '08:00', endTime: '10:00', status: 'confirmed' },
  { id: 'ts8', courseId: 'c7', roomId: 'r2', teacherId: 't3', groupId: 'g3', dayOfWeek: 2, startTime: '08:00', endTime: '10:00', status: 'confirmed' },
  { id: 'ts9', courseId: 'c9', roomId: 'r3', teacherId: 't4', groupId: 'g4', dayOfWeek: 2, startTime: '10:15', endTime: '12:15', status: 'confirmed' },
  
  // Jeudi (3)
  { id: 'ts10', courseId: 'c11', roomId: 'r5', teacherId: 't5', groupId: 'g5', dayOfWeek: 3, startTime: '08:00', endTime: '10:00', status: 'confirmed' },
  { id: 'ts11', courseId: 'c12', roomId: 'r8', teacherId: 't5', groupId: 'g5', dayOfWeek: 3, startTime: '14:00', endTime: '16:00', status: 'confirmed' },
  { id: 'ts12', courseId: 'c10', roomId: 'r9', teacherId: 't8', groupId: 'g4', dayOfWeek: 3, startTime: '14:00', endTime: '16:00', status: 'confirmed' },
  
  // Vendredi (4)
  { id: 'ts13', courseId: 'c8', roomId: 'r4', teacherId: 't7', groupId: 'g3', dayOfWeek: 4, startTime: '08:00', endTime: '09:30', status: 'confirmed' },
  { id: 'ts14', courseId: 'c4', roomId: 'r3', teacherId: 't2', groupId: 'g2', dayOfWeek: 4, startTime: '10:15', endTime: '12:15', status: 'confirmed' },
];

export const roomRequests: RoomRequest[] = [
  {
    id: 'rr1',
    teacherId: 't1',
    date: '2026-01-15',
    startTime: '16:00',
    endTime: '18:00',
    reason: 'Séance de rattrapage POO',
    capacity: 30,
    equipment: ['Projecteur'],
    status: 'pending'
  },
  {
    id: 'rr2',
    teacherId: 't3',
    roomId: 'r4',
    date: '2026-01-20',
    startTime: '14:00',
    endTime: '16:00',
    reason: 'Examen Analyse Numérique',
    capacity: 40,
    equipment: ['Projecteur'],
    status: 'approved'
  },
];

export const users: User[] = [
  { id: 'u1', name: 'Admin Principal', email: 'admin@univ.ma', role: 'admin' },
  { id: 'u2', name: 'Dr. Karim Benali', email: 'k.benali@univ.ma', role: 'teacher', departmentId: 'd1' },
  { id: 'u3', name: 'Yassine Alaoui', email: 'y.alaoui@etu.univ.ma', role: 'student', groupId: 'g1', departmentId: 'd1' },
  { id: 'u4', name: 'Pr. Fatima Zahra El Idrissi', email: 'f.elidrissi@univ.ma', role: 'teacher', departmentId: 'd1' },
  { id: 'u5', name: 'Sarah Benjelloun', email: 's.benjelloun@etu.univ.ma', role: 'student', groupId: 'g1', departmentId: 'd1' },
];

// Utilisateur par défaut pour les tests
export const defaultUser = users[0]; // Admin

// Notifications pour les étudiants
export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'update';
  title: string;
  message: string;
  date: string;
  groupId?: string;
  departmentId?: string;
}

export const notifications: Notification[] = [
  {
    id: 'n1',
    type: 'update',
    title: 'Modification d\'horaire',
    message: 'Le cours de POO du mercredi est déplacé de 10:15 à 14:00',
    date: '2026-01-10',
    groupId: 'g1',
    departmentId: 'd1'
  },
  {
    id: 'n2',
    type: 'warning',
    title: 'Salle changée',
    message: 'Le TP de Base de Données se tiendra en Lab Info 2 au lieu de Lab Info 1',
    date: '2026-01-12',
    groupId: 'g1',
    departmentId: 'd1'
  },
  {
    id: 'n3',
    type: 'info',
    title: 'Nouvelle séance de rattrapage',
    message: 'Une séance de rattrapage pour Algorithmes Avancés est prévue le 15/01 à 16h00',
    date: '2026-01-08',
    departmentId: 'd1'
  },
  {
    id: 'n4',
    type: 'update',
    title: 'Examen programmé',
    message: 'Examen d\'Analyse Numérique prévu le 20/01 de 14h00 à 16h00 en Salle 102',
    date: '2026-01-05',
    groupId: 'g3',
    departmentId: 'd2'
  }
];