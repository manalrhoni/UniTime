from sqlalchemy.orm import Session
from .database import SessionLocal, engine
from .models import models
from datetime import datetime

# Création des tables
models.Base.metadata.create_all(bind=engine)

def init_db():
    db = SessionLocal()

    # 1. Vérifier si la base est déjà remplie
    if db.query(models.User).first():
        print("La base de données contient déjà des données.")
        return

    print("Création des données de test...")

    # 2. Création des Utilisateurs (Login)
    # Admin
    admin_user = models.User(
        nom="Administrateur", 
        email="admin@univ.ma", 
        password_hash="admin123", 
        role="admin"
    )
    # Enseignant (Karim Benali)
    teacher_user = models.User(
        nom="Dr. Karim Benali", 
        email="k.benali@univ.ma", 
        password_hash="prof123", 
        role="enseignant"
    )
    # Étudiant (Yassine Alaoui)
    student_user = models.User(
        nom="Yassine Alaoui", 
        email="etudiant@univ.ma", 
        password_hash="etu123", 
        role="student",
        group_id="G1"
    )

    db.add_all([admin_user, teacher_user, student_user])
    db.commit()

    # 3. Création du Profil Enseignant (Lié à l'utilisateur)
    # Note: L'ID sera 1, ce qui fera marcher votre test Swagger
    teacher_profile = models.Teacher(
        name="Dr. Karim Benali",
        email="k.benali@univ.ma",
        department="Informatique"
    )
    db.add(teacher_profile)
    db.commit()

    # 4. Création des Salles
    room1 = models.Room(name="Salle 101", capacity=30, type="salle_td")
    room2 = models.Room(name="Amphi A", capacity=200, type="amphi")
    room3 = models.Room(name="Labo Info", capacity=25, type="lab")
    db.add_all([room1, room2, room3])
    db.commit()

    # 5. Création des Cours
    c1 = models.Course(name="Programmation Python", code="INF101")
    c2 = models.Course(name="Bases de Données", code="INF102")
    c3 = models.Course(name="Analyse Mathématique", code="MATH101")
    db.add_all([c1, c2, c3])
    db.commit()

    # 6. Création d'un Emploi du temps test
    slot1 = models.TimeSlot(
        course_id=1, # Python
        teacher_id=1, 
        room_id=3,    # Labo
        group_id="G1",
        day="Lundi",
        start_time="08:30",
        end_time="10:30",
        type="TP"
    )
    db.add(slot1)
    db.commit()

    print("Terminé ! Base de données initialisée avec succès.")
    print("Testez maintenant avec teacher_id=1")
    db.close()

if __name__ == "__main__":
    init_db()