from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from sqlalchemy.exc import OperationalError
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime
import time
import random 
import os
from dotenv import load_dotenv

load_dotenv()

# --- IMPORT EMAIL ---
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType

# Imports internes
from .database import engine, get_db, Base
# [MODIF] Ajout de GlobalNotification dans l'import pour le Point 3
from .models.models import User, Teacher, Room, Group, Course, TimeSlot, Reservation, Unavailability, GlobalNotification

from fastapi.responses import FileResponse 
from fpdf import FPDF 

# =====================================================================
# 🛡️ SÉCURITÉ : ATTENTE BDD (Empêche le crash au démarrage)
# =====================================================================
MAX_RETRIES = 10
RETRY_DELAY = 5

print("⏳ Connexion à la base de données...")
for i in range(MAX_RETRIES):
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Base de données connectée et prête !")
        break
    except OperationalError:
        if i == MAX_RETRIES - 1:
            print("❌ Erreur critique : Impossible de se connecter à la BDD.")
            raise
        print(f"⚠️ La BDD n'est pas prête. Tentative {i+1}/{MAX_RETRIES} dans {RETRY_DELAY}s...")
        time.sleep(RETRY_DELAY)

app = FastAPI(title="UniTime API", version="1.0.0")

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================================
# 📧 CONFIGURATION EMAIL
# =====================================================================
conf = ConnectionConfig(
    MAIL_USERNAME = os.getenv("MAIL_USERNAME"),
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD"),
    MAIL_FROM = os.getenv("MAIL_FROM"),
    MAIL_PORT = 587,
    MAIL_SERVER = "smtp.gmail.com",
    MAIL_STARTTLS = True,
    MAIL_SSL_TLS = False,
    USE_CREDENTIALS = True,
    VALIDATE_CERTS = True
)

# =====================================================================
# SCHÉMAS
# =====================================================================
class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str 
    group_id: Optional[str] = None # Récupère la filière choisie

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class NewPasswordRequest(BaseModel):
    email: EmailStr
    new_password: str

class SeanceDisplay(BaseModel):
    id: int
    course_name: str
    teacher_name: str
    room_name: str
    day: str      
    start_time: str 
    end_time: str   
    type: str
    group_id: Optional[str] = None 

class ReservationCreate(BaseModel):
    teacher_id: int
    room_id: Optional[int] = None
    # [MODIF] Ajout des champs pour le contexte (Points 4 & 7)
    course_id: Optional[int] = None
    group_id: Optional[str] = None
    reason: str
    date: str
    start_time: str
    end_time: str

class ReservationStatusUpdate(BaseModel):
    status: str 

class UnavailabilityCreate(BaseModel):
    teacher_id: int
    date: str
    reason: str

# [NOUVEAU] Schéma pour les notifications globales (Point 3)
class NotificationCreate(BaseModel):
    title: str
    message: str
    type: str
    target_role: str

# =====================================================================
# ENDPOINTS AUTHENTIFICATION & EMAIL
# =====================================================================

@app.post("/login/")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    
    if not user or user.password_hash != request.password:
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    if user.is_active is False:
         raise HTTPException(status_code=403, detail="Compte en attente de validation.")

    return {
        "message": "Connexion réussie",
        "user": {
            "id": user.id,
            "nom": user.nom,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active,
            "department_id": user.department_id,
            "group_id": user.group_id,
            # [MODIF] On renvoie le semestre pour l'affichage étudiant (Point 6)
            "semester": user.semester 
        }
    }

@app.post("/register/")
async def register(request: RegisterRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé.")

    new_user = User(
        nom=request.name,
        email=request.email,
        password_hash=request.password,
        role=request.role,
        group_id=request.group_id, # Enregistre la filière choisie
        is_active=False 
    )
    db.add(new_user)
    db.commit()

    # ENVOI EMAIL : CONFIRMATION D'INSCRIPTION 
    message = MessageSchema(
        subject="Bienvenue sur UniTime - Inscription enregistrée",
        recipients=[request.email],
        body=f"""
        <h3>Bonjour {request.name},</h3>
        <p>Votre demande d'inscription a bien été prise en compte.</p>
        <p>Votre compte est actuellement <strong>en attente de validation</strong> par un administrateur.</p>
        <p>Vous recevrez un nouvel email dès que votre accès sera activé.</p>
        <br>
        <p>Cordialement,<br>L'équipe UniTime</p>
        """,
        subtype=MessageType.html
    )
    fm = FastMail(conf)
    background_tasks.add_task(fm.send_message, message)

    return {"message": "Inscription réussie."}

@app.post("/forgot-password/")
async def forgot_password(request: ForgotPasswordRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email introuvable")
    
    # ENVOI EMAIL : LIEN DE RÉINITIALISATION 
    # Lien vers votre Frontend React (port 5173 par défaut)
    reset_link = f"http://localhost:5173/reset-password?email={request.email}"
    
    message = MessageSchema(
        subject="Réinitialisation de votre mot de passe - UniTime",
        recipients=[request.email],
        body=f"""
        <h3>Demande de réinitialisation</h3>
        <p>Vous avez demandé à réinitialiser votre mot de passe UniTime.</p>
        <p>Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :</p>
        <a href="{reset_link}" style="padding: 10px 20px; background-color: #6B5DD3; color: white; text-decoration: none; border-radius: 5px;">Réinitialiser mon mot de passe</a>
        <br><br>
        <p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
        """,
        subtype=MessageType.html
    )
    fm = FastMail(conf)
    background_tasks.add_task(fm.send_message, message)

    return {"message": "Email envoyé"}

@app.post("/reset-password-confirm/")
def reset_password_confirm(request: NewPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    user.password_hash = request.new_password
    db.commit()
    return {"message": "Mot de passe modifié !"}

# =====================================================================
# ENDPOINTS ADMINISTRATION (VALIDATION)
# =====================================================================

@app.get("/admin/users/pending")
def get_pending_users(db: Session = Depends(get_db)):
    return db.query(User).filter(User.is_active == False).all()

@app.put("/admin/users/{user_id}/validate")
async def validate_user(user_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user: raise HTTPException(404, "Introuvable")
    
    user.is_active = True
    db.commit()

    # ENVOI EMAIL : NOTIFICATION DE VALIDATION 
    message = MessageSchema(
        subject="Compte UniTime Activé !",
        recipients=[user.email],
        body=f"""
        <h3>Félicitations {user.nom} !</h3>
        <p>Votre compte a été validé par un administrateur.</p>
        <p>Vous pouvez dès maintenant vous connecter à la plateforme UniTime :</p>
        <a href="http://localhost:5173/login">Se connecter</a>
        """,
        subtype=MessageType.html
    )
    fm = FastMail(conf)
    background_tasks.add_task(fm.send_message, message)

    return {"message": "Utilisateur validé"}

@app.delete("/admin/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user: raise HTTPException(404, "Introuvable")
    db.delete(user)
    db.commit()
    return {"message": "Supprimé"}

# =====================================================================
# ENDPOINTS LECTURE (GETTERS)
# =====================================================================

@app.get("/seances/")
def get_all_seances(db: Session = Depends(get_db)):
    return db.query(TimeSlot).all()

@app.get("/teachers/")
def get_all_teachers(db: Session = Depends(get_db)):
    return db.query(Teacher).all()

@app.get("/rooms/")
def get_all_rooms(db: Session = Depends(get_db)):
    return db.query(Room).all()

@app.get("/groups/")
def get_all_groups(db: Session = Depends(get_db)):
    return db.query(Group).all()

@app.get("/courses/")
def get_all_courses(db: Session = Depends(get_db)):
    return db.query(Course).all()

@app.get("/teachers/{teacher_id}/courses")
def get_teacher_courses(teacher_id: int, db: Session = Depends(get_db)):
    return db.query(Course).all()

# 👇 Endpoint Robuste pour Étudiant
@app.get("/timetable/{group_id}", response_model=List[SeanceDisplay])
def get_timetable(group_id: str, db: Session = Depends(get_db)):
    slots = db.query(TimeSlot).filter(TimeSlot.group_id == group_id).all()
    results = []
    for slot in slots:
        c = db.query(Course).get(slot.course_id)
        t = db.query(Teacher).get(slot.teacher_id)
        r = db.query(Room).get(slot.room_id)
        
        results.append({
            "id": slot.id, 
            "course_name": c.name if c else "Cours Inconnu", 
            "teacher_name": t.name if t else "Prof Inconnu", 
            "room_name": r.name if r else "Salle Inconnue",
            "day": slot.day, 
            "start_time": slot.start_time, 
            "end_time": slot.end_time,
            "type": slot.type, 
            "group_id": slot.group_id
        })
    return results

# Endpoint pour l'emploi du temps du PROFESSEUR
@app.get("/timetable/teacher/{teacher_id}", response_model=List[SeanceDisplay])
def get_teacher_timetable(teacher_id: int, db: Session = Depends(get_db)):
    slots = db.query(TimeSlot).filter(TimeSlot.teacher_id == teacher_id).all()
    results = []
    for slot in slots:
        c = db.query(Course).get(slot.course_id)
        t = db.query(Teacher).get(slot.teacher_id)
        r = db.query(Room).get(slot.room_id)
        
        results.append({
            "id": slot.id, 
            "course_name": c.name if c else "Cours Inconnu", 
            "teacher_name": t.name if t else "Moi-même", 
            "room_name": r.name if r else "Salle Inconnue",
            "day": slot.day, 
            "start_time": slot.start_time, 
            "end_time": slot.end_time,
            "type": slot.type, 
            "group_id": slot.group_id
        })
    return results

# =====================================================================
# [NOUVEAU] GESTION DES NOTIFICATIONS GLOBALES (Point 3)
# =====================================================================
@app.post("/notifications/")
def create_notification(notif: NotificationCreate, db: Session = Depends(get_db)):
    new_notif = GlobalNotification(
        title=notif.title,
        message=notif.message,
        type=notif.type,
        target_role=notif.target_role,
        created_at=datetime.now()
    )
    db.add(new_notif)
    db.commit()
    return new_notif

@app.get("/notifications/")
def get_notifications(role: str = "all", db: Session = Depends(get_db)):
    # On récupère les notifs destinées à "all" OU au rôle spécifique
    return db.query(GlobalNotification).filter(
        or_(GlobalNotification.target_role == "all", GlobalNotification.target_role == role)
    ).order_by(GlobalNotification.created_at.desc()).all()

# =====================================================================
# FONCTIONNALITÉS PROFESSEUR
# =====================================================================

# 1. RECHERCHE DE SALLE
@app.get("/rooms/search/")
def search_rooms(day: str, start_time: str, end_time: str, capacity: int = 0, db: Session = Depends(get_db)):
    candidates = db.query(Room).filter(Room.capacity >= capacity).all()
    available = []
    
    for room in candidates:
        collision = db.query(TimeSlot).filter(
            TimeSlot.room_id == room.id,
            TimeSlot.day == day,
            TimeSlot.start_time < end_time,
            TimeSlot.end_time > start_time
        ).first()
        
        if not collision:
            available.append(room)
    return available

# 2. CRÉATION RÉSERVATION (Gère maintenant les modules/groupes pour notifications)
@app.post("/reservations/")
def create_reservation(res: ReservationCreate, db: Session = Depends(get_db)):
    try:
        date_obj = datetime.strptime(res.date, "%Y-%m-%d")
    except:
        date_obj = datetime.now()

    new_res = Reservation(
        teacher_id=res.teacher_id,
        room_id=res.room_id,
        # [MODIF] Enregistrement des champs contextuels (Point 4 & 7)
        course_id=res.course_id,
        group_id=res.group_id,
        reason=res.reason,
        date=date_obj,
        start_time=res.start_time,
        end_time=res.end_time,
        status="pending"
    )
    db.add(new_res)
    db.commit()
    return {"message": "Demande envoyée"}

# 3. CRÉATION INDISPONIBILITÉ (Gère la date précise)
@app.post("/unavailabilities/")
def create_unavailability(un: UnavailabilityCreate, db: Session = Depends(get_db)):
    try:
        d_obj = datetime.strptime(un.date, "%Y-%m-%d")
        days_list = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]
        day_str = days_list[d_obj.weekday()]
    except:
        d_obj = datetime.now()
        day_str = "Lundi"

    new_un = Unavailability(
        teacher_id=un.teacher_id,
        date=d_obj, #Date précise
        day=day_str,
        start_time="08:00",
        end_time="18:00",
        reason=f"Absence le {un.date} : {un.reason}"
    )
    db.add(new_un)
    db.commit()
    return {"message": "Indisponibilité enregistrée"}

#Endpoint pour permettre aux étudiants de voir les absences des profs
@app.get("/unavailabilities/")
def get_all_unavailabilities(db: Session = Depends(get_db)):
    return db.query(Unavailability).all()

# =====================================================================
# GÉNÉRATION INTELLIGENTE
# =====================================================================

def is_slot_available(db, day, start, teacher_id, room_id, group_name):
    if db.query(TimeSlot).filter_by(day=day, start_time=start, teacher_id=teacher_id).first(): return False
    if db.query(TimeSlot).filter_by(day=day, start_time=start, room_id=room_id).first(): return False
    if db.query(TimeSlot).filter_by(day=day, start_time=start, group_id=group_name).first(): return False
    return True

def count_daily_hours(db, group_name, day):
    return db.query(TimeSlot).filter_by(group_id=group_name, day=day).count() * 2

def check_pedagogical_constraints(db, group_name, course_id, day, s_type):
    if s_type != "Cours":
        has_cours = db.query(TimeSlot).filter_by(group_id=group_name, course_id=course_id, day=day, type="Cours").first()
        if has_cours: return False
    if count_daily_hours(db, group_name, day) >= 6: return False
    return True

@app.post("/timetable/generate")
def generate_timetable_auto(db: Session = Depends(get_db)):
    db.query(TimeSlot).delete()
    db.commit()

    all_groups = db.query(Group).all()
    all_rooms = db.query(Room).all()
    all_teachers = db.query(Teacher).all()

    if not all_groups or not all_rooms:
        return {"message": "Données insuffisantes (Groupes/Salles) pour générer."}

    time_slots = [("08:00", "10:00"), ("10:15", "12:15"), ("14:00", "16:00"), ("16:15", "18:15")]
    days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"]
    assigned_count = 0
    
    for group in all_groups:
        courses = db.query(Course).filter(Course.group_id == group.id).all()
        random.shuffle(courses)

        pending_sessions = []
        for course in courses:
            h_cours = int(course.hours_cours or 0)
            h_td = int(course.hours_td or 0)
            h_tp = int(course.hours_tp or 0)

            for _ in range((h_cours + 1) // 2): pending_sessions.append({"course": course, "type": "Cours"})
            for _ in range((h_td + 1) // 2):    pending_sessions.append({"course": course, "type": "TD"})
            for _ in range((h_tp + 1) // 2):    pending_sessions.append({"course": course, "type": "TP"})

        pending_sessions.sort(key=lambda x: (x["type"] != "Cours"))

        for item in pending_sessions:
            course, s_type, placed = item["course"], item["type"], False
            t_id = course.teacher_id or (all_teachers[course.id % len(all_teachers)].id if all_teachers else None)
            if not t_id: continue

            req_type = "Amphi" if s_type == "Cours" else ("Labo Info" if s_type == "TP" else "Standard")
            valid_rooms = sorted(all_rooms, key=lambda r: (r.type != req_type, r.capacity < (group.student_count or 0)))

            pref_days = list(days)
            if s_type != "Cours": random.shuffle(pref_days)

            for day in pref_days:
                if not check_pedagogical_constraints(db, group.name, course.id, day, s_type): continue
                for start, end in time_slots:
                    for room in valid_rooms:
                        if is_slot_available(db, day, start, t_id, room.id, group.name):
                            new_slot = TimeSlot(
                                course_id=course.id, teacher_id=t_id, room_id=room.id,
                                group_id=group.name, day=day, start_time=start, end_time=end, type=s_type
                            )
                            db.add(new_slot)
                            db.flush() 
                            assigned_count += 1
                            placed = True
                            break
                    if placed: break
                if placed: break
    
    db.commit()
    return {"message": f"Génération terminée : {assigned_count} séances créées."}

# =====================================================================
# CRUD ADMIN
# =====================================================================

@app.post("/admin/rooms/")
def add_room(room: dict, db: Session = Depends(get_db)):
    if "id" in room and room["id"]:
        existing = db.query(Room).get(room["id"])
        if existing:
            for k, v in room.items(): setattr(existing, k, v)
            db.commit()
            return {"message": "Salle modifiée"}
    
    new_room = Room(**room)
    db.add(new_room)
    db.commit()
    return {"message": "Salle ajoutée"}

@app.delete("/admin/rooms/{room_id}")
def delete_room(room_id: int, db: Session = Depends(get_db)):
    db.query(Room).filter(Room.id == room_id).delete()
    db.commit()
    return {"message": "Supprimé"}

@app.post("/admin/teachers/")
def add_teacher(teacher: dict, db: Session = Depends(get_db)):
    if "id" in teacher and teacher["id"]:
        existing = db.query(Teacher).get(teacher["id"])
        if existing:
            for k, v in teacher.items(): setattr(existing, k, v)
            db.commit()
            return {"message": "Prof modifié"}

    valid_keys = ["name", "email", "department"]
    clean_data = {k: v for k, v in teacher.items() if k in valid_keys}
    new_t = Teacher(**clean_data)
    db.add(new_t)
    db.commit()
    return {"message": "Ajouté"}

@app.delete("/admin/teachers/{t_id}")
def delete_teacher(t_id: int, db: Session = Depends(get_db)):
    db.query(Teacher).filter(Teacher.id == t_id).delete()
    db.commit()
    return {"message": "Supprimé"}

@app.post("/admin/groups/")
def add_group(group: dict, db: Session = Depends(get_db)):
    if "id" in group and group["id"]:
        existing = db.query(Group).get(group["id"])
        if existing:
            existing.name = group["name"]
            existing.student_count = group["student_count"]
            db.commit()
            return {"message": "Groupe modifié"}

    new_g = Group(name=group["name"], student_count=group.get("student_count", 30))
    db.add(new_g)
    db.commit()
    return {"message": "Ajouté"}

@app.delete("/admin/groups/{g_id}")
def delete_group(g_id: int, db: Session = Depends(get_db)):
    db.query(Group).filter(Group.id == g_id).delete()
    db.commit()
    return {"message": "Supprimé"}

@app.post("/admin/courses/")
def add_course(course: dict, db: Session = Depends(get_db)):
    if "id" in course and course["id"]:
        existing = db.query(Course).get(course["id"])
        if existing:
            for k, v in course.items(): setattr(existing, k, v)
            db.commit()
            return {"message": "Module modifié"}

    if "code" not in course: course["code"] = course["name"][:5].upper()
    new_c = Course(**course)
    db.add(new_c)
    db.commit()
    return {"message": "Ajouté"}

@app.delete("/admin/courses/{c_id}")
def delete_course(c_id: int, db: Session = Depends(get_db)):
    db.query(Course).filter(Course.id == c_id).delete()
    db.commit()
    return {"message": "Supprimé"}

# --- AUTRES ENDPOINTS ---
@app.get("/timetable/conflicts")
def get_conflicts(db: Session = Depends(get_db)):
    return []

@app.get("/stats/")
def get_stats(db: Session = Depends(get_db)):
    return {
        "rooms_count": db.query(Room).count(),
        "teachers_count": db.query(Teacher).count(),
        "students_count": db.query(User).filter(User.role == "student").count(),
        "sessions_count": db.query(TimeSlot).count(),
        "courses_count": db.query(Course).count()
    }

@app.get("/reservations/")
def get_reservations(db: Session = Depends(get_db)):
    return db.query(Reservation).all()

# [MODIF] VALIDATION INTELLIGENTE AVEC CRÉATION DE CRÉNEAU (Point 2 & 5)
@app.put("/reservations/{reservation_id}")
def update_reservation_status(reservation_id: int, status_update: ReservationStatusUpdate, db: Session = Depends(get_db)):
    reservation = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Réservation introuvable")
    
    reservation.status = status_update.status
    db.commit()

    # Si c'est validé, on CRÉE le créneau dans l'emploi du temps !
    if status_update.status == "approved" and reservation.room_id and reservation.group_id:
        days_map = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]
        day_name = days_map[reservation.date.weekday()]
        
        new_slot = TimeSlot(
            course_id=reservation.course_id or 1, # Fallback si pas de module
            teacher_id=reservation.teacher_id,
            room_id=reservation.room_id,
            group_id=reservation.group_id,
            day=day_name,
            start_time=reservation.start_time,
            end_time=reservation.end_time,
            type="Rattrapage"
        )
        db.add(new_slot)
        db.commit()
        return {"message": "Réservation validée et créneau ajouté à l'emploi du temps !"}

    return {"message": f"Statut mis à jour : {status_update.status}"}


# =====================================================================
# SEEDING
# =====================================================================
@app.on_event("startup")
def seed_data():
    db = next(get_db())
    try:
        # Création du groupe avec les bonnes infos
        existing_group = db.query(Group).filter(Group.name == "AD").first()
        if not existing_group:
            db.add(Group(
                id="AD", 
                name="AD", 
                student_count=81, 
                filiere="LST AD",  
                semester="S5"      
            ))
        # 1. Créer l'ADMIN
        admin = db.query(User).filter(User.email == "admin@unitime.ma").first()
        if not admin:
            db.add(User(
                nom="Admin UniTime", 
                email="admin@unitime.ma", 
                password_hash="admin123", 
                role="admin", 
                is_active=True
            ))

        # 2. Créer un ENSEIGNANT
        prof = db.query(User).filter(User.email == "prof@unitime.ma").first()
        if not prof:
            db.add(User(
                nom="Professeur Test", 
                email="prof@unitime.ma", 
                password_hash="prof123", 
                role="enseignant", 
                is_active=True
            ))

        # 3. Créer un ÉTUDIANT
        student = db.query(User).filter(User.email == "student@unitime.ma").first()
        if not student:
            db.add(User(
                nom="Manal Rhoni Aref", 
                email="student.ad@unitime.ma", 
                password_hash="student123", 
                role="student", 
                is_active=True,
                group_id="AD",
                semester="S5" 
            ))

        db.commit()
        print("🌱 Données de simulation injectées avec succès !")
    except Exception as e:
        print(f"⚠️ Erreur de seeding: {e}")
    finally:
        db.close()

# =====================================================================
# GÉNÉRATION PDF (PLEINE LARGEUR & TEXTE NEUTRE)
# =====================================================================

def draw_header(pdf, title, subtitle):
    # Fond de l'en-tête (Bande légère)
    pdf.set_fill_color(248, 250, 252)
    pdf.rect(0, 0, 297, 35, 'F') # Hauteur réduite pour gagner de la place
    
    # Titre Principal (Gros et Centré)
    pdf.set_font("Helvetica", 'B', 22)
    pdf.set_text_color(107, 93, 211) # Violet UniTime
    pdf.set_xy(10, 10)
    pdf.cell(0, 10, title, ln=True, align='C')
    
    # Sous-titre (Date)
    pdf.set_font("Helvetica", 'I', 10)
    pdf.set_text_color(100, 116, 139) # Gris Moyen
    pdf.set_xy(10, 20)
    pdf.cell(0, 5, f"{subtitle} - {datetime.now().strftime('%d/%m/%Y')}", ln=True, align='C')

    # Ligne de séparation
    pdf.set_draw_color(107, 93, 211)
    pdf.set_line_width(0.5)
    pdf.line(10, 32, 287, 32)

def draw_course_card(pdf, x, y, w, h, course_name, type_cours, room, teacher, group=""):
    # Ombre portée
    pdf.set_fill_color(230, 230, 240)
    pdf.set_draw_color(255, 255, 255) 
    pdf.rect(x + 1, y + 1, w, h, 'F')

    # Couleurs selon le type
    if "TP" in type_cours.upper():
        accent_color = (147, 51, 234) # Purple
        bg_color = (250, 245, 255)
    elif "TD" in type_cours.upper():
        accent_color = (16, 185, 129) # Emerald
        bg_color = (240, 253, 244)
    else: # Cours
        accent_color = (59, 130, 246) # Blue
        bg_color = (239, 246, 255)

    # Fond de la carte
    pdf.set_fill_color(*bg_color)
    pdf.set_draw_color(200, 200, 200)
    pdf.set_line_width(0.1)
    pdf.rect(x, y, w, h, 'FD')

    # Bande latérale colorée
    pdf.set_fill_color(*accent_color)
    pdf.rect(x, y, 2, h, 'F')

    # Contenu Texte
    # 1. Type
    pdf.set_font("Helvetica", 'B', 7)
    pdf.set_text_color(*accent_color)
    pdf.set_xy(x + 4, y + 2)
    pdf.cell(w - 6, 4, type_cours.upper(), ln=True)

    # 2. Nom du Cours
    pdf.set_font("Helvetica", 'B', 9) # Police légèrement réduite pour tenir
    pdf.set_text_color(30, 41, 59)
    pdf.set_xy(x + 4, y + 7)
    short_name = (course_name[:25] + '..') if len(course_name) > 25 else course_name
    pdf.cell(w - 6, 5, short_name, ln=True)

    # 3. Professeur
    pdf.set_font("Helvetica", '', 7)
    pdf.set_text_color(100, 116, 139)
    pdf.set_xy(x + 4, y + 13)
    teacher_txt = teacher if teacher else "Non assigné"
    pdf.cell(w - 6, 4, teacher_txt, ln=True)

    # 4. Salle & Groupe
    pdf.set_font("Helvetica", 'B', 8)
    pdf.set_text_color(71, 85, 105)
    pdf.set_xy(x + 4, y + 20)
    
    info_bottom = f"SALLE: {room}"
    if group:
        info_bottom += f" | {group}"
        
    pdf.cell(w - 6, 4, info_bottom, ln=True)


# 1. Pour les ÉTUDIANTS et l'ADMIN
@app.get("/export-pdf/{group_id}")
def export_timetable_pdf(group_id: str, db: Session = Depends(get_db)):
    slots = db.query(TimeSlot).filter(TimeSlot.group_id == group_id).all()
    
    pdf = FPDF(orientation='L', unit='mm', format='A4')
    pdf.add_page()
    
    draw_header(pdf, f"EMPLOI DU TEMPS - {group_id}", "Semaine S1")

    days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"]
    times = ["08:00", "10:15", "14:00", "16:15"]
    
    # --- DIMENSIONS RECALCULÉES POUR A4 PAYSAGE (297mm) ---
    # Marge Gauche: 10mm | Colonne Heure: 22mm | 5 Colonnes Jours: 51mm chacune
    # Total: 10 + 22 + (5 * 51) = 287mm (Reste 10mm marge droite -> PARFAIT)
    col_width = 51 
    hour_col_width = 22
    row_height = 30
    header_height = 10
    margin_left = 10 
    start_y = 40 

    # DESSIN DES JOURS
    pdf.set_xy(margin_left + hour_col_width, start_y)
    pdf.set_font("Helvetica", 'B', 11)
    pdf.set_fill_color(107, 93, 211)
    pdf.set_text_color(255, 255, 255)
    pdf.set_draw_color(107, 93, 211)
    
    for day in days:
        pdf.cell(col_width, header_height, day, border=1, align='C', fill=True)
    pdf.ln(header_height)

    # GRILLE
    y_current = pdf.get_y()
    
    for i, start_time in enumerate(times):
        # Colonne Heure
        pdf.set_xy(margin_left, y_current + (i * row_height))
        pdf.set_font("Helvetica", 'B', 9)
        pdf.set_fill_color(241, 245, 249)
        pdf.set_text_color(71, 85, 105)
        pdf.set_draw_color(226, 232, 240)
        pdf.cell(hour_col_width, row_height, start_time, border=1, align='C', fill=True)
        
        # Colonnes Jours
        for day in days:
            current_slot = None
            for slot in slots:
                if slot.day == day and slot.start_time.startswith(start_time[:2]):
                    current_slot = slot
                    break
            
            x_curr = pdf.get_x()
            y_curr = pdf.get_y()
            
            # Fond vide
            pdf.set_fill_color(255, 255, 255)
            pdf.set_draw_color(230, 230, 230)
            pdf.cell(col_width, row_height, "", border=1, fill=True)
            
            if current_slot:
                course = db.query(Course).get(current_slot.course_id)
                room = db.query(Room).get(current_slot.room_id)
                teacher = db.query(Teacher).get(current_slot.teacher_id)
                
                c_name = course.name if course else "Inconnu"
                r_name = room.name if room else "?"
                t_name = teacher.name if teacher else ""
                s_type = current_slot.type or "Cours"

                draw_course_card(pdf, x_curr + 1, y_curr + 1, col_width - 2, row_height - 2, c_name, s_type, r_name, t_name)
                
            pdf.set_xy(x_curr + col_width, y_curr)

    # Sauvegarde
    filename = f"/tmp/timetable_{group_id}.pdf"
    pdf.output(filename)
    return FileResponse(filename, media_type='application/pdf', filename=f"timetable_{group_id}.pdf")


# 2. Pour les PROFESSEURS
@app.get("/export-pdf/teacher/{teacher_id}")
def export_teacher_pdf(teacher_id: int, db: Session = Depends(get_db)):
    slots = db.query(TimeSlot).filter(TimeSlot.teacher_id == teacher_id).all()
    teacher = db.query(Teacher).get(teacher_id)
    teacher_name = teacher.name if teacher else "Professeur"

    pdf = FPDF(orientation='L', unit='mm', format='A4')
    pdf.add_page()
    
    draw_header(pdf, f"EMPLOI DU TEMPS", teacher_name.upper())

    days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"]
    times = ["08:00", "10:15", "14:00", "16:15"]
    
    # --- MÊMES DIMENSIONS OPTIMISÉES ---
    col_width = 51 
    hour_col_width = 22
    row_height = 30
    header_height = 10
    margin_left = 10 
    start_y = 40

    pdf.set_xy(margin_left + hour_col_width, start_y)
    pdf.set_font("Helvetica", 'B', 11)
    pdf.set_fill_color(107, 93, 211)
    pdf.set_text_color(255, 255, 255)
    pdf.set_draw_color(107, 93, 211)
    for day in days:
        pdf.cell(col_width, header_height, day, border=1, align='C', fill=True)
    pdf.ln(header_height)

    y_current = pdf.get_y()
    for i, start_time in enumerate(times):
        pdf.set_xy(margin_left, y_current + (i * row_height))
        pdf.set_font("Helvetica", 'B', 9)
        pdf.set_fill_color(241, 245, 249)
        pdf.set_text_color(71, 85, 105)
        pdf.set_draw_color(226, 232, 240)
        pdf.cell(hour_col_width, row_height, start_time, border=1, align='C', fill=True)
        
        for day in days:
            current_slot = None
            for slot in slots:
                if slot.day == day and slot.start_time.startswith(start_time[:2]):
                    current_slot = slot
                    break
            
            x_curr = pdf.get_x()
            y_curr = pdf.get_y()
            
            pdf.set_fill_color(255, 255, 255)
            pdf.set_draw_color(230, 230, 230)
            pdf.cell(col_width, row_height, "", border=1, fill=True)
            
            if current_slot:
                course = db.query(Course).get(current_slot.course_id)
                room = db.query(Room).get(current_slot.room_id)
                group_name = current_slot.group_id or "?"
                
                c_name = course.name if course else "Inconnu"
                r_name = room.name if room else "?"
                s_type = current_slot.type or "Cours"

                draw_course_card(pdf, x_curr + 1, y_curr + 1, col_width - 2, row_height - 2, c_name, s_type, r_name, f"Gr: {group_name}")
                
            pdf.set_xy(x_curr + col_width, y_curr)

    # Sauvegarde
    filename = f"/tmp/timetable_teacher_{teacher_id}.pdf"
    pdf.output(filename)
    return FileResponse(filename, media_type='application/pdf', filename=f"timetable_teacher_{teacher_id}.pdf")