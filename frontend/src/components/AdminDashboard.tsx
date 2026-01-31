import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { TimetableGrid } from './TimetableGrid';
import { RoomOccupancyChart } from './RoomOccupancyChart';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Calendar, 
  Building2, 
  Users, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  Download,
  BarChart3,
  RefreshCw,
  Printer,
  FileText,
  LogOut,
  Plus,
  Trash2,
  Settings,
  Edit,
  Save,
  X,
  UserCheck,
  BookOpen, 
  Image as ImageIcon,
  Bell,
  Search // Utilisé pour l'onglet Recherche
} from 'lucide-react';

// Import de la librairie de capture
import html2canvas from 'html2canvas';

import {
  calculateRoomOccupancy,
  exportTimetableToCSV,
} from '../utils/scheduler';
import { toast } from 'sonner';
import './Dashboard.css';
import '../notifications.css';  // AJOUTER EN DERNIER

// --- UTILITAIRES DE CONVERSION ---
const daysMap: { [key: string]: number } = {
  "Lundi": 0, "Mardi": 1, "Mercredi": 2, "Jeudi": 3, "Vendredi": 4
};

const normalizeTime = (time: string) => {
  if (!time) return "08:00";
  if (time.startsWith('08')) return '08:00';
  if (time.startsWith('10')) return '10:15';
  if (time.startsWith('14')) return '14:00';
  if (time.startsWith('16')) return '16:15';
  return time;
};

const daysList = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];

export function AdminDashboard() {
  // --- ÉTATS ---
  const [dbTimeSlots, setDbTimeSlots] = useState<any[]>([]);
  const [roomRequests, setRoomRequests] = useState<any[]>([]); 
  const [dbConflicts, setDbConflicts] = useState<any[]>([]);
  
  // États pour les données dynamiques
  const [listTeachers, setListTeachers] = useState<any[]>([]);
  const [listRooms, setListRooms] = useState<any[]>([]);
  const [listGroups, setListGroups] = useState<any[]>([]);
  const [listCourses, setListCourses] = useState<any[]>([]);

  // État pour les utilisateurs en attente de validation
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isManageMode, setIsManageMode] = useState(false);
  
  // Filtre pour voir l'emploi du temps par groupe
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");

  // États pour les formulaires de modification (CRUD)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'teacher' | 'room' | 'group' | 'module' | null>(null);
  const [currentEntity, setCurrentEntity] = useState<any>({});

  const [stats, setStats] = useState({
    rooms_count: 0,
    sessions_count: 0,
    students_count: 0,
    teachers_count: 0,
    courses_count: 0
  });

  // États pour les Notifications Globales
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMsg, setNotifMsg] = useState("");
  const [notifTarget, setNotifTarget] = useState("all");

  // [NOUVEAU] États pour la Recherche de Salles
  const [searchDay, setSearchDay] = useState("0");
  const [searchStart, setSearchStart] = useState("08:00");
  const [searchEnd, setSearchEnd] = useState("10:00");
  const [searchCapacity, setSearchCapacity] = useState("0");
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);

  // --- LOGIQUE DE DÉCONNEXION ---
  const handleLogout = () => {
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  // --- RÉCUPÉRATION DES DONNÉES (Back-End) ---
  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      // 1. Récupérer les Groupes en premier (pour le filtre)
      try {
        const resGroups = await fetch('http://localhost:8000/groups/');
        if (resGroups.ok) {
            const gData = await resGroups.json();
            setListGroups(gData);
            // Si on a des groupes et rien de sélectionné, on prend le premier
            if (gData.length > 0 && !selectedGroupId) {
                setSelectedGroupId(gData[0].name); 
            }
        }
      } catch (e) { console.error("Erreur groupes", e); }

      // 2. Récupérer les séances (Emploi du temps)
      const responseSeances = await fetch('http://localhost:8000/seances/');
      if (responseSeances.ok) {
        const data = await responseSeances.json();
        
        // CONVERSION POUR L'AFFICHAGE
        const normalizedData = data.map((s: any) => ({
          ...s,
          dayOfWeek: daysMap[s.day] !== undefined ? daysMap[s.day] : parseInt(s.day),
          startTime: normalizeTime(s.start_time || s.heure_debut), 
          endTime: s.end_time || s.heure_fin,
          roomId: s.room_id || s.roomId,
          teacherId: String(s.teacher_id || s.teacherId),
          courseId: String(s.id_course || s.course_id || s.courseId || "C1"),
          groupId: s.group_id || s.groupId
        }));
        setDbTimeSlots(normalizedData);
      }

      // 3. Récupérer les autres Listes (Salles, Profs, Cours)
      try {
        const resT = await fetch('http://localhost:8000/teachers/');
        if (resT.ok) setListTeachers(await resT.json());
      } catch (e) { console.log("Erreur chargement profs"); }

      try {
        const resR = await fetch('http://localhost:8000/rooms/'); 
        if (resR.ok) setListRooms(await resR.json());
      } catch (e) { console.log("Erreur chargement salles"); }

      try {
        const resC = await fetch('http://localhost:8000/courses/');
        if (resC.ok) setListCourses(await resC.json());
      } catch (e) { console.log("Erreur chargement cours"); }

      // 4. Stats et Réservations
      const responseStats = await fetch('http://localhost:8000/stats/');
      if (responseStats.ok) setStats(await responseStats.json());

      const responseRes = await fetch('http://localhost:8000/reservations/');
      if (responseRes.ok) {
        const dataRes = await responseRes.json();
        setRoomRequests(dataRes.map((r: any) => ({
          id: r.id,
          teacherName: r.teacher_name, 
          teacherId: r.teacher_id.toString(),
          roomId: r.room_id ? r.room_id.toString() : null,
          roomName: r.room_name,
          courseId: r.course_id,
          groupId: r.group_id,
          date: r.date,
          startTime: r.start_time,
          endTime: r.end_time,
          reason: r.reason,
          status: r.status,
          capacity: r.capacity || 30
        })));
      }

      const responseConflicts = await fetch('http://localhost:8000/timetable/conflicts');
      if (responseConflicts.ok) setDbConflicts(await responseConflicts.json());

      const responseUsers = await fetch('http://localhost:8000/admin/users/pending');
      if (responseUsers.ok) setPendingUsers(await responseUsers.json());

    } catch (error) {
      console.error("Erreur de chargement:", error);
      toast.error("Erreur de connexion au serveur backend");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const activeTimeSlots = dbTimeSlots;
  const currentConflicts = dbConflicts;
  const occupancy = calculateRoomOccupancy(listRooms, activeTimeSlots);
  const pendingRequests = roomRequests.filter(r => r.status === 'pending');

  // FILTRE : On ne montre que les cours du groupe sélectionné
  const getFilteredSlots = () => {
      if(!selectedGroupId) return [];
      return activeTimeSlots.filter(s => s.groupId === selectedGroupId);
  };

  // --- ACTIONS (Backend Connecté) ---
  const handleApproveRequest = async (requestId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/reservations/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' })
      });
      if (response.ok) { 
        toast.success('Demande approuvée ! Le professeur et les étudiants seront notifiés.'); 
        fetchAllData(); 
      }
    } catch (e) { toast.error("Erreur connexion"); }
  };

  const handleRejectRequest = async (requestId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/reservations/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' })
      });
      if (response.ok) { toast.error('Rejetée'); fetchAllData(); }
    } catch (e) { toast.error("Erreur connexion"); }
  };

  const handleValidateUser = async (userId: number, email: string) => {
    try {
        const response = await fetch(`http://localhost:8000/admin/users/${userId}/validate`, { method: 'PUT' });
        if(response.ok) { toast.success(`Compte activé pour ${email}`); fetchAllData(); }
    } catch (e) { toast.error("Erreur validation"); }
  };

  const handleRejectUser = async (userId: number) => {
    if(!window.confirm("Supprimer ?")) return;
    try {
        const response = await fetch(`http://localhost:8000/admin/users/${userId}`, { method: 'DELETE' });
        if(response.ok) { toast.success("Utilisateur supprimé"); fetchAllData(); }
    } catch (e) { toast.error("Erreur serveur"); }
  };

  const handleGenerateTimetable = async () => {
    const toastId = toast.loading("Génération intelligente en cours...");
    try {
      const response = await fetch('http://localhost:8000/timetable/generate', { method: 'POST' });
      if (response.ok) {
        const result = await response.json();
        toast.dismiss(toastId);
        toast.success(result.message);
        setTimeout(() => fetchAllData(), 500); // Petit délai pour être sûr que la BDD a fini
      } else { throw new Error("Erreur Backend"); }
    } catch (error) {
      toast.dismiss(toastId);
      toast.error("Erreur lors de la génération");
    }
  };

  const handleExport = () => {
    const csv = exportTimetableToCSV(activeTimeSlots, listCourses, listRooms, listTeachers, listGroups);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'emploi-du-temps.csv'; a.click();
  };

  // FONCTION D'EXPORT IMAGE
  const handleExportImage = async () => {
    const element = document.getElementById('printable-timetable');
    if (!element) {
        toast.error("Veuillez d'abord afficher l'emploi du temps.");
        return;
    }

    try {
        toast.info("Création de l'image...");
        const canvas = await html2canvas(element, {
            backgroundColor: '#1A1625', // Couleur de fond du thème
            scale: 2, // Haute qualité
        });
        
        const image = canvas.toDataURL("image/png");
        const link = document.createElement('a');
        link.href = image;
        link.download = `emploi_du_temps_${selectedGroupId || 'global'}.png`;
        link.click();
        toast.success("Image téléchargée !");
    } catch (error) {
        console.error("Erreur image:", error);
        toast.error("Erreur lors de l'exportation image.");
    }
  };

  // Dans AdminDashboard.tsx
  const handlePrint = () => {
    if (!selectedGroupId) {
        toast.error("Veuillez sélectionner une filière/groupe d'abord.");
        return;
    }
    // On utilise la variable correcte : selectedGroupId
    window.open(`http://localhost:8000/export-pdf/${selectedGroupId}`, '_blank');
  };

  // Fonction pour envoyer une notification globale
  const sendGlobalNotification = async () => {
    if(!notifTitle || !notifMsg) {
        toast.error("Veuillez remplir le titre et le message");
        return;
    }
    try {
        await fetch('http://localhost:8000/notifications/', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                title: notifTitle,
                message: notifMsg,
                type: 'info',
                target_role: notifTarget
            })
        });
        toast.success("Notification envoyée à tous !");
        setNotifTitle(""); 
        setNotifMsg("");
    } catch (e) {
        toast.error("Erreur lors de l'envoi");
    }
  };

  // [NOUVEAU] Logique Recherche Salles
  const handleSearchRooms = async () => {
    const dayName = daysList[parseInt(searchDay)];
    try {
        const url = `http://localhost:8000/rooms/search/?day=${dayName}&start_time=${searchStart}&end_time=${searchEnd}&capacity=${searchCapacity}`;
        const res = await fetch(url);
        if(res.ok) {
            const data = await res.json();
            setAvailableRooms(data);
            if(data.length === 0) toast.info("Aucune salle libre trouvée pour ce créneau.");
            else toast.success(`${data.length} salle(s) trouvée(s).`);
        } else {
            toast.error("Erreur lors de la recherche.");
        }
    } catch(e) {
        toast.error("Erreur de connexion serveur.");
    }
  };

  // --- LOGIQUE CRUD ---
  const openModal = (type: any, entity: any = null) => {
    setModalType(type);
    // Initialisation complète
    setCurrentEntity(entity || { 
        name: '', capacity: '', building: '', equipment: '', email: '', department: '',
        hours_cours: 0, hours_td: 0, hours_tp: 0, student_count: 30, type: 'Standard', group_id: "", teacher_id: ""
    });
    setIsModalOpen(true);
  };

  const handleSaveEntity = async () => {
    if (!modalType) return;

    let url = "http://localhost:8000/admin/";
    let body = {};

    // Préparation des données
    if (modalType === 'teacher') {
        url += "teachers/";
        body = { id: currentEntity.id, name: currentEntity.name, email: currentEntity.email, department: currentEntity.department };
    } else if (modalType === 'room') {
        url += "rooms/";
        body = { 
            id: currentEntity.id,
            name: currentEntity.name, 
            capacity: parseInt(currentEntity.capacity), 
            type: currentEntity.type || "Standard", 
            equipment: currentEntity.equipment 
        };
    } else if (modalType === 'group') {
        url += "groups/";
        body = { id: currentEntity.id, name: currentEntity.name, student_count: parseInt(currentEntity.student_count) };
    } else if (modalType === 'module') {
        url += "courses/";
        // ICI : On envoie bien l'ID du groupe pour faire le lien
        body = { 
            id: currentEntity.id,
            name: currentEntity.name,
            // On s'assure d'envoyer un nombre ou null (pas une chaine vide)
            group_id: currentEntity.group_id ? currentEntity.group_id : null,
            teacher_id: currentEntity.teacher_id ? parseInt(currentEntity.teacher_id) : null,
            hours_cours: parseInt(currentEntity.hours_cours || 0),
            hours_td: parseInt(currentEntity.hours_td || 0),
            hours_tp: parseInt(currentEntity.hours_tp || 0)
        };
    }

    try {
        const response = await fetch(url, {
            method: 'POST', // Le backend gère Creation ET Modification sur POST
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (response.ok) {
            toast.success(`${modalType} enregistré !`);
            setIsModalOpen(false);
            fetchAllData(); 
        } else { toast.error("Erreur lors de la sauvegarde."); }
    } catch (e) { toast.error("Erreur de connexion."); }
  };

  const handleDeleteResource = async (type: string, id: number) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cet élément ?")) return;
    
    let endpointType = "";
    if (type === 'teacher') endpointType = 'teachers';
    if (type === 'room') endpointType = 'rooms';
    if (type === 'group') endpointType = 'groups';
    if (type === 'module') endpointType = 'courses';

    try {
      const response = await fetch(`http://localhost:8000/admin/${endpointType}/${id}`, { method: 'DELETE' });
      if (response.ok) { toast.success("Supprimé"); fetchAllData(); }
      else { toast.error("Erreur suppression"); }
    } catch (e) { toast.error("Erreur de connexion"); }
  };

  const getGroupName = (id: any) => {
      const g = listGroups.find((grp: any) => grp.id === id);
      return g ? g.name : "Non assigné";
  };

  const getTeacherName = (id: any) => {
      const t = listTeachers.find((tch: any) => tch.id === id);
      return t ? t.name : "Non assigné";
  };

  return (
    <div className="dashboard-container space-y-6 relative">
      
      {/* --- MODALE CRUD --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <Card className="w-full max-w-2xl bg-slate-900 border-slate-700 shadow-2xl overflow-visible">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800 pb-4">
              <CardTitle className="text-white text-xl">
                {currentEntity.id ? 'Modifier' : 'Ajouter'} {modalType === 'module' ? 'Module' : modalType}
              </CardTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsModalOpen(false)}
                className="h-10 w-10 p-0 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg shrink-0"
              >
                <X className="h-6 w-6" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-6 pt-6 px-8">
              
              <div className="space-y-2">
                <Label className="text-slate-300 text-base">Nom / Libellé</Label>
                <Input value={currentEntity.name} onChange={(e) => setCurrentEntity({...currentEntity, name: e.target.value})} className="bg-slate-800 border-slate-600 text-white h-11" />
              </div>
              
              {modalType === 'teacher' && (
                  <>
                    <div className="space-y-2">
                        <Label className="text-slate-300">Email</Label>
                        <Input value={currentEntity.email} onChange={(e) => setCurrentEntity({...currentEntity, email: e.target.value})} className="bg-slate-800 border-slate-600 text-white h-11" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-slate-300">Département</Label>
                        <Input value={currentEntity.department} onChange={(e) => setCurrentEntity({...currentEntity, department: e.target.value})} className="bg-slate-800 border-slate-600 text-white h-11" />
                    </div>
                  </>
              )}

              {modalType === 'room' && (
                <>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-slate-300">Capacité</Label>
                            <Input type="number" value={currentEntity.capacity} onChange={(e) => setCurrentEntity({...currentEntity, capacity: e.target.value})} className="bg-slate-800 border-slate-600 text-white h-11" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-300">Type</Label>
                            <Select value={currentEntity.type} onValueChange={(val) => setCurrentEntity({...currentEntity, type: val})}>
                                <SelectTrigger className="bg-slate-800 border-slate-600 text-white h-11"><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Standard">Standard</SelectItem>
                                    <SelectItem value="Amphi">Amphi</SelectItem>
                                    <SelectItem value="Labo Info">Labo Info</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-slate-300">Équipements (ex: PC, Projecteur)</Label>
                        <Input value={currentEntity.equipment} onChange={(e) => setCurrentEntity({...currentEntity, equipment: e.target.value})} className="bg-slate-800 border-slate-600 text-white h-11" />
                    </div>
                </>
              )}

              {modalType === 'group' && (
                  <div className="space-y-2">
                      <Label className="text-slate-300">Effectif (Nombre d'étudiants)</Label>
                      <Input type="number" value={currentEntity.student_count} onChange={(e) => setCurrentEntity({...currentEntity, student_count: e.target.value})} className="bg-slate-800 border-slate-600 text-white h-11" />
                  </div>
              )}

              {modalType === 'module' && (
                  <>
                    <div className="space-y-2">
                        <Label className="text-orange-400 font-bold">Filière / Groupe (Obligatoire)</Label>
                        <select className="w-full bg-slate-800 border-slate-600 text-white rounded-md p-3 h-11" value={currentEntity.group_id || ""} onChange={(e) => setCurrentEntity({...currentEntity, group_id: e.target.value})}>
                            <option value="">-- Sélectionner une filière --</option>
                            {listGroups.map(g => ( <option key={g.id} value={g.id}>{g.name}</option> ))}
                        </select>
                    </div>
                    
                    <div className="space-y-2">
                        <Label className="text-green-400 font-bold">Enseignant responsable</Label>
                        <select className="w-full bg-slate-800 border-slate-600 text-white rounded-md p-3 h-11" value={currentEntity.teacher_id || ""} onChange={(e) => setCurrentEntity({...currentEntity, teacher_id: e.target.value})}>
                            <option value="">-- Automatique (Aléatoire) --</option>
                            {listTeachers.map(t => ( <option key={t.id} value={t.id}>{t.name}</option> ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mt-2">
                        <div className="space-y-1"><Label className="text-sm text-slate-300">H. Cours</Label><Input type="number" value={currentEntity.hours_cours} onChange={(e) => setCurrentEntity({...currentEntity, hours_cours: e.target.value})} className="bg-slate-800 text-white h-11"/></div>
                        <div className="space-y-1"><Label className="text-sm text-slate-300">H. TD</Label><Input type="number" value={currentEntity.hours_td} onChange={(e) => setCurrentEntity({...currentEntity, hours_td: e.target.value})} className="bg-slate-800 text-white h-11"/></div>
                        <div className="space-y-1"><Label className="text-sm text-slate-300">H. TP</Label><Input type="number" value={currentEntity.hours_tp} onChange={(e) => setCurrentEntity({...currentEntity, hours_tp: e.target.value})} className="bg-slate-800 text-white h-11"/></div>
                    </div>
                  </>
              )}

              <div className="flex flex-row gap-4 pt-8 mt-4 border-t border-slate-800">
                <Button onClick={handleSaveEntity} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12">
                  <Save className="mr-2 h-5 w-5" /> Sauvegarder
                </Button>
                <Button onClick={() => setIsModalOpen(false)} variant="outline" className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800 h-12 font-bold">
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* En-tête */}
      <div style={{animationDelay: '0.1s'}} className="animate-slideUp flex justify-between items-start">
        <div>
          <h1 className="mb-2 text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200">
            {isManageMode ? "Gestion des Ressources" : "Tableau de bord Administrateur"}
          </h1>
          <p className="text-muted-foreground">
            {isManageMode ? "Interface de création, modification et suppression (CRUD)" : "Gérez les emplois du temps et les ressources de l'établissement"}
          </p>
        </div>
        <div className="flex gap-2">
            <Button onClick={handlePrint} variant="outline" className="print:hidden border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10">
              <Printer className="mr-2 h-4 w-4" /> Imprimer / PDF
            </Button>
            <Button onClick={handleLogout} variant="ghost" className="print:hidden text-red-500 hover:bg-red-500/10 border border-red-500/20">
              <LogOut className="mr-2 h-4 w-4" /> Déconnexion
            </Button>
        </div>
      </div>

      {/* Statistiques Dynamiques */}
      {!isManageMode && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card style={{animationDelay: '0.2s'}}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inscriptions</CardTitle>
              <UserCheck className="h-4 w-4 text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-400 leading-normal py-1">{pendingUsers.length}</div>
              <p className="text-xs text-muted-foreground">En attente de validation</p>
            </CardContent>
          </Card>

          <Card style={{animationDelay: '0.3s'}}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Créneaux Réservés</CardTitle>
              <Calendar className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold leading-normal py-1">{stats.sessions_count}</div>
              <p className="text-xs text-muted-foreground">Séances planifiées</p>
            </CardContent>
          </Card>

          <Card style={{animationDelay: '0.4s'}} className={currentConflicts.length > 0 ? "border-red-500/50 bg-red-500/5" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conflits</CardTitle>
              <AlertCircle className={`h-4 w-4 ${currentConflicts.length > 0 ? 'text-red-500' : 'text-green-400'}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold leading-normal py-1" style={{color: currentConflicts.length > 0 ? '#ef4444' : 'inherit'}}>
                {currentConflicts.length}
              </div>
              <p className="text-xs text-muted-foreground ">{currentConflicts.length === 0 ? 'Aucun conflit' : 'Détectés par SQL'}</p>
            </CardContent>
          </Card>

          <Card style={{animationDelay: '0.5s'}}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Communauté</CardTitle>
              <Users className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold leading-normal py-1">{stats.students_count + stats.teachers_count}</div>
              <p className="text-xs text-muted-foreground">{stats.teachers_count} Profs, {stats.students_count} Étudiants</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Actions rapides */}
      <div className="flex flex-wrap gap-3 print:hidden" style={{animationDelay: '0.6s'}}>
        <Button onClick={handleGenerateTimetable} className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-lg shadow-indigo-500/20">
          <RefreshCw className="mr-2 h-4 w-4" /> Générer Automatiquement
        </Button>
        
        <Button onClick={() => setIsManageMode(!isManageMode)} variant={isManageMode ? "default" : "outline"} className="border-blue-500 text-blue-400">
          <Settings className="mr-2 h-4 w-4" /> {isManageMode ? "Retour au Dashboard" : "Actualiser / Créer (CRUD)"}
        </Button>

        {!isManageMode && (
          <>
            <Button variant="outline" onClick={handleExport} className="border-green-500/50 text-green-400 hover:bg-green-500/10">
              <FileText className="mr-2 h-4 w-4" /> Exporter Excel
            </Button>
            {/* 👇 LE BOUTON IMAGE, JUSTE À CÔTÉ 👇 */}
            <Button variant="outline" onClick={handleExportImage} className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10">
              <ImageIcon className="mr-2 h-4 w-4" /> Exporter Image
            </Button>
          </>
        )}
      </div>

      {isManageMode ? (
        // --- INTERFACE CRUD ---
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-slideUp">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Enseignants</CardTitle><CardDescription>Gestion des professeurs</CardDescription></div>
              <Button size="sm" className="bg-green-600" onClick={() => openModal('teacher')}><Plus className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {listTeachers.map(t => (
                  <div key={t.id} className="flex justify-between items-center p-3 border border-slate-800 rounded bg-white/5">
                    <div>
                        <span className="font-bold">{t.name}</span>
                        <div className="text-xs text-slate-400">{t.department || t.email}</div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openModal('teacher', t)}><Edit className="h-4 w-4 text-blue-400" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteResource('teacher', parseInt(t.id))}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Salles & Amphis</CardTitle><CardDescription>Capacités et Équipements</CardDescription></div>
              <Button size="sm" className="bg-green-600" onClick={() => openModal('room')}><Plus className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {listRooms.map(r => (
                  <div key={r.id} className="flex justify-between items-center p-3 border border-slate-800 rounded bg-white/5">
                    <div>
                      <span className="font-bold">{r.name}</span>
                      <span className="ml-2 text-xs text-slate-400">({r.capacity} pl.)</span>
                      {r.equipment && <div className="text-[10px] text-cyan-400 uppercase">{r.equipment}</div>}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openModal('room', r)}><Edit className="h-4 w-4 text-blue-400" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteResource('room', r.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Groupes / Filières</CardTitle><CardDescription>Gestion des effectifs</CardDescription></div>
              <Button size="sm" className="bg-green-600" onClick={() => openModal('group')}><Plus className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {listGroups.map(g => (
                  <div key={g.id} className="flex justify-between items-center p-3 border border-slate-800 rounded bg-white/5">
                    <span>{g.name} ({g.student_count} étu.)</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openModal('group', g)}><Edit className="h-4 w-4 text-blue-400" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteResource('group', parseInt(g.id))}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Modules / Matières</CardTitle><CardDescription>Unités d'enseignement</CardDescription></div>
              <Button size="sm" className="bg-green-600" onClick={() => openModal('module')}><Plus className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {listCourses.map(c => (
                  <div key={c.id} className="flex justify-between items-center p-3 border border-slate-800 rounded bg-white/5">
                    <div className="flex flex-col">
                        <span className="font-bold">{c.name}</span>
                        {/* Affiche le prof et la filière */}
                        <span className="text-xs text-orange-400">{getGroupName(c.group_id)} - Resp: {getTeacherName(c.teacher_id)}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openModal('module', c)}><Edit className="h-4 w-4 text-blue-400" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteResource('module', parseInt(c.id))}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        // --- INTERFACE PLANNING ---
        <Tabs defaultValue="timetable" className="space-y-4" style={{animationDelay: '0.7s'}}>
          <TabsList className="print:hidden bg-slate-900 border-slate-800">
            <TabsTrigger value="timetable">Emplois du temps</TabsTrigger>
            <TabsTrigger value="users">Utilisateurs ({pendingUsers.length})</TabsTrigger>
            <TabsTrigger value="requests">Demandes ({roomRequests.length})</TabsTrigger>
            <TabsTrigger value="stats">Statistiques d'occupation</TabsTrigger>
            {/* [MODIF] Ajout de l'onglet Notifications et Salles Libres */}
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="rooms">Salles Libres</TabsTrigger>
          </TabsList>

          <TabsContent value="timetable" className="space-y-4">
             {currentConflicts.length > 0 && (
              <Card className="border-red-500/50 bg-red-900/20">
                <CardHeader>
                  <CardTitle className="text-red-400 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" /> {currentConflicts.length} Conflit(s) détecté(s) par l'algorithme
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {currentConflicts.map((conflict, index) => (
                      <li key={index} className="text-sm text-red-300">• {conflict.message}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <Card className="print:border-none print:shadow-none bg-slate-950/50 border-slate-800">
              <CardHeader className="print:text-center flex flex-row items-center justify-between">
                <CardTitle>Vue globale des filières</CardTitle>
                
                {/* --- FILTRE FILIÈRE AVEC VRAIES DONNÉES --- */}
                <div className="flex items-center gap-2">
                    <Label className="text-slate-300">Filière :</Label>
                    <select 
                        value={selectedGroupId} 
                        onChange={(e) => setSelectedGroupId(e.target.value)}
                        className="bg-slate-900 border border-slate-700 text-white rounded-md p-2 text-sm focus:outline-none focus:border-indigo-500"
                    >
                        {listGroups.length === 0 && <option value="">Chargement...</option>}
                        {listGroups.map(g => (
                            <option key={g.id} value={g.name}>{g.name}</option>
                        ))}
                    </select>
                </div>

              </CardHeader>
              <CardContent>
                <div id="printable-timetable">
                <TimetableGrid
                  groupId="admin"
                  timeSlots={getFilteredSlots()}
                  courses={listCourses}
                  rooms={listRooms}
                  teachers={listTeachers}
                  groups={listGroups}
                /></div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card className="bg-slate-950/50 border-slate-800">
                <CardHeader>
                    <CardTitle>Inscriptions en attente</CardTitle>
                    <CardDescription>Validez les nouveaux comptes étudiants et enseignants</CardDescription>
                </CardHeader>
                <CardContent>
                    {pendingUsers.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            <CheckCircle className="h-10 w-10 mx-auto mb-3 opacity-20" />
                            <p>Aucune inscription en attente.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {pendingUsers.map(user => (
                                <div key={user.id} className="flex flex-col md:flex-row items-center justify-between p-4 border border-slate-800 rounded-lg bg-white/5">
                                    <div className="flex items-center gap-4 mb-3 md:mb-0">
                                        <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold ${user.role === 'enseignant' ? 'bg-purple-900 text-purple-200' : 'bg-blue-900 text-blue-200'}`}>
                                            {(user.name || user.nom) ? (user.name || user.nom).charAt(0).toUpperCase() : '?'}
                                        </div>
                                        <div>
                                            <div className="font-bold text-white">{user.name || user.nom}</div>
                                            <div className="text-sm text-slate-400">
                                                {user.email} • <span className="uppercase text-xs font-semibold">{user.role}</span>
                                                {/* 👇 AJOUT : Affichage de la filière si choisie à l'inscription */}
                                                {user.group_id && <Badge variant="outline" className="ml-2 border-indigo-500 text-indigo-400">{user.group_id}</Badge>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleValidateUser(user.id, user.email)}>
                                            <CheckCircle className="mr-2 h-4 w-4" /> Activer
                                        </Button>
                                        <Button size="sm" variant="destructive" onClick={() => handleRejectUser(user.id)}>
                                            <XCircle className="mr-2 h-4 w-4" /> Rejeter
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests" className="space-y-4 print:hidden">
            <Card className="bg-slate-950/50 border-slate-800">
              <CardHeader>
                <CardTitle>Validation des réservations</CardTitle>
                <CardDescription>Demandes ponctuelles formulées par les enseignants</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {roomRequests.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Aucune demande trouvée.</p>
                  ) : (
                    roomRequests.map(request => (
                        <div key={request.id} className="border rounded-xl p-4 space-y-3 bg-white/5 border-slate-800 hover:border-slate-700 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-lg">{request.teacherName}</span>
                                <Badge variant={request.status === 'pending' ? 'secondary' : request.status === 'approved' ? 'default' : 'destructive'}>
                                  {request.status === 'pending' ? 'En attente' : request.status === 'approved' ? 'Approuvée' : 'Rejetée'}
                                </Badge>
                                {/* Affichage de la filière pour le rattrapage */}
                                {request.groupId && <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Groupe: {request.groupId}</Badge>}
                              </div>
                              {/* Affichage du module concerné */}
                              {request.courseId && (
                                <p className="text-xs text-indigo-400 flex items-center gap-1">
                                  <BookOpen className="h-3 w-3" /> Module : {listCourses.find(c => c.id === request.courseId)?.name || "N/A"}
                                </p>
                              )}
                              <p className="text-sm text-slate-400 italic">Motif: {request.reason}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-slate-300">
                            <div><span className="text-slate-500">Date:</span> {request.date ? request.date.split('T')[0] : 'N/A'}</div>
                            <div><span className="text-slate-500">Horaire:</span> {request.startTime} - {request.endTime}</div>
                            <div><span className="text-slate-500">Capacité:</span> {request.capacity} pers.</div>
                            {request.roomName && (
                              <div><span className="text-slate-500">Salle:</span> {request.roomName}</div>
                            )}
                          </div>

                          {request.status === 'pending' && (
                            <div className="flex gap-2 pt-2 border-t border-slate-800">
                              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/20" onClick={() => handleApproveRequest(request.id)}>
                                <CheckCircle className="mr-2 h-4 w-4" /> Valider
                              </Button>
                              <Button size="sm" variant="destructive" className="shadow-lg shadow-red-900/20" onClick={() => handleRejectRequest(request.id)}>
                                <XCircle className="mr-2 h-4 w-4" /> Rejeter
                              </Button>
                            </div>
                          )}
                        </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <RoomOccupancyChart data={occupancy} />
            <Card className="print:border-none print:shadow-none bg-slate-950/50 border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-indigo-400" /> Taux d'occupation en temps réel</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {occupancy.map(occ => (
                    <div key={occ.roomId} className="space-y-2">
                      <div className="flex justify-between text-sm font-medium text-slate-300">
                        <span>{occ.roomName}</span>
                        <span>{occ.occupancyRate}%</span>
                      </div>
                      <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                        <div className="h-full bg-indigo-500 transition-all shadow-[0_0_15px_rgba(79,70,229,0.4)]" style={{ width: `${occ.occupancyRate}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contenu de l'onglet Notifications (Point 3) */}
          <TabsContent value="notifications">
            <Card className="bg-slate-900 border-slate-700">
                <CardHeader><CardTitle>Envoyer une alerte (Panne, Férié...)</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-slate-300">Titre de l'alerte</Label>
                        <Input 
                            placeholder="Ex: Panne Électricité - Salle 12" 
                            value={notifTitle} 
                            onChange={e => setNotifTitle(e.target.value)} 
                            className="bg-slate-800 border-slate-600 text-white"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-slate-300">Message détaillé</Label>
                        <Input 
                            placeholder="Le cours est déplacé en Amphi B..." 
                            value={notifMsg} 
                            onChange={e => setNotifMsg(e.target.value)} 
                            className="bg-slate-800 border-slate-600 text-white"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-slate-300">Destinataires</Label>
                        <Select onValueChange={setNotifTarget} defaultValue="all">
                            <SelectTrigger className="bg-slate-800 border-slate-600 text-white"><SelectValue placeholder="Cible" /></SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-600 text-white">
                                <SelectItem value="all">Tout le monde</SelectItem>
                                <SelectItem value="student">Étudiants seulement</SelectItem>
                                <SelectItem value="teacher">Profs seulement</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={sendGlobalNotification} className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-lg">
                        <Bell className="w-5 h-5 mr-2" /> Envoyer Notification Immédiate
                    </Button>
                </CardContent>
            </Card>
          </TabsContent>

          {/* [NOUVEAU] Contenu de l'onglet Salles Libres */}
          <TabsContent value="rooms">
            <Card className="bg-slate-900 border-slate-700">
                <CardHeader><CardTitle>Rechercher une salle libre</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label className="text-slate-300">Jour</Label>
                            <Select value={searchDay} onValueChange={setSearchDay}>
                                <SelectTrigger className="bg-slate-800 border-slate-600 text-white"><SelectValue placeholder="Jour" /></SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-600 text-white">
                                    {daysList.map((day, i) => <SelectItem key={i} value={i.toString()}>{day}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-300">Début</Label>
                            <Select value={searchStart} onValueChange={setSearchStart}>
                                <SelectTrigger className="bg-slate-800 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-600 text-white">
                                    <SelectItem value="08:00">08:00</SelectItem>
                                    <SelectItem value="10:15">10:15</SelectItem>
                                    <SelectItem value="14:00">14:00</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-300">Fin</Label>
                            <Select value={searchEnd} onValueChange={setSearchEnd}>
                                <SelectTrigger className="bg-slate-800 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-600 text-white">
                                    <SelectItem value="10:00">10:00</SelectItem>
                                    <SelectItem value="12:15">12:15</SelectItem>
                                    <SelectItem value="16:00">16:00</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-300">Capacité Min.</Label>
                            <Input 
                                type="number" 
                                value={searchCapacity} 
                                onChange={e => setSearchCapacity(e.target.value)} 
                                className="bg-slate-800 border-slate-600 text-white"
                            />
                        </div>
                    </div>
                    
                    <Button onClick={handleSearchRooms} className="w-full bg-indigo-600 hover:bg-indigo-700 h-11">
                        <Search className="w-4 h-4 mr-2" /> Rechercher Salles Disponibles
                    </Button>

                    {availableRooms.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                            {availableRooms.map(room => (
                                <div key={room.id} className="p-4 border border-slate-700 rounded bg-slate-800/50 flex justify-between items-center">
                                    <div>
                                        <h3 className="font-bold text-white">{room.name}</h3>
                                        <p className="text-xs text-slate-400">{room.capacity} places - {room.type}</p>
                                    </div>
                                    <div className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">
                                        Libre
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      )}
    </div>
  );
}

export default AdminDashboard;