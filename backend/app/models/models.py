from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Text
from sqlalchemy.orm import relationship
from ..database import Base
from datetime import datetime

# 1. Modèle Utilisateur
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role = Column(String)  # 'admin', 'enseignant', 'student'
    department_id = Column(String, nullable=True)
    group_id = Column(String, nullable=True)
    semester = Column(String, nullable=True)
    is_active = Column(Boolean, default=False)

# 2. Modèle Enseignant
class Teacher(Base):
    __tablename__ = "teachers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)
    email = Column(String)
    department = Column(String)
    
    time_slots = relationship("TimeSlot", back_populates="teacher")
    reservations = relationship("Reservation", back_populates="teacher")
    unavailabilities = relationship("Unavailability", back_populates="teacher")
    courses = relationship("Course", back_populates="teacher")

# 3. Modèle Salle
class Room(Base):
    __tablename__ = "rooms"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)
    capacity = Column(Integer)
    type = Column(String, default="Standard") # "Standard", "Amphi", "Labo Info"
    equipment = Column(String, default="")
    
    time_slots = relationship("TimeSlot", back_populates="room")
    # Relation pour voir les réservations liées à cette salle
    reservations = relationship("Reservation", back_populates="room")

# 4. Modèle Groupe
class Group(Base):
    __tablename__ = "groups"
    id = Column(String, primary_key=True, index=True) 
    name = Column(String, unique=True)
    student_count = Column(Integer, default=30)
    filiere = Column(String, nullable=True) # Ex: "LST AD"
    semester = Column(String, nullable=True) # Ex: "S5"

    courses = relationship("Course", back_populates="group")

# 5. Modèle Cours/Module
class Course(Base):
    __tablename__ = "courses"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    code = Column(String, unique=True)
    
    # [MODIF] String pour matcher Group.id
    group_id = Column(String, ForeignKey("groups.id"), nullable=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=True)

    hours_cours = Column(Integer, default=0)
    hours_td = Column(Integer, default=0)
    hours_tp = Column(Integer, default=0)
    
    group = relationship("Group", back_populates="courses")
    time_slots = relationship("TimeSlot", back_populates="course")
    teacher = relationship("Teacher", back_populates="courses")
    reservations = relationship("Reservation", back_populates="course")

# 6. Modèle Créneau (TimeSlot)
class TimeSlot(Base):
    __tablename__ = "time_slots"
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"))
    teacher_id = Column(Integer, ForeignKey("teachers.id"))
    room_id = Column(Integer, ForeignKey("rooms.id"))
    group_id = Column(String) # Cohérent avec Group.id
    
    day = Column(String)
    start_time = Column(String)
    end_time = Column(String)
    type = Column(String) # "Cours", "TD", "TP", "Rattrapage"

    course = relationship("Course", back_populates="time_slots")
    teacher = relationship("Teacher", back_populates="time_slots")
    room = relationship("Room", back_populates="time_slots")

# 7. Modèle Réservation (pour les notifications ciblées)
class Reservation(Base):
    __tablename__ = "reservations"
    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id"))
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=True)
    
    # --- POUR NOTIFIER LE BON GROUPE/MODULE ---
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)
    group_id = Column(String, nullable=True) 
    # --------------------------------------------------

    reason = Column(String)
    date = Column(DateTime)
    start_time = Column(String)
    end_time = Column(String)
    status = Column(String, default="pending") 
    
    teacher = relationship("Teacher", back_populates="reservations")
    room = relationship("Room", back_populates="reservations")
    course = relationship("Course", back_populates="reservations")

# 8. Modèle Indisponibilité (pour les absences ponctuelles)
class Unavailability(Base):
    __tablename__ = "unavailabilities"
    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id"))
    
    # --- POUR NOTIFIER LES ÉTUDIANTS À UNE DATE PRÉCISE ---
    date = Column(DateTime, nullable=True) 
    day = Column(String)
    start_time = Column(String)
    end_time = Column(String)
    reason = Column(String, nullable=True)
    
    teacher = relationship("Teacher", back_populates="unavailabilities")

class GlobalNotification(Base):
    __tablename__ = "global_notifications"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    message = Column(String)
    type = Column(String) # 'info', 'warning', 'alert'
    target_role = Column(String) # 'all', 'student', 'teacher'
    created_at = Column(DateTime, default=datetime.now)