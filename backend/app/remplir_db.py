import sys
import os
from datetime import datetime

# --- CORRECTION DU CHEMIN ---
# On récupère le dossier courant (.../app)
current_dir = os.path.dirname(os.path.abspath(__file__))
# On récupère le dossier PARENT (la racine)
root_dir = os.path.dirname(current_dir)
# On ajoute la racine au chemin pour que Python puisse trouver "app.database"
sys.path.append(root_dir)
# ----------------------------

from app.database import SessionLocal, engine
from app.models import models

def init_db():
    db = SessionLocal()
    
    try:
        print("🔄 Nettoyage de la base de données...")
        # La suite de ton code reste identique...
        db.query(models.TimeSlot).delete()
        db.query(models.Reservation).delete()
        db.query(models.Course).delete()
        db.query(models.Teacher).delete()
        db.query(models.Room).delete()
        db.query(models.User).delete()
        db.commit()
        
        # 1. Création des Salles
        print("Creating Rooms...")
        rooms = [
            models.Room(id=1, name="Amphi A", type="Amphi", capacity=200),
            models.Room(id=2, name="Amphi B", type="Amphi", capacity=150),
            models.Room(id=3, name="Salle 101", type="TD", capacity=50),
            models.Room(id=4, name="Salle 102", type="TD", capacity=50),
            models.Room(id=5, name="Labo Info 1", type="TP", capacity=30),
        ]
        for room in rooms:
            db.add(room)
        db.commit() 

        # 2. Création des Enseignants
        print("Creating Teachers...")
        teachers = [
            models.Teacher(id=1, name="Dr. Karim Benali", email="k.benali@univ.ma", department="Informatique"),
            models.Teacher(id=2, name="Pr. Fatima Zahra", email="f.zahra@univ.ma", department="Mathématiques"),
            models.Teacher(id=3, name="Dr. Ahmed Mansouri", email="a.mansouri@univ.ma", department="Physique"),
        ]
        for teacher in teachers:
            db.add(teacher)
        db.commit()

        # 3. Création des Cours
        print("Creating Courses...")
        courses = [
            models.Course(id=1, name="Programmation Python", code="INF101"),
            models.Course(id=2, name="Bases de Données", code="INF102"),
            models.Course(id=3, name="Analyse Mathématique", code="MATH101"),
            models.Course(id=4, name="Physique Quantique", code="PHY201"),
        ]
        for course in courses:
            db.add(course)
        db.commit()

        # 4. Création des Utilisateurs
        print("Creating Users...")
        users = [
            models.User(nom="Admin Principal", email="admin@univ.ma", password_hash="admin123", role="admin"),
            models.User(nom="Dr. Karim Benali", email="k.benali@univ.ma", password_hash="prof123", role="enseignant"),
            models.User(nom="Yassine Alaoui", email="etudiant@univ.ma", password_hash="etu123", role="student", group_id="G1"),
        ]
        for user in users:
            db.add(user)
        db.commit()

        # 5. Création de l'Emploi du temps
        print("Creating Timetable...")
        slots = [
            models.TimeSlot(
                course_id=1, teacher_id=1, room_id=5, group_id="G1",
                day="Lundi", start_time="08:30", end_time="10:30", type="TP"
            ),
            models.TimeSlot(
                course_id=2, teacher_id=1, room_id=1, group_id="G1",
                day="Mardi", start_time="10:45", end_time="12:45", type="Cours"
            ),
            models.TimeSlot(
                course_id=3, teacher_id=2, room_id=3, group_id="G2",
                day="Mercredi", start_time="08:30", end_time="10:30", type="TD"
            ),
        ]
        for slot in slots:
            db.add(slot)
        
        db.commit()
        print("✅ Base de données remplie avec succès ! NEON est prêt.")
        
    except Exception as e:
        print(f"❌ Erreur lors du remplissage : {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_db()