import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { TimetableGrid } from './TimetableGrid';
import { Calendar, Search, Plus, Clock, Printer, History, CheckCircle, XCircle, Clock as ClockIcon, AlertTriangle, LogOut, BookOpen, Users, Bell, MapPin } from 'lucide-react';
import {
  rooms,
  courses as mockCourses,
  teachers,
  groups,
  timeSlots as initialTimeSlots,
  Room,
} from '../data/mockData';
import { toast } from 'sonner';

// 👇 Import du CSS personnalisé
import './Dashboard.css';
import '../notifications.css';  

interface TeacherDashboardProps {
  teacherId: string;
}

// Traduction des jours (Base de données -> Affichage) ---
const daysMap: { [key: string]: number } = {
  "Lundi": 0, "Mardi": 1, "Mercredi": 2, "Jeudi": 3, "Vendredi": 4
};

const daysList = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];

export function TeacherDashboard({ teacherId }: TeacherDashboardProps) {
  // --- ÉTATS ---
  const [dbTimeSlots, setDbTimeSlots] = useState<any[]>([]);
  const [dbCourses, setDbCourses] = useState<any[]>([]); 
  const [dbRooms, setDbRooms] = useState<any[]>([]);  
  const [dbTeachers, setDbTeachers] = useState<any[]>([]);  
  const [dbGroups, setDbGroups] = useState<any[]>([]);  
  const [isLoading, setIsLoading] = useState(true);
  
  const [currentTeacher, setCurrentTeacher] = useState<any>(null);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [globalNotifs, setGlobalNotifs] = useState<any[]>([]); // [POINT 3]

  const savedUser = JSON.parse(localStorage.getItem('user') || '{}');

  // GESTION DES NOTIFICATIONS LUES (Sauvegarde locale)
  const [dismissedNotifs, setDismissedNotifs] = useState<string[]>(() => {
    const saved = localStorage.getItem('teacher_dismissed_notifs');
    return saved ? JSON.parse(saved) : [];
  });

  const handleDismiss = (id: number | string) => {
    const idStr = String(id);
    const newDismissed = [...dismissedNotifs, idStr];
    setDismissedNotifs(newDismissed);
    localStorage.setItem('teacher_dismissed_notifs', JSON.stringify(newDismissed));
    toast.success("Notification marquée comme lue");
  };

  // 1. IDENTIFICATION
  useEffect(() => {
    const fetchIdentityAndData = async () => {
        try {
            const response = await fetch('http://localhost:8000/teachers/');
            if (response.ok) {
                const allTeachers = await response.json();
                
                // Comparaison e-mail (insensible à la casse)
                const found = allTeachers.find((t: any) => 
                    t.email.toLowerCase() === savedUser.email?.toLowerCase()
                );

                if (found) {
                    console.log("Professeur identifié :", found);
                    setCurrentTeacher(found);
                    
                    // Chargement des données avec le VRAI ID
                    await Promise.all([
                        fetchSchedule(found.id),
                        fetchRealCourses(found.id),
                        fetchMyRequests(found.id),
                        fetchRooms(),  
                        fetchTeachers(),  
                        fetchGroups(),
                        fetchGlobalNotifications() // [POINT 3] Charger les notifs admin
                    ]);
                } else {
                    toast.error("Profil enseignant introuvable pour cet email.");
                    // Mode dégradé (ID 1) si non trouvé
                    fetchSchedule(1);
                    fetchRealCourses(1);
                }
            }
        } catch (error) {
            console.error("Erreur connexion:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (savedUser.email) {
        fetchIdentityAndData();
    } else {
        setIsLoading(false);
    }
  }, [savedUser.email]);


  // 2. CHARGER L'EMPLOI DU TEMPS 
  const fetchSchedule = async (realId: number) => {
    try {
      const response = await fetch('http://localhost:8000/seances/');
      if (response.ok) {
        const data = await response.json();
        
        // ---Normalisation robuste ---
        const normalizedData = data.map((s: any) => ({
          ...s,
          // Gestion des jours (string ou int)
          dayOfWeek: daysMap[s.day] !== undefined ? daysMap[s.day] : (s.dayOfWeek || 0),
          startTime: s.start_time || s.heure_debut,
          endTime: s.end_time || s.heure_fin,
          roomId: s.room_id || s.roomId,
          // Gestion de tous les formats d'ID possibles (teacher_id, id_prof...)
          teacherId: String(s.teacher_id || s.id_prof || s.teacherId),
          courseId: s.id_course || s.course_id || s.courseId,
          groupId: s.group_id || s.groupId
        }));
        
        // Filtrage strict : Uniquement les cours de ce prof
        const mySchedule = normalizedData.filter((s: any) => String(s.teacherId) === String(realId));
        setDbTimeSlots(mySchedule);
      }
    } catch (error) {
      console.error("Erreur Schedule:", error);
    }
  };

  // 3. CHARGER LES COURS (Mes Modules)
  const fetchRealCourses = async (realId: number) => {
    try {
        const response = await fetch('http://localhost:8000/courses/');
        if (response.ok) {
            const data = await response.json();
            const myCourses = data.filter((c: any) => c.teacher_id === realId || c.id_prof === realId);
            setDbCourses(myCourses);
        }
    } catch (error) {
        console.error("Erreur Courses:", error);
    }
  };

  // 4. CHARGER LES DEMANDES
  const fetchMyRequests = async (realId: number) => {
    try {
        const response = await fetch('http://localhost:8000/reservations/');
        if (response.ok) {
            const data = await response.json();
            const myData = data.filter((r: any) => r.teacher_id === realId);
            myData.sort((a: any, b: any) => b.id - a.id);
            setMyRequests(myData);
        }
    } catch (error) {
        console.error("Erreur Requests:", error);
    }
  };

  // 5. CHARGER LES SALLES
  const fetchRooms = async () => {
    try {
        const response = await fetch('http://localhost:8000/rooms/');
        if (response.ok) {
            const data = await response.json();
            setDbRooms(data);
        }
    } catch (error) {
        console.error("Erreur Rooms:", error);
    }
  };

  // 6. CHARGER LES PROFESSEURS
  const fetchTeachers = async () => {
    try {
        const response = await fetch('http://localhost:8000/teachers/');
        if (response.ok) {
            const data = await response.json();
            setDbTeachers(data);
        }
    } catch (error) {
        console.error("Erreur Teachers:", error);
    }
  };

  // 7. CHARGER LES GROUPES
  const fetchGroups = async () => {
    try {
        const response = await fetch('http://localhost:8000/groups/');
        if (response.ok) {
            const data = await response.json();
            setDbGroups(data);
        }
    } catch (error) {
        console.error("Erreur Groups:", error);
    }
  };

  // 8. CHARGER NOTIFS GLOBALES (Admin) [POINT 3]
  const fetchGlobalNotifications = async () => {
      try {
          const res = await fetch('http://localhost:8000/notifications/?role=teacher');
          if (res.ok) setGlobalNotifs(await res.json());
      } catch (e) { console.error("Erreur Notifs:", e); }
  };

  const displayName = currentTeacher?.name || savedUser.nom || "Enseignant";
  const displayDept = currentTeacher?.department || "Département";

  // --- ÉTATS UI (Inchangés) ---
  const [activeTab, setActiveTab] = useState("schedule"); // Pour basculer d'onglet
  const [searchDay, setSearchDay] = useState('0');
  const [searchStartTime, setSearchStartTime] = useState('08:00');
  const [searchEndTime, setSearchEndTime] = useState('10:00');
  const [searchCapacity, setSearchCapacity] = useState('');
  const [searchEquipment, setSearchEquipment] = useState('');
  const [availableRooms, setAvailableRooms] = useState<any[]>([]); // Changé Room[] en any[] pour compatibilité

  const [requestDate, setRequestDate] = useState('');
  const [requestStartTime, setRequestStartTime] = useState('08:00');
  const [requestEndTime, setRequestEndTime] = useState('10:00');
  const [requestReason, setRequestReason] = useState('');
  const [requestCapacity, setRequestCapacity] = useState('');
  const [requestEquipment, setRequestEquipment] = useState('');
  // État pour le module lors de la réservation
  const [requestCourseId, setRequestCourseId] = useState('');
  
  // [POINT 5] Stocker la salle trouvée via la recherche
  const [preSelectedRoomId, setPreSelectedRoomId] = useState<number | null>(null);

  const [unavailDate, setUnavailDate] = useState('');
  const [unavailReason, setUnavailReason] = useState('');

  const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];

  // --- LOGIQUE NOTIFICATIONS (COMBINÉE) [POINT 2 & 3] ---
  const notifications = [
    // 1. Alertes Globales (Admin)
    ...globalNotifs.map(n => ({
        id: `glob-${n.id}`,
        title: n.title,
        message: n.message,
        type: n.type === 'alert' ? 'error' : 'info', // Mapping types sonner
        date: new Date(n.created_at).toLocaleDateString()
    })),
    // 2. Réponses aux demandes (Rattrapage accepté/refusé)
    ...myRequests
        .filter(req => req.status !== 'pending')
        .map(req => ({
            id: `req-${req.id}`,
            title: req.status === 'approved' ? 'Demande Validée' : 'Demande Refusée',
            message: `Votre demande pour le ${req.date ? req.date.split('T')[0] : 'date inconnue'} a été ${req.status === 'approved' ? 'acceptée' : 'rejetée'}.`,
            type: req.status === 'approved' ? 'success' : 'error',
            date: new Date().toLocaleDateString()
        }))
  ].filter(n => !dismissedNotifs.includes(n.id))
   .slice(0, 4); // Limiter à 4 notifs

  const handlePrint = () => {
    // Vérification de sécurité
    if (currentTeacher && currentTeacher.id) {
        // On appelle la route SPÉCIALE PROFESSEUR 
        window.open(`http://localhost:8000/export-pdf/teacher/${currentTeacher.id}`, '_blank');
    } else {
        toast.error("Impossible d'imprimer : Identité du prof introuvable.");
    }
  };
  
  const handleLogout = () => {
    localStorage.removeItem('user');
    window.location.href = '/'; 
  };

  const handleSearchRooms = async () => {
    const dayName = daysList[parseInt(searchDay)];
    const params = new URLSearchParams({
        day: dayName,          
        start_time: searchStartTime, 
        end_time: searchEndTime,     
        capacity: searchCapacity || "0"
    });

    try {
        const response = await fetch(`http://127.0.0.1:8000/rooms/search/?${params.toString()}`);
        if (response.ok) {
            const realRooms = await response.json();
            setAvailableRooms(realRooms);
            if (realRooms.length > 0) {
                toast.success(`${realRooms.length} salle(s) libre(s) trouvée(s) !`, { style: { background: '#1e293b', color: '#fff' } });
            } else {
                toast.warning("Aucune salle disponible à cet horaire.");
            }
        } else {
            toast.error("Erreur lors de la recherche");
        }
    } catch (error) {
        toast.error("Erreur de connexion au serveur");
    }
  };

  // [POINT 5] Action "Réserver cette salle" depuis la recherche
  const handleBookRoom = (room: any) => {
      setPreSelectedRoomId(room.id);
      setActiveTab('request'); // Basculer automatiquement vers l'onglet Demande
      // Pré-remplir les horaires
      setRequestStartTime(searchStartTime);
      setRequestEndTime(searchEndTime);
      toast.success(`Salle ${room.name} sélectionnée. Complétez le motif.`);
  };

const handleSubmitRequest = async () => {
    // 1. Vérification des champs
    if (!requestDate || !requestReason || !requestCapacity || !requestCourseId) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (!currentTeacher) {
        toast.error("Erreur: Identité professeur non vérifiée.");
        return;
    }

    // 2. Trouver le module pour récupérer la filière (groupId) [POINT 4 & 7]
    const selectedCourse = dbCourses.find(c => String(c.id) === String(requestCourseId));
    // Fallback si pas de groupe
    const targetGroupId = selectedCourse?.group_id || "G1"; 

    // 3. Préparation du Payload 
    const payload = {
      teacher_id: parseInt(currentTeacher.id), 
      course_id: parseInt(requestCourseId),   
      // [POINT 5] On envoie la salle si elle a été choisie
      room_id: preSelectedRoomId ? preSelectedRoomId : null, 
      group_id: String(targetGroupId), // La filière est envoyée ici
      reason: requestReason,
      date: new Date(requestDate).toISOString(), 
      start_time: requestStartTime,
      end_time: requestEndTime
    };

    try {
      console.log("Envoi de la réservation :", payload);

      const response = await fetch('http://127.0.0.1:8000/reservations/', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        toast.success('Demande envoyée avec succès !');
        // Reset du formulaire
        setRequestDate('');
        setRequestReason('');
        setRequestCapacity('');
        setRequestCourseId('');
        setPreSelectedRoomId(null);
        // Rafraîchir la liste
        fetchMyRequests(currentTeacher.id);
      } else {
        const errorData = await response.json();
        console.error("Détails erreur serveur :", errorData);
        toast.error('Le serveur a refusé la demande. Vérifiez les données.');
      }
    } catch (error) {
      console.error('Erreur connexion :', error);
      toast.error('Impossible de contacter le serveur.');
    }
  };

  const handleUnavailability = async () => {
    if (!unavailDate || !unavailReason) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    if (!currentTeacher) return;

    try {
        const response = await fetch('http://127.0.0.1:8000/unavailabilities/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                teacher_id: currentTeacher.id,
                date: unavailDate,
                reason: unavailReason
            })
        });

        if (response.ok) {
            toast.success("Absence signalée. Vos étudiants seront notifiés.", { style: { background: '#f59e0b', color: '#fff' } });
            setUnavailDate('');
            setUnavailReason('');
        } else {
            toast.error("Erreur lors de l'envoi.");
        }
    } catch (e) {
        toast.error("Erreur de connexion.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status?.toLowerCase()) {
        case 'approved': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1"/> Approuvé</span>;
        case 'rejected': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1"/> Rejeté</span>;
        default: return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><ClockIcon className="w-3 h-3 mr-1"/> En attente</span>;
    }
  };

  return (
    <div className="dashboard-container space-y-6">
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h1 className="mb-2">Espace Enseignant</h1>
          <p className="text-muted-foreground">
            Bonjour Professeur <span className="text-indigo-400 font-bold">{displayName}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handlePrint} variant="outline" className="flex items-center gap-2 border-primary text-primary hover:bg-primary hover:text-white">
            <Printer className="h-4 w-4" /> Imprimer
          </Button>
          <Button onClick={handleLogout} variant="ghost" className="flex items-center gap-2 text-red-600 hover:bg-red-50">
            <LogOut className="h-4 w-4" /> Déconnexion
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">Mes Cours</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold py-4">{dbCourses.length}</div>
                <p className="text-xs text-muted-foreground">Modules enseignés</p>
            </CardContent>
            </Card>

            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">Créneaux / Semaine</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold py-4">{dbTimeSlots.length}</div>
                <p className="text-xs text-muted-foreground">Séances hebdomadaires</p>
            </CardContent>
            </Card>

            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">Département</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold py-4">{displayDept}</div>
                <p className="text-xs text-muted-foreground">Rattachement administratif</p>
            </CardContent>
            </Card>
        </div>

        {/* Colonne de Droite : NOTIFICATIONS (DESIGN ÉTUDIANT RESTAURÉ) */}
        <Card className="h-full bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-white">
                    <Bell className="h-4 w-4 text-yellow-400" /> Notifications
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {notifications.length === 0 ? (
                    <div className="text-xs text-slate-500 italic text-center py-4">Aucune nouvelle notification</div>
                ) : (
                    notifications.map((notif, i) => (
                        <div key={i} className={`p-3 rounded-lg border text-sm space-y-1 ${notif.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200' : 'bg-orange-500/10 border-orange-500/20 text-orange-200'}`}>
                            {/* Titre et Date */}
                            <div className="flex items-center justify-between font-semibold">
                                <span className="flex items-center gap-2">
                                    {notif.type === 'success' ? <CheckCircle className="h-4 w-4"/> : <AlertTriangle className="h-4 w-4"/>}
                                    {notif.title}
                                </span>
                                <span className="text-[10px] opacity-70 border border-current px-1 rounded">{notif.date}</span>
                            </div>
                            
                            {/* Message */}
                            <div className="opacity-80 pl-6 text-xs leading-relaxed">{notif.message}</div>
                            
                            {/* DESIGN MINIMALISTE ÉTUDIANT : Texte cliquable sans soulignement initial */}
                            <div className="flex justify-end mt-1">
                                <span 
                                    onClick={() => handleDismiss(notif.id)} 
                                    className="text-[10px] font-medium cursor-pointer text-current opacity-70 hover:opacity-100 hover:text-white transition-opacity"
                                >
                                    Marquer comme lu
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="print:hidden">
          <TabsTrigger value="schedule">Mon Emploi du Temps</TabsTrigger>
          <TabsTrigger value="search">Rechercher une Salle</TabsTrigger>
          <TabsTrigger value="request">Réservations & Suivi</TabsTrigger>
          <TabsTrigger value="indisponibilite">Signaler Indisponibilité</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-4">
          <Card className="print:border-none print:shadow-none">
            <CardHeader className="print:text-center">
              <CardTitle>Mon emploi du temps personnalisé</CardTitle>
              <CardDescription className="print:hidden text-blue-600">
                Planning synchronisé en temps réel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div id="printable-timetable">
              <TimetableGrid
                timeSlots={dbTimeSlots} 
                courses={dbCourses}     
                rooms={dbRooms}  
                teachers={dbTeachers}
                groups={dbGroups}
                teacherId={currentTeacher?.id ? String(currentTeacher.id) : teacherId}
              /> </div>
            </CardContent>
          </Card>

          <Card className="print:hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5"/> Mes modules</CardTitle>
            </CardHeader>
            <CardContent>
              {dbCourses.length === 0 ? (
                 <div className="text-muted-foreground text-sm italic">Aucun cours assigné pour le moment.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {dbCourses.map(course => {
                        const associatedGroups = Array.from(new Set(
                            dbTimeSlots
                                .filter((s: any) => String(s.courseId) === String(course.id))
                                .map((s: any) => s.groupId)
                        )).filter(Boolean); 

                        return (
                            <div key={course.id} className="flex items-center justify-between p-4 border rounded-xl bg-accent/5 hover:bg-accent/10 transition-all">
                                <div>
                                    <div className="font-bold text-white text-lg">{course.name}</div>
                                    <div className="flex items-center gap-2 text-xs py-2">
                                        <Users className="h-3 w-3 text-indigo-400" />
                                        <span className="text-indigo-300 font-medium">
                                            {associatedGroups.length > 0 
                                                ? `Filières : ${associatedGroups.join(', ')}` 
                                                : "Aucune séance planifiée"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="search" className="space-y-4 print:hidden">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" /> Rechercher une salle vacante
              </CardTitle>
              <CardDescription>Trouvez une salle disponible selon vos critères</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search-day">Jour</Label>
                  <Select value={searchDay} onValueChange={setSearchDay}>
                    <SelectTrigger id="search-day"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-950 border-slate-700 text-white z-50">
                      {daysList.map((day, index) => (
                        <SelectItem key={index} value={index.toString()}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="search-capacity">Capacité minimale</Label>
                  <Input id="search-capacity" type="number" placeholder="Ex: 30" value={searchCapacity} onChange={e => setSearchCapacity(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="search-start">Heure de début</Label>
                  <Select value={searchStartTime} onValueChange={setSearchStartTime}>
                    <SelectTrigger id="search-start"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-950 border-slate-700 text-white z-50">
                      <SelectItem value="08:00">08:00</SelectItem>
                      <SelectItem value="10:15">10:15</SelectItem>
                      <SelectItem value="14:00">14:00</SelectItem>
                      <SelectItem value="16:15">16:15</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="search-end">Heure de fin</Label>
                  <Select value={searchEndTime} onValueChange={setSearchEndTime}>
                    <SelectTrigger id="search-end"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-950 border-slate-700 text-white z-50">
                      <SelectItem value="10:00">10:00</SelectItem>
                      <SelectItem value="12:15">12:15</SelectItem>
                      <SelectItem value="16:00">16:00</SelectItem>
                      <SelectItem value="18:15">18:15</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="search-equipment">Équipements requis</Label>
                  <Input id="search-equipment" placeholder="Ex: Projecteur, Ordinateurs" value={searchEquipment} onChange={e => setSearchEquipment(e.target.value)} />
                </div>
              </div>

              <Button type="button" onClick={handleSearchRooms} className="w-full">
                <Search className="mr-2 h-4 w-4" /> Rechercher
              </Button>

              {availableRooms.length > 0 && (
                <div className="space-y-2 mt-4">
                  <h3 className="text-sm font-bold text-blue-400">Salles disponibles ({availableRooms.length})</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {availableRooms.map(room => (
                      <div key={room.id} className="p-3 border rounded-lg bg-blue-50/10 border-blue-500/30 flex justify-between items-center">
                        <div>
                            <div className="font-bold text-white">{room.name}</div>
                            <div className="text-xs text-muted-foreground">{room.type} ({room.capacity} pl.)</div>
                        </div>
                        {/* [POINT 5] Bouton pour réserver la salle trouvée */}
                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleBookRoom(room)}>
                            <Plus className="w-4 h-4 mr-1" /> Réserver
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="request" className="space-y-4 print:hidden">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" /> Demander une réservation ponctuelle
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* Message si une salle a été pré-sélectionnée depuis la recherche */}
              {preSelectedRoomId && (
                  <div className="bg-green-900/30 border border-green-500 p-3 rounded text-green-300 flex items-center gap-2">
                      <MapPin className="h-4 w-4" /> Salle sélectionnée automatiquement (ID: {preSelectedRoomId})
                  </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="request-date">Date *</Label>
                  <Input id="request-date" type="date" value={requestDate} onChange={e => setRequestDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="request-capacity">Capacité requise *</Label>
                  <Input id="request-capacity" type="number" placeholder="Nombre d'étudiants" value={requestCapacity} onChange={e => setRequestCapacity(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Module concerné *</Label>
                  <Select value={requestCourseId} onValueChange={setRequestCourseId}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner le module" /></SelectTrigger>
                    <SelectContent className="bg-slate-950 text-white z-50">
                      {dbCourses.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="request-start">Heure de début *</Label>
                  <Select value={requestStartTime} onValueChange={setRequestStartTime}>
                    <SelectTrigger id="request-start"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-950 border-slate-700 text-white z-50">
                      <SelectItem value="08:00">08:00</SelectItem>
                      <SelectItem value="10:15">10:15</SelectItem>
                      <SelectItem value="14:00">14:00</SelectItem>
                      <SelectItem value="16:15">16:15</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="request-end">Heure de fin *</Label>
                  <Select value={requestEndTime} onValueChange={setRequestEndTime}>
                    <SelectTrigger id="request-end"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-950 border-slate-700 text-white z-50">
                      <SelectItem value="10:00">10:00</SelectItem>
                      <SelectItem value="12:15">12:15</SelectItem>
                      <SelectItem value="16:00">16:00</SelectItem>
                      <SelectItem value="18:15">18:15</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="request-reason">Motif de la réservation *</Label>
                  <Textarea id="request-reason" placeholder="Ex: Séance de rattrapage..." value={requestReason} onChange={e => setRequestReason(e.target.value)} rows={3} />
                </div>
              </div>
              <Button onClick={handleSubmitRequest} className="w-full"><Plus className="mr-2 h-4 w-4" /> Soumettre la demande</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Suivi de mes demandes (Tracking)</CardTitle>
            </CardHeader>
            <CardContent>
                {myRequests.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">Aucune demande effectuée.</div>
                ) : (
                    <div className="space-y-3">
                        {myRequests.map((req) => (
                            <div key={req.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
                                <div className="space-y-1">
                                    <div className="font-semibold flex items-center gap-2">
                                        {req.reason || req.motif || "Pas de motif"} {getStatusBadge(req.status)}
                                    </div>
                                    <div className="text-sm text-muted-foreground flex items-center gap-4">
                                        <span>📅 {req.date ? req.date.split('T')[0] : ''}</span> <span>⏰ {req.start_time} - {req.end_time}</span>
                                    </div>
                                </div>
                                <div className="mt-2 md:mt-0 text-sm opacity-70">Demande #{req.id}</div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="indisponibilite" className="space-y-4 print:hidden">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-yellow-500" /> Signaler une indisponibilité</CardTitle>
              <CardDescription>Indiquez une absence future pour réajuster le planning automatiquement.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label>Date de l'indisponibilité</Label>
                    <Input type="date" value={unavailDate} onChange={e => setUnavailDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label>Motif / Justification</Label>
                    <Textarea placeholder="Ex: Conférence, Raisons médicales..." value={unavailReason} onChange={e => setUnavailReason(e.target.value)} />
                </div>
                <Button variant="destructive" onClick={handleUnavailability} className="w-full">Signaler mon absence</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


export default TeacherDashboard;