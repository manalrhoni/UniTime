import React, { useEffect, useState } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

// --- TYPES ---
interface APISeance {
  id: number;
  course_name: string;
  teacher_name: string;
  room_name: string;
  day: string;
  start_time: string;
  end_time: string;
  type: string;
  group_id?: string; 
}

interface TimeSlot {
  id: string;
  courseId: string;
  roomId: string;
  teacherId: string;
  groupId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  type: string; 
}

interface TimetableGridProps {
  groupId?: string;
  teacherId?: string;
  timeSlots?: any[];
  courses?: any[];
  rooms?: any[];
  teachers?: any[];
  groups?: any[];
}

// --- CONSTANTES ---
const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
const timeRanges = [
  { label: '08:00 - 10:00', start: '08:00' },
  { label: '10:15 - 12:15', start: '10:15' },
  { label: '14:00 - 16:00', start: '14:00' },
  { label: '16:15 - 18:15', start: '16:15' },
];

const typeColors: { [key: string]: string } = {
  cours: 'bg-blue-100 border-blue-300 text-blue-800',
  td: 'bg-green-100 border-green-300 text-green-800',
  tp: 'bg-purple-100 border-purple-300 text-purple-800',
  examen: 'bg-red-100 border-red-300 text-red-800',
  Cours: 'bg-blue-100 border-blue-300 text-blue-800',
  TD: 'bg-green-100 border-green-300 text-green-800',
  TP: 'bg-purple-100 border-purple-300 text-purple-800',
  Examen: 'bg-red-100 border-red-300 text-red-800',
};

export function TimetableGrid({
  groupId,
  teacherId,
  timeSlots,
  courses,
  rooms,
  teachers,
  groups
}: TimetableGridProps) {

  const [localTimeSlots, setLocalTimeSlots] = useState<TimeSlot[]>([]);
  const [localCourses, setLocalCourses] = useState<any[]>([]);
  const [localRooms, setLocalRooms] = useState<any[]>([]);
  const [localTeachers, setLocalTeachers] = useState<any[]>([]);
  
  const isFetchMode = !!(groupId || teacherId) && !timeSlots;
  const [loading, setLoading] = useState(isFetchMode);

  // DÉTECTION DU TYPE D'UTILISATEUR
  const isTeacherView = !!teacherId;  // Si teacherId existe = vue professeur
  const isStudentOrAdminView = !!groupId;  // Si groupId existe = vue étudiant/admin

  const normalizeTime = (backendTime: string) => {
    if (!backendTime) return "08:00";
    if (backendTime.startsWith('08')) return '08:00';
    if (backendTime.startsWith('10')) return '10:15';
    if (backendTime.startsWith('14')) return '14:00';
    if (backendTime.startsWith('16')) return '16:15';
    return backendTime;
  };

  useEffect(() => {
    if (!isFetchMode) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      let url = "";
      if (groupId) url = `http://localhost:8000/timetable/${groupId}`;
      else if (teacherId) url = `http://localhost:8000/timetable/teacher/${teacherId}`;

      try {
        const response = await fetch(url);
        if (response.ok) {
          const apiData: APISeance[] = await response.json();
          
          const newSlots: TimeSlot[] = [];
          const newCourses: any[] = [];
          const newRooms: any[] = [];
          const newTeachers: any[] = [];

          apiData.forEach((item) => {
            let dIndex = days.indexOf(item.day);
            if (dIndex === -1) dIndex = parseInt(item.day);

            newSlots.push({
              id: item.id.toString(),
              courseId: item.id.toString(),
              roomId: item.id.toString(),
              teacherId: item.id.toString(),
              groupId: item.group_id || groupId || "N/A",
              dayOfWeek: dIndex,
              startTime: normalizeTime(item.start_time),
              endTime: item.end_time,
              type: item.type 
            });

            newCourses.push({ id: item.id.toString(), name: item.course_name });
            newRooms.push({ id: item.id.toString(), name: item.room_name });
            newTeachers.push({ id: item.id.toString(), name: item.teacher_name });
          });

          setLocalTimeSlots(newSlots);
          setLocalCourses(newCourses);
          setLocalRooms(newRooms);
          setLocalTeachers(newTeachers);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [groupId, teacherId, isFetchMode]);

  const slotsToUse = isFetchMode ? localTimeSlots : (timeSlots || []);
  const coursesToUse = isFetchMode ? localCourses : (courses || []);
  const roomsToUse = isFetchMode ? localRooms : (rooms || []);
  const teachersToUse = isFetchMode ? localTeachers : (teachers || []);

  const getSlot = (dayOfWeek: number, startTime: string) => {
    return slotsToUse.find(
      slot => slot.dayOfWeek === dayOfWeek && slot.startTime === startTime
    );
  };

  const getColorClass = (type: string | undefined) => {
      if (!type) return typeColors['Cours'];
      return typeColors[type] || typeColors[type.toLowerCase()] || typeColors['Cours'];
  };

  if (loading) return <div className="p-10 text-center text-gray-500">Chargement...</div>;

  return (
    <div className="overflow-x-auto pb-4">
      <div className="min-w-[800px]">
        {/* En-tête des jours */}
        <div className="grid grid-cols-6 gap-2 mb-2">
          <div className="p-3"></div>
          {days.map((day, index) => (
            <div key={index} className="p-3 text-center font-semibold text-slate-300 bg-slate-900/50 rounded-lg border border-slate-700">
              {day}
            </div>
          ))}
        </div>

        {/* Grille */}
        {timeRanges.map((timeRange, timeIndex) => (
          <div key={timeIndex} className="grid grid-cols-6 gap-2 mb-2">
            
            <div className="p-3 flex items-center justify-center bg-slate-900 rounded-lg border border-slate-700 text-slate-300 shadow-sm">
              <span className="text-sm font-medium">{timeRange.label}</span>
            </div>

            {days.map((day, dayIndex) => {
              const slot = getSlot(dayIndex, timeRange.start);
              const course = slot ? coursesToUse.find(c => String(c.id) === String(slot.courseId)) : null;
              const room = slot ? roomsToUse.find(r => String(r.id) === String(slot.roomId)) : null;
              const teacher = slot ? teachersToUse.find(t => String(t.id) === String(slot.teacherId)) : null;
              
              return (
                <div key={dayIndex} className="min-h-[110px]">
                  {slot && course ? (
                    <Card
                      className={`p-3 h-full border-l-4 shadow-md transition-all hover:scale-[1.02] ${getColorClass(slot.type)}`}
                    >
                      <div className="flex flex-col h-full justify-between">
                        {/* BLOC HAUT : Titre et Badge */}
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-sm font-bold leading-tight">{course.name}</span>
                          <Badge variant="secondary" className="text-[10px] px-1 h-5 bg-black/20 text-white font-bold border-none shrink-0">
                            {slot.type ? slot.type.toUpperCase() : 'COURS'}
                          </Badge>
                        </div>
                        
                        {/* BLOC BAS : Affichage conditionnel selon le rôle */}
                        <div className="mt-auto pt-2 space-y-1">
                          
                          {/* 🎯 FILIÈRE : Visible UNIQUEMENT pour les PROFESSEURS */}
                          {isTeacherView && (
                            <div className="text-[11px] font-black text-white-600 uppercase tracking-tight">
                               Filière : {slot.groupId}
                            </div>
                          )}

                          {/* 🏫 SALLE : Visible pour TOUT LE MONDE (Admin, Étudiant, Professeur) */}
                          {room && (
                            <div className="flex items-center text-[11px] font-semibold text-white-700">
                              🏫 {room.name}
                            </div>
                          )}

                          {/* 👨‍🏫 PROFESSEUR : Visible UNIQUEMENT pour ADMIN et ÉTUDIANTS (PAS pour le prof lui-même) */}
                          {isStudentOrAdminView && teacher && (
                            <div className="flex items-center text-[10px] font-medium text-white-500 italic">
                               {teacher.name}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ) : (
                    <div className="h-full bg-slate-900/30 rounded-lg border border-dashed border-slate-800 flex items-center justify-center">
                      <span className="text-xs text-slate-600 select-none">Libre</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Légende */}
      <div className="mt-6 flex flex-wrap gap-4 items-center p-4 bg-slate-900/50 rounded-lg border border-slate-800">
        <span className="text-sm text-slate-400 mr-2">Légende :</span>
        <div className="flex items-center gap-2">
          <div className={`w-4 h-4 rounded bg-blue-100 border border-blue-300`}></div>
          <span className="text-sm text-slate-300">Cours Magistral</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-4 h-4 rounded bg-green-100 border border-green-300`}></div>
          <span className="text-sm text-slate-300">TD</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-4 h-4 rounded bg-purple-100 border border-purple-300`}></div>
          <span className="text-sm text-slate-300">TP / Labo</span>
        </div>
      </div>
    </div>
  );
}