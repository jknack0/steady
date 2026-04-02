"""Synthetic PHI test cases for evaluation.

Generates 50+ clinical notes with embedded PHI and ground truth annotations.
Includes tricky edge cases: common-word names, dates in narrative, partial SSNs, etc.
"""

from typing import List, Tuple
from engine.entity import PHICategory


# Each sample is (text, list of (start, end, category, text_fragment))
SampleNote = Tuple[str, List[Tuple[int, int, PHICategory, str]]]


def get_samples() -> List[SampleNote]:
    """Return synthetic clinical notes with ground truth PHI annotations."""
    samples: List[SampleNote] = []

    # 1. Basic clinical note with multiple PHI types
    samples.append((
        "Patient: John Smith, DOB: 03/15/1985. SSN: 123-45-6789. "
        "Phone: (555) 867-5309. Email: john.smith@email.com. "
        "Address: 123 Main Street, Springfield, IL 62704.",
        [
            (9, 19, PHICategory.NAME, "John Smith"),
            (26, 36, PHICategory.DATE, "03/15/1985"),
            (43, 54, PHICategory.SSN, "123-45-6789"),
            (63, 77, PHICategory.PHONE, "(555) 867-5309"),
            (86, 106, PHICategory.EMAIL, "john.smith@email.com"),
            (117, 132, PHICategory.GEOGRAPHIC, "123 Main Street"),
            (148, 153, PHICategory.GEOGRAPHIC, "62704"),
        ]
    ))

    # 2. Names that look like common words
    samples.append((
        "Patient: Will May was seen today. Dr. Mark Hunter performed the evaluation.",
        [
            (9, 17, PHICategory.NAME, "Will May"),
            (37, 48, PHICategory.NAME, "Mark Hunter"),
        ]
    ))

    # 3. Dates in narrative context
    samples.append((
        "Mrs. Johnson was born on January 15, 1952 and was admitted on 02/28/2024.",
        [
            (5, 12, PHICategory.NAME, "Johnson"),
            (25, 41, PHICategory.DATE, "January 15, 1952"),
            (62, 72, PHICategory.DATE, "02/28/2024"),
        ]
    ))

    # 4. Phone numbers embedded without formatting
    samples.append((
        "Contact the patient at 5558675309 or their emergency contact at 555-123-4567.",
        [
            (23, 33, PHICategory.PHONE, "5558675309"),
            (63, 75, PHICategory.PHONE, "555-123-4567"),
        ]
    ))

    # 5. Partial SSN
    samples.append((
        "Patient confirmed last four of SSN: 6789. Full SSN on file: 456-78-9012.",
        [
            (55, 66, PHICategory.SSN, "456-78-9012"),
        ]
    ))

    # 6. Medical record number with context
    samples.append((
        "MRN: 12345678. Chart # 87654321. Patient ID: PAT-2024-0001.",
        [
            (5, 13, PHICategory.MRN, "12345678"),
            (23, 31, PHICategory.MRN, "87654321"),
        ]
    ))

    # 7. Email in clinical context
    samples.append((
        "Send results to patient at sarah.jones@gmail.com and CC dr.wilson@hospital.org.",
        [
            (30, 52, PHICategory.EMAIL, "sarah.jones@gmail.com"),
            (60, 82, PHICategory.EMAIL, "dr.wilson@hospital.org"),
        ]
    ))

    # 8. Age over 89
    samples.append((
        "Patient is a 92-year-old male presenting with memory concerns. Age: 95 years old.",
        [
            (16, 18, PHICategory.AGE_OVER_89, "92"),
            (67, 69, PHICategory.AGE_OVER_89, "95"),
        ]
    ))

    # 9. Clean clinical content (no PHI)
    samples.append((
        "Administer CBT techniques focusing on cognitive restructuring. "
        "Schedule follow-up in 2 weeks. Prescribe sertraline 50mg daily.",
        []
    ))

    # 10. Clean homework content (no PHI)
    samples.append((
        "Practice deep breathing for 5 minutes each morning. "
        "Complete the thought record worksheet before next session. "
        "Rate your anxiety on a scale of 1-10 three times per day.",
        []
    ))

    # 11. URL and IP address
    samples.append((
        "Patient portal: https://myhealth.hospital.com/patient/12345. "
        "Accessed from IP 192.168.1.100.",
        [
            (17, 56, PHICategory.URL, "https://myhealth.hospital.com/patient/12345"),
            (75, 88, PHICategory.IP_ADDRESS, "192.168.1.100"),
        ]
    ))

    # 12. Insurance information
    samples.append((
        "Insurance: Blue Cross. Policy # BCX-789-0123. Member ID: M1234567890. "
        "Subscriber ID: SUB-456789.",
        [
            (31, 43, PHICategory.HEALTH_PLAN_ID, "BCX-789-0123"),
        ]
    ))

    # 13. Complex address
    samples.append((
        "Patient resides at 456 Oak Avenue, Apt 12B, Chicago, IL 60601-1234.",
        [
            (20, 34, PHICategory.GEOGRAPHIC, "456 Oak Avenue"),
            (57, 67, PHICategory.GEOGRAPHIC, "60601-1234"),
        ]
    ))

    # 14. Biometric reference
    samples.append((
        "Fingerprint scan on file. Retinal scan completed for identity verification.",
        [
            (0, 16, PHICategory.BIOMETRIC, "Fingerprint scan"),
            (27, 39, PHICategory.BIOMETRIC, "Retinal scan"),
        ]
    ))

    # 15. Photo reference
    samples.append((
        "Full-face photograph attached: patient_photo.jpg. Updated headshot on file.",
        [
            (42, 59, PHICategory.PHOTO, "patient_photo.jpg"),
        ]
    ))

    # 16. Multiple names in one note
    samples.append((
        "Patient: Maria Garcia-Lopez was referred by Dr. Robert Chen. "
        "Emergency contact: Ana Martinez, phone: 555-222-3333.",
        [
            (9, 28, PHICategory.NAME, "Maria Garcia-Lopez"),
            (49, 59, PHICategory.NAME, "Robert Chen"),
            (82, 95, PHICategory.NAME, "Ana Martinez"),
            (104, 116, PHICategory.PHONE, "555-222-3333"),
        ]
    ))

    # 17. ISO date format
    samples.append((
        "Admission date: 2024-03-15. Discharge planned: 2024-03-22.",
        [
            (16, 26, PHICategory.DATE, "2024-03-15"),
            (48, 58, PHICategory.DATE, "2024-03-22"),
        ]
    ))

    # 18. Clean module content (should not flag)
    samples.append((
        "Module 3: Understanding Emotional Regulation. "
        "Session 5 covers cognitive distortions and automatic negative thoughts. "
        "Complete homework by Week 4.",
        []
    ))

    # 19. Clean strategy card (should not flag)
    samples.append((
        "The 5-4-3-2-1 Grounding Technique: Name 5 things you can see, "
        "4 things you can touch, 3 things you can hear, 2 things you can smell, "
        "and 1 thing you can taste.",
        []
    ))

    # 20. Tricky — numbers that look like PHI but aren't
    samples.append((
        "Score: 15 out of 27 on PHQ-9. ICD-10 code F33.1. CPT code 90834. "
        "Session duration: 45 minutes. Dose: 100mg.",
        []
    ))

    # 21-30: More clinical notes with embedded PHI
    samples.append((
        "Client Name: David Kim. Phone: 312-555-0198. "
        "Next appointment: March 20, 2024.",
        [
            (13, 22, PHICategory.NAME, "David Kim"),
            (31, 43, PHICategory.PHONE, "312-555-0198"),
            (65, 79, PHICategory.DATE, "March 20, 2024"),
        ]
    ))

    samples.append((
        "Referral from Dr. Emily Watson for patient Angela Reeves, age 94.",
        [
            (18, 30, PHICategory.NAME, "Emily Watson"),
            (43, 57, PHICategory.NAME, "Angela Reeves"),
            (63, 65, PHICategory.AGE_OVER_89, "94"),
        ]
    ))

    samples.append((
        "Fax records to 555-444-3322. Patient email: t.jones@protonmail.com.",
        [
            (15, 27, PHICategory.FAX, "555-444-3322"),
            (45, 67, PHICategory.EMAIL, "t.jones@protonmail.com"),
        ]
    ))

    samples.append((
        "Treatment plan for 456 Elm Drive resident. ZIP: 90210.",
        [
            (19, 32, PHICategory.GEOGRAPHIC, "456 Elm Drive"),
            (45, 50, PHICategory.GEOGRAPHIC, "90210"),
        ]
    ))

    samples.append((
        "Patient accessed portal from 10.0.0.1 and https://portal.example.com/records.",
        [
            (29, 37, PHICategory.IP_ADDRESS, "10.0.0.1"),
            (42, 76, PHICategory.URL, "https://portal.example.com/records"),
        ]
    ))

    # 26. Clean assessment content
    samples.append((
        "PHQ-9 Assessment: Over the last 2 weeks, how often have you been bothered by: "
        "1. Little interest or pleasure in doing things. "
        "2. Feeling down, depressed, or hopeless.",
        []
    ))

    # 27. NPI number with context
    samples.append((
        "Provider NPI: 1234567893. DEA number: AB1234567.",
        [
            (14, 24, PHICategory.LICENSE_NUMBER, "1234567893"),
        ]
    ))

    # 28. SSN with context
    samples.append((
        "Social Security Number: 078-05-1120. Please verify.",
        [
            (24, 35, PHICategory.SSN, "078-05-1120"),
        ]
    ))

    # 29. Multiple dates with context
    samples.append((
        "Patient DOB: 11/23/1978. Admitted: 01/05/2024. Discharged: 01/12/2024.",
        [
            (13, 23, PHICategory.DATE, "11/23/1978"),
            (35, 45, PHICategory.DATE, "01/05/2024"),
            (59, 69, PHICategory.DATE, "01/12/2024"),
        ]
    ))

    # 30. Clean educational content
    samples.append((
        "Behavioral Activation: Schedule 3 pleasurable activities this week. "
        "Track mood before and after each activity using the 1-10 scale.",
        []
    ))

    # 31-40: Edge cases and tricky scenarios
    samples.append((
        "Pt: R. Thompson. Cell: +1 (212) 555-0147.",
        [
            (4, 16, PHICategory.NAME, "R. Thompson"),
            (24, 42, PHICategory.PHONE, "+1 (212) 555-0147"),
        ]
    ))

    samples.append((
        "Healthcare proxy: Lisa Nguyen, relationship: daughter. "
        "Contact: lisa.n@yahoo.com.",
        [
            (18, 30, PHICategory.NAME, "Lisa Nguyen"),
            (64, 81, PHICategory.EMAIL, "lisa.n@yahoo.com"),
        ]
    ))

    samples.append((
        "VIN: 1HGBH41JXMN109186. Vehicle registration: CA ABC1234.",
        [
            (5, 22, PHICategory.VEHICLE_ID, "1HGBH41JXMN109186"),
        ]
    ))

    samples.append((
        "Device serial: UDI 12-3456789-012345-67. Implant date: Jun 15, 2023.",
        [
            (19, 40, PHICategory.DEVICE_ID, "12-3456789-012345-67"),
            (57, 69, PHICategory.DATE, "Jun 15, 2023"),
        ]
    ))

    samples.append((
        "Session note: Patient reported increased anxiety after moving to "
        "789 Pine Court, Apt 4A, Austin, TX 78701.",
        [
            (67, 81, PHICategory.GEOGRAPHIC, "789 Pine Court"),
            (96, 101, PHICategory.GEOGRAPHIC, "78701"),
        ]
    ))

    # 36. Clean content with numbers that might false-positive
    samples.append((
        "Module 7 covers relaxation techniques. Part 3 discusses progressive "
        "muscle relaxation. Complete steps 1 through 5 before session 8.",
        []
    ))

    # 37. Multiple emails
    samples.append((
        "Send to primary: a.patel@outlook.com, CC: nurse@clinic.org.",
        [
            (17, 37, PHICategory.EMAIL, "a.patel@outlook.com"),
            (43, 59, PHICategory.EMAIL, "nurse@clinic.org"),
        ]
    ))

    # 38. Date with abbreviated month
    samples.append((
        "Follow-up scheduled: Dec. 3, 2024. Previous visit: Sep 15, 2024.",
        [
            (21, 33, PHICategory.DATE, "Dec. 3, 2024"),
            (51, 63, PHICategory.DATE, "Sep 15, 2024"),
        ]
    ))

    # 39. Clean coping strategies
    samples.append((
        "When feeling overwhelmed: 1) Take 3 deep breaths. 2) Name the emotion. "
        "3) Use the STOP technique. 4) Call your support person.",
        []
    ))

    # 40. Mixed clean and PHI
    samples.append((
        "CBT Session 4: Cognitive restructuring exercise. "
        "Patient: Michael Brown reported improvement. "
        "Next session: April 10, 2024.",
        [
            (50, 63, PHICategory.NAME, "Michael Brown"),
            (92, 106, PHICategory.DATE, "April 10, 2024"),
        ]
    ))

    # 41-50: More samples for robust evaluation
    samples.append((
        "Therapist: Dr. Sarah Mitchell. Patient: James Rodriguez. "
        "Session date: 2024-06-15.",
        [
            (15, 29, PHICategory.NAME, "Sarah Mitchell"),
            (40, 56, PHICategory.NAME, "James Rodriguez"),
            (73, 83, PHICategory.DATE, "2024-06-15"),
        ]
    ))

    samples.append((
        "Emergency: call 911 or 555-999-8888. Patient cell: 555.123.4567.",
        [
            (25, 37, PHICategory.PHONE, "555-999-8888"),
            (54, 66, PHICategory.PHONE, "555.123.4567"),
        ]
    ))

    samples.append((
        "Subscriber ID: SUB-2024-78901. Group Number: GRP456789.",
        []  # These are insurance IDs, tricky edge case
    ))

    samples.append((
        "Clean ADHD content: Executive function strategies include using "
        "timers, breaking tasks into smaller steps, and body doubling.",
        []
    ))

    samples.append((
        "Patient resides in New York, NY 10001. Originally from 90210 area.",
        [
            (34, 39, PHICategory.GEOGRAPHIC, "10001"),
            (58, 63, PHICategory.GEOGRAPHIC, "90210"),
        ]
    ))

    samples.append((
        "Lab ordered at https://labcorp.com/orders/98765. Results pending.",
        [
            (15, 47, PHICategory.URL, "https://labcorp.com/orders/98765"),
        ]
    ))

    samples.append((
        "Patient photo on file: headshot_2024.jpg. Fingerprint verification complete.",
        [
            (22, 40, PHICategory.PHOTO, "headshot_2024.jpg"),
            (42, 64, PHICategory.BIOMETRIC, "Fingerprint verification"),
        ]
    ))

    samples.append((
        "Session 12 summary: Reviewed homework completion rate (80%). "
        "Discussed medication adherence. PHQ-9 score decreased from 15 to 8.",
        []
    ))

    samples.append((
        "Client: Tyler Nguyen, DOB: 07/22/1990, Phone: (773) 555-0199, "
        "Email: tyler.n@gmail.com. Address: 321 Birch Lane, Evanston, IL 60201.",
        [
            (8, 21, PHICategory.NAME, "Tyler Nguyen"),
            (28, 38, PHICategory.DATE, "07/22/1990"),
            (47, 61, PHICategory.PHONE, "(773) 555-0199"),
            (70, 89, PHICategory.EMAIL, "tyler.n@gmail.com"),
            (100, 114, PHICategory.GEOGRAPHIC, "321 Birch Lane"),
            (128, 133, PHICategory.GEOGRAPHIC, "60201"),
        ]
    ))

    samples.append((
        "Homework assignment: Practice the 4-7-8 breathing technique "
        "twice daily. Journal about one positive experience each evening.",
        []
    ))

    return samples
