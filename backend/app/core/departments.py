# The schools and departments of Holy Angel University, offered when a patient is registered.

# Named as the university names them. Offices (Registrar, Finance) are typed in for employees.
HAU_DEPARTMENTS: tuple[str, ...] = (
    "School of Business and Accountancy",
    "School of Engineering and Architecture",
    "School of Arts and Sciences",
    "School of Education",
    "School of Hospitality and Tourism Management",
    "School of Nursing and Allied Medical Sciences",
    "School of Computing",
    "College of Criminal Justice Education and Forensics",
    "HAU Aviation Institute",
    "Graduate School",
    "Basic Education Department (Junior High School and Senior High School)",
)

# A student of a department that starts with this is in basic education, the rest in college.
BASIC_EDUCATION_PREFIX = "basic education"
