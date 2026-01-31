import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { TimetableGrid } from './TimetableGrid';
import { NotificationBadge } from './NotificationBadge';
import { Badge } from './ui/badge';
import { Calendar, Search, BookOpen, Clock, Bell, Printer, LogOut, Building2, AlertTriangle, Info, CheckCircle, X } from 'lucide-react';
import { toast } from 'sonner';

// Style CSS
import './Dashboard.css';
import '../notifications.css';  

interface StudentDashboardProps {
  groupId?: string;
  departmentId?: string;
}

export function StudentDashboard({ groupId: propGroupId }: StudentDashboardProps) {
  // --- ÉTATS (Données venant du Backend) ---
  const [dbTimeSlots, setDbTimeSlots] = useState<any[]>([]);
  const [dbCourses, setDbCourses] = useState<any[]>([]);
  const [dbTeachers, setDbTeachers] = useState<any[]>([]);
  const [dbRooms, setDbRooms] = useState<any[]>([]);
  const [dbGroups, setDbGroups] = useState<any[]>([]);
  
  // État pour les vraies réservations (qui serviront de notifications)
  const [dbReservations, setDbReservations] = useState<any[]>([]);
  // État pour les indisponibilités des professeurs
  const [dbUnavailabilities, setDbUnavailabilities] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'group' | 'filiere'>('group');
  const [realGroupCount, setRealGroupCount] = useState(0);

  // --- RECHERCHE SALLES LIBRES ---
  const [searchDay, setSearchDay] = useState('0');
  const [searchStartTime, setSearchStartTime] = useState('08:00');
  const [searchEndTime, setSearchEndTime] = useState('10:00');
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);

  // AJOUT : GESTION DES NOTIFICATIONS LUES (Sauvegarde locale)
  const [dismissedNotifs, setDismissedNotifs] = useState<string[]>(() => {
    const saved = localStorage.getItem('student_dismissed_notifs');
    return saved ? JSON.parse(saved) : [];
  });

  const handleDismiss = (id: string) => {
    const newDismissed = [...dismissedNotifs, id];
    setDismissedNotifs(newDismissed);
    localStorage.setItem('student_dismissed_notifs', JSON.stringify(newDismissed));
    toast.success("Notification masquée");
  };

  // --- RÉCUPÉRATION DU NOM DE L'UTILISATEUR ---
  const savedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const initialGroupId = savedUser.group_id || propGroupId || "AD";
  
  const [activeGroupId, setActiveGroupId] = useState(initialGroupId);

  // Récupération des infos du groupe (Semestre/Filière - Point 6)
  const currentGroupInfo = dbGroups.find((g:any) => g.name === activeGroupId);
  const displayFiliere = currentGroupInfo?.filiere || "Filière Principale";
  const displaySemester = currentGroupInfo?.semester || savedUser.semester || "S?";

  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);

      // FONCTION DE SÉCURITÉ : Empêche le crash si une table est vide ou absente
      const safeFetch = async (url: string) => {
        try {
          const res = await fetch(url);
          if (!res.ok) return [];
          return await res.json();
        } catch (e) {
          console.error("Erreur de connexion sur : " + url);
          return [];
        }
      };

      try {
        // 1. Récupérer les données de manière isolée pour ne pas tout bloquer
        const seancesData = await safeFetch('http://localhost:8000/seances/');
        const coursesData = await safeFetch('http://localhost:8000/courses/');
        const teachersData = await safeFetch('http://localhost:8000/teachers/');
        const roomsData = await safeFetch('http://localhost:8000/rooms/');
        const groupsData = await safeFetch('http://localhost:8000/groups/');
        const reservationsData = await safeFetch('http://localhost:8000/reservations/');
        const unavailData = await safeFetch('http://localhost:8000/unavailabilities/');

        // 2. Mise à jour des états
        setDbGroups(groupsData);
        setDbCourses(coursesData);
        setDbTeachers(teachersData);
        setDbRooms(roomsData);
        setDbReservations(reservationsData);
        setDbUnavailabilities(unavailData);

        // 3. Traitement de la Filière (AD, MIP...)
        if (groupsData.length > 0) {
            const userGroupExists = groupsData.some((g: any) => g.name === initialGroupId);
            if (!userGroupExists) {
                setActiveGroupId(groupsData[0].name);
                setRealGroupCount(groupsData[0].student_count);
            } else {
                const currentG = groupsData.find((g: any) => g.name === initialGroupId);
                if (currentG) setRealGroupCount(currentG.student_count);
            }
        }

        // 4. Traitement de l'emploi du temps
        const normalized = seancesData.map((s: any) => ({
          ...s,
          id: s.id.toString(),
          dayOfWeek: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"].indexOf(s.day),
          startTime: s.start_time || s.heure_debut,
          endTime: s.end_time || s.heure_fin,
          courseId: String(s.course_id || s.id_course), 
          roomId: String(s.room_id || s.id_salle),
          teacherId: String(s.teacher_id || s.id_prof),
          groupId: s.group_id || s.groupId,
          type: s.type
        }));
        setDbTimeSlots(normalized);

      } catch (error) {
        console.error("Erreur Backend:", error);
        toast.error("Problème de connexion au serveur.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllData();
  }, [initialGroupId]);

  // --- FILTRAGE (Logique Filière/Groupe) ---
  const groupTimeSlots = dbTimeSlots.filter((s: any) => {
    if (!s.groupId) return false;
    const currentFiliere = activeGroupId.split(' ')[0]; 
    if (viewMode === 'filiere') return s.groupId.startsWith(currentFiliere);
    return s.groupId === activeGroupId || s.groupId === currentFiliere;
  });

  // --- STATISTIQUES RÉELLES ---
  const uniqueCourseIds = new Set(groupTimeSlots.map((s: any) => String(s.courseId)));
  const totalMatieresReelles = uniqueCourseIds.size;

  // Modifie cette fonction dans StudentDashboard.tsx
  const handlePrint = () => {
    // On appelle le nouveau générateur PDF Python
    window.open(`http://localhost:8000/export-pdf/${activeGroupId}`, '_blank');
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    window.location.href = '/'; 
  };

  const handleSearchRooms = async (e: React.MouseEvent) => {
    e.preventDefault();
    const daysMap = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
    const dayName = daysMap[parseInt(searchDay)];
    const occupiedRoomIds = dbTimeSlots
      .filter(s => s.day === dayName && s.startTime === searchStartTime)
      .map(s => String(s.roomId));
    const free = dbRooms.filter(r => !occupiedRoomIds.includes(String(r.id)));
    setAvailableRooms(free);
    if (free.length > 0) toast.success(`${free.length} salle(s) trouvée(s)`);
  };

  const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];

  const upcomingClasses = (() => {
    const todayIndex = new Date().getDay() - 1;
    return groupTimeSlots
      .filter((slot: any) => slot.dayOfWeek >= (todayIndex < 0 ? 0 : todayIndex))
      .sort((a: any, b: any) => {
          if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
          return a.startTime.localeCompare(b.startTime);
      })
      .slice(0, 5)
      .map((slot: any) => {
        const course = dbCourses.find(c => String(c.id) === String(slot.courseId));
        const room = dbRooms.find(r => String(r.id) === String(slot.roomId));
        const teacher = dbTeachers.find(t => String(t.id) === String(slot.teacherId));
        return { slot, course, room, teacher };
      });
  })();

  // --- NOTIFICATIONS (Points 2 & 7) ---
  // On combine les réservations acceptées (rattrapages) et les indisponibilités
  const realNotifications = [
    ...dbReservations
        .filter(res => res.status === 'approved' && res.group_id === activeGroupId)
        .map(res => ({
            id: `res-${res.id}`,
            type: 'success',
            title: "Séance ajoutée",
            message: `Nouveau cours de ${res.reason || 'Rattrapage'} ajouté le ${new Date(res.date).toLocaleDateString()} à ${res.start_time}.`,
            date: new Date(res.date).toLocaleDateString()
        })),
    ...dbUnavailabilities
        .filter(un => {
            // On cherche si ce prof a cours avec ce groupe normalement
            // Simplification : on notifie si le prof enseigne à ce groupe
            return true; 
        })
        .map(un => ({
            id: `un-${un.id}`,
            type: 'warning',
            title: "Absence Enseignant",
            message: `Un professeur a signalé une absence : ${un.reason}`,
            date: "Aujourd'hui"
        }))
  ].filter(n => !dismissedNotifs.includes(n.id)).sort((a: any, b: any) => b.id - a.id).slice(0, 4);

  return (
    <div className="dashboard-container space-y-6">
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-white">Espace Étudiant</h1>
          <p className="text-muted-foreground">
            Bonjour, <span className="text-indigo-400 font-semibold">{savedUser.nom || "Étudiant"}</span> — Groupe : {activeGroupId}
          </p>
          
          {/* [POINT 6] Affichage Semestre & Filière */}
          <div className="flex gap-2 mt-2">
             <Badge className="bg-indigo-600 hover:bg-indigo-700">{displayFiliere}</Badge>
             <Badge className="bg-purple-600 hover:bg-purple-700">{displaySemester}</Badge>
          </div>

        </div>
        <div className="flex gap-2">
          <Button onClick={handlePrint} variant="outline" className="flex items-center gap-2 border-indigo-500/50 text-indigo-400">
            <Printer className="h-4 w-4" /> Imprimer
          </Button>
          <Button onClick={handleLogout} variant="ghost" className="flex items-center gap-2 text-red-500 hover:bg-red-50/10 border border-red-500/20">
            <LogOut className="h-4 w-4" /> Déconnexion
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-900/50 border-slate-800 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Cours cette semaine</CardTitle>
            <BookOpen className="h-4 w-4 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white py-4 leading-relaxed">{isLoading ? "..." : groupTimeSlots.length}</div>
            <p className="text-xs text-slate-500">Séances planifiées</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Total Matières</CardTitle>
            <Calendar className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white py-4 leading-relaxed">{isLoading ? "..." : totalMatieresReelles}</div>
            <p className="text-xs text-slate-500">Matières actives</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Effectif Groupe</CardTitle>
            <Clock className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white py-4 leading-relaxed">{isLoading ? "..." : realGroupCount}</div>
            <p className="text-xs text-slate-500">Dans le groupe {activeGroupId}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 bg-slate-900/50 border-slate-800">
            <CardHeader><CardTitle>Prochains cours</CardTitle></CardHeader>
            <CardContent>
            <div className="space-y-3">
                {upcomingClasses.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Aucun cours à venir prochainement.</p>
                ) : (
                upcomingClasses.map(({ slot, course, room, teacher }, index) => (
                    <div key={index} className="flex items-start gap-4 p-3 border border-slate-800 rounded-lg bg-white/5">
                    <div className="flex-shrink-0 w-20 text-center font-bold">
                        <div className="text-sm text-blue-400">{days[slot.dayOfWeek]}</div>
                        <div className="text-xs text-muted-foreground">{slot.startTime}</div>
                    </div>
                    <div className="flex-1 space-y-1">
                        <div className="font-semibold text-white">{course?.name || "Matière"}</div>
                        <div className="text-sm text-muted-foreground">{teacher?.name || "Enseignant non assigné"}</div>
                        <div className="text-sm text-indigo-400 font-medium">{room?.name || "Salle indéfinie"} • {slot.startTime} - {slot.endTime}</div>
                    </div>
                    <div className="flex-shrink-0">
                        <span className="text-xs px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded uppercase font-bold">{(slot.type || "COURS")}</span>
                    </div>
                    </div>
                )))}
            </div>
            </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800 h-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white"><Bell className="h-5 w-5 text-indigo-400" /> Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {realNotifications.length === 0 ? (
                    <div className="text-center text-slate-500 py-8 text-xs italic bg-white/5 rounded-lg">Aucune nouvelle notification.</div>
                ) : (
                    realNotifications.map((notif) => (
                        <div key={notif.id} className={`p-3 rounded-lg border text-sm space-y-1 ${notif.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200' : 'bg-orange-500/10 border-orange-500/20 text-orange-200'}`}>
                            <div className="flex items-center justify-between font-semibold">
                                <span className="flex items-center gap-2">{notif.type === 'success' ? <CheckCircle className="h-4 w-4"/> : <AlertTriangle className="h-4 w-4"/>}{notif.title}</span>
                                <span className="text-[10px] opacity-70 border border-current px-1 rounded">{notif.date}</span>
                            </div>
                            <div className="opacity-80 pl-6 text-xs leading-relaxed">{notif.message}</div>
                            {/* 👇 DESIGN MINIMALISTE : Texte cliquable aligné à droite, sans bouton ni fond */}
                            <div className="flex justify-end mt-1">
                                <span 
                                    onClick={() => handleDismiss(notif.id)} 
                                    className="text-[10px] font-medium cursor-pointer text-current opacity-70 hover:opacity-100 hover:text-white transition-opacity"
                                >
                                    Marquer comme lu
                                </span>
                            </div>
                        </div>
                    )))}
            </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="schedule" className="space-y-4">
        <TabsList className="print:hidden bg-slate-900 border-slate-800">
          <TabsTrigger value="schedule">Emploi du Temps</TabsTrigger>
          <TabsTrigger value="courses">Mes Cours</TabsTrigger>
          <TabsTrigger value="rooms">Salles Libres</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-4">
          <Card className="print:border-none print:shadow-none shadow-md bg-slate-950/50 border-slate-800">
            <CardHeader className="print:text-center flex flex-row items-center justify-between">
              <div><CardTitle>Emploi du temps de {activeGroupId}</CardTitle></div>
              <div className="flex items-center gap-2 print:hidden w-fit bg-slate-900 p-1 rounded-lg border border-slate-800 mr-1">                
                <Label htmlFor="view-mode" className="text-xs text-slate-400 px-2 whitespace-nowrap">Vue :</Label>
                <Select value={viewMode} onValueChange={(val: any) => setViewMode(val)}>
                    <SelectTrigger className="min-w-[180px] border-none bg-transparent text-white focus:ring-0 h-auto py-1 text-xs"><SelectValue /></SelectTrigger>                  
                    <SelectContent className="bg-slate-900 border-slate-700 text-white"><SelectItem value="group">Mon Groupe</SelectItem><SelectItem value="filiere">Ma Filière (Tout)</SelectItem></SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div id="printable-timetable">
                <TimetableGrid timeSlots={groupTimeSlots} courses={dbCourses} rooms={dbRooms} teachers={dbTeachers} groups={dbGroups} groupId={activeGroupId} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="courses" className="space-y-4 print:hidden">
          <Card className="bg-slate-950/50 border-slate-800">
            <CardHeader><CardTitle>Tous mes cours</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {dbCourses.filter(c => uniqueCourseIds.has(String(c.id))).map(course => (
                  <div key={course.id} className="p-4 border border-slate-800 rounded-lg space-y-2 bg-white/5 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div><div className="font-bold text-white text-lg">{course.name}</div><div className="text-sm text-slate-400 font-medium">{dbTeachers.find(t => String(t.id) === String(course.teacher_id))?.name || "Non assigné"}</div></div>
                      <Badge className="bg-indigo-500/20 text-indigo-300 rounded uppercase font-bold border-none">{course.code || "MODULE"}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rooms" className="space-y-4 print:hidden">
          <Card className="bg-slate-950/50 border-slate-800">
            <CardHeader><CardTitle className="flex items-center gap-2 text-white"><Search className="h-5 w-5 text-indigo-400" /> Trouver une salle libre</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label className="text-slate-300">Jour</Label>
                    <Select value={searchDay} onValueChange={setSearchDay}>
                        <SelectTrigger className="bg-slate-900 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700 text-white shadow-xl">{days.map((day, index) => (<SelectItem key={index} value={index.toString()}>{day}</SelectItem>))}</SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label className="text-slate-300">Début</Label>
                    <Select value={searchStartTime} onValueChange={setSearchStartTime}>
                        <SelectTrigger className="bg-slate-900 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700 text-white shadow-xl"><SelectItem value="08:00">08:00</SelectItem><SelectItem value="10:15">10:15</SelectItem><SelectItem value="14:00">14:00</SelectItem></SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label className="text-slate-300">Fin</Label>
                    <Select value={searchEndTime} onValueChange={setSearchEndTime}>
                        <SelectTrigger className="bg-slate-900 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700 text-white shadow-xl"><SelectItem value="10:00">10:00</SelectItem><SelectItem value="12:15">12:15</SelectItem><SelectItem value="16:00">16:00</SelectItem></SelectContent>
                    </Select>
                </div>
              </div>
              <Button type="button" onClick={handleSearchRooms} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 shadow-lg shadow-indigo-500/20"><Search className="mr-2 h-4 w-4" /> Rechercher</Button>
              {availableRooms.length > 0 && (
                <div className="space-y-2 mt-4">
                  <h3 className="text-sm font-semibold text-white">Salles disponibles ({availableRooms.length})</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {availableRooms.map(room => (
                      <div key={room.id} className="p-3 border border-slate-700 rounded-lg space-y-1 bg-slate-900/80 shadow-md">
                        <div className="flex items-center justify-between"><span className="font-bold text-indigo-400">{room.name}</span><span className="text-xs text-slate-400">{room.capacity} places</span></div>
                        <div className="text-sm text-slate-300 flex items-center gap-1"><Building2 className="h-3 w-3"/> {room.type || "Standard"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default StudentDashboard;