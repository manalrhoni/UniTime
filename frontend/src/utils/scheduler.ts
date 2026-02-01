import { TimeSlot, Room, Course, Teacher, Group } from '../data/mockData';

export interface Conflict {
  type: 'room' | 'teacher' | 'group';
  message: string;
  slots: string[];
}

// Vérifier les conflits dans l'emploi du temps
export function detectConflicts(timeSlots: TimeSlot[]): Conflict[] {
  const conflicts: Conflict[] = [];

  // Vérifier les conflits de salles
  const roomSlots = new Map<string, TimeSlot[]>();
  timeSlots.forEach(slot => {
    const key = `${slot.roomId}-${slot.dayOfWeek}-${slot.startTime}`;
    if (!roomSlots.has(key)) {
      roomSlots.set(key, []);
    }
    roomSlots.get(key)!.push(slot);
  });

  roomSlots.forEach((slots, key) => {
    if (slots.length > 1) {
      conflicts.push({
        type: 'room',
        message: `Conflit de salle détecté`,
        slots: slots.map(s => s.id)
      });
    }
  });

  // Vérifier les conflits d'enseignants
  const teacherSlots = new Map<string, TimeSlot[]>();
  timeSlots.forEach(slot => {
    const key = `${slot.teacherId}-${slot.dayOfWeek}-${slot.startTime}`;
    if (!teacherSlots.has(key)) {
      teacherSlots.set(key, []);
    }
    teacherSlots.get(key)!.push(slot);
  });

  teacherSlots.forEach((slots, key) => {
    if (slots.length > 1) {
      conflicts.push({
        type: 'teacher',
        message: `Enseignant déjà occupé à ce créneau`,
        slots: slots.map(s => s.id)
      });
    }
  });

  // Vérifier les conflits de groupes
  const groupSlots = new Map<string, TimeSlot[]>();
  timeSlots.forEach(slot => {
    const key = `${slot.groupId}-${slot.dayOfWeek}-${slot.startTime}`;
    if (!groupSlots.has(key)) {
      groupSlots.set(key, []);
    }
    groupSlots.get(key)!.push(slot);
  });

  groupSlots.forEach((slots, key) => {
    if (slots.length > 1) {
      conflicts.push({
        type: 'group',
        message: `Groupe déjà occupé à ce créneau`,
        slots: slots.map(s => s.id)
      });
    }
  });

  return conflicts;
}

// Trouver la meilleure salle pour un cours
export function findBestRoom(
  course: Course,
  rooms: Room[],
  timeSlots: TimeSlot[],
  dayOfWeek: number,
  startTime: string
): Room | null {
  const occupiedRooms = timeSlots
    .filter(slot => slot.dayOfWeek === dayOfWeek && slot.startTime === startTime)
    .map(slot => slot.roomId);

  const availableRooms = rooms.filter(room => {
    // Vérifier si la salle est disponible
    if (occupiedRooms.includes(room.id)) return false;

    // Vérifier la capacité
    if (room.capacity < course.groupSize) return false;

    // Vérifier les équipements
    const hasAllEquipment = course.requiredEquipment.every(eq =>
      room.equipment.includes(eq)
    );
    if (!hasAllEquipment) return false;

    return true;
  });

  if (availableRooms.length === 0) return null;

  // Trier par capacité (préférer les salles proches de la taille du groupe)
  availableRooms.sort((a, b) => {
    const diffA = Math.abs(a.capacity - course.groupSize);
    const diffB = Math.abs(b.capacity - course.groupSize);
    return diffA - diffB;
  });

  return availableRooms[0];
}

// Trouver les salles vacantes selon des critères
export function findAvailableRooms(
  rooms: Room[],
  timeSlots: TimeSlot[],
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  minCapacity?: number,
  requiredEquipment?: string[]
): Room[] {
  const occupiedRoomIds = timeSlots
    .filter(slot => {
      if (slot.dayOfWeek !== dayOfWeek) return false;
      // Vérifier le chevauchement des horaires
      return (
        (slot.startTime >= startTime && slot.startTime < endTime) ||
        (slot.endTime > startTime && slot.endTime <= endTime) ||
        (slot.startTime <= startTime && slot.endTime >= endTime)
      );
    })
    .map(slot => slot.roomId);

  return rooms.filter(room => {
    if (occupiedRoomIds.includes(room.id)) return false;
    if (minCapacity && room.capacity < minCapacity) return false;
    if (requiredEquipment) {
      const hasAllEquipment = requiredEquipment.every(eq =>
        room.equipment.includes(eq)
      );
      if (!hasAllEquipment) return false;
    }
    return true;
  });
}

// Calculer le taux d'occupation des salles
export function calculateRoomOccupancy(
  rooms: Room[],
  timeSlots: TimeSlot[]
): { roomId: string; roomName: string; occupancyRate: number }[] {
  const slotsPerWeek = 5 * 6; // 5 jours * 6 créneaux de 2h (8h-18h)

  return rooms.map(room => {
    const occupiedSlots = timeSlots.filter(slot => slot.roomId === room.id);
    const occupancyRate = (occupiedSlots.length / slotsPerWeek) * 100;

    return {
      roomId: room.id,
      roomName: room.name,
      occupancyRate: Math.round(occupancyRate)
    };
  });
}

// Générer automatiquement un emploi du temps
export function generateTimetable(
  courses: Course[],
  rooms: Room[],
  groups: Group[],
  teachers: Teacher[]
): TimeSlot[] {
  const timeSlots: TimeSlot[] = [];
  const daySlots = [
    { start: '08:00', end: '10:00' },
    { start: '10:15', end: '12:15' },
    { start: '14:00', end: '16:00' },
    { start: '16:15', end: '18:15' },
  ];

  let slotId = 1;

  courses.forEach(course => {
    // Trouver le groupe correspondant
    const group = groups.find(g => g.departmentId === course.departmentId);
    if (!group) return;

    // Essayer de placer le cours
    for (let day = 0; day < 5; day++) {
      for (const slot of daySlots) {
        const room = findBestRoom(course, rooms, timeSlots, day, slot.start);
        if (room) {
          timeSlots.push({
            id: `gen-${slotId++}`,
            courseId: course.id,
            roomId: room.id,
            teacherId: course.teacherId,
            groupId: group.id,
            dayOfWeek: day,
            startTime: slot.start,
            endTime: slot.end,
            status: 'confirmed'
          });
          return; // Cours placé, passer au suivant
        }
      }
    }
  });

  return timeSlots;
}

// --- POUR L'EXPORT EXCEL ---
export function exportTimetableToCSV(
  timeSlots: TimeSlot[],
  courses: Course[],
  rooms: Room[],
  teachers: Teacher[],
  groups: Group[]
): string {
  const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
  
  // En-têtes du CSV
  let csv = 'Jour,Horaire,Cours,Type,Enseignant,Groupe,Salle\n';

  timeSlots
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime))
    .forEach(slot => {
      // On convertit tout en String pour comparer (String(id) === String(id))
      // Cela répare le problème où l'un est un chiffre (15) et l'autre du texte ("15")
      const course = courses.find(c => String(c.id) === String(slot.courseId));
      const room = rooms.find(r => String(r.id) === String(slot.roomId));
      const teacher = teachers.find(t => String(t.id) === String(slot.teacherId));
      
      // Pour le groupe, on cherche soit par ID, soit par Nom
      const group = groups.find(g => String(g.id) === String(slot.groupId) || g.name === slot.groupId);

      // Préparation des données (gestion des valeurs manquantes)
      // On ajoute des guillemets autour des noms pour éviter de casser le CSV s'il y a des virgules
      const dayName = days[slot.dayOfWeek] || slot.dayOfWeek;
      const timeRange = `${slot.startTime}-${slot.endTime}`;
      const courseName = course ? `"${course.name}"` : "Non défini";
      const courseType = course?.type || "";
      const teacherName = teacher ? `"${teacher.name}"` : "Non assigné";
      const groupName = group ? group.name : (slot.groupId || "Non assigné");
      const roomName = room ? room.name : "Non assignée";

      csv += `${dayName},${timeRange},${courseName},${courseType},${teacherName},${groupName},${roomName}\n`;
    });

  return csv;
}