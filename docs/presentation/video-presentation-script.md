# HAU-Sync Video Presentation Script

The spoken script for [`HAU-Sync-Video-Presentation.pptx`](HAU-Sync-Video-Presentation.pptx). The same words are in the speaker notes of each slide.

- **Length:** about 13 to 15 minutes at a relaxed pace, a little over 2 minutes per speaker.
- **How to use it:** say it in your own words. The script is a guide, not something to read out word for word.
- **Speakers:** the order below follows the slides. Swap parts if another member knows a part better, and change the hand-over line to match.

| Part | Speaker | Slides |
| --- | --- | --- |
| The problem and our idea | Sean Jarin Dela Cruz | 1 to 3 |
| Studying the clinic | Mikko Brandon B. Panergo | 4 to 6 |
| Designing the system | Bernard Rodriguez Jr. | 7 to 9 |
| The system, from arrival to record | Gil Miranda | 10 to 12 |
| Appointments, medicine, reports and privacy | Mclaren Ais Miranda | 13 to 15 |
| How we built it, and what is next | Paolo Villanueva | 16 to 19 |

## Part 1: The problem and our idea

**Speaker: Sean Jarin Dela Cruz**

### Slide 1: HAU-Sync

Good day, everyone. We are a group of third-year Computer Science students from section CS-302 of Holy Angel University, and this is our final project in Software Engineering under Prof. Evicen Flores.

Our project is called HAU-Sync. It is a patient record and appointment system that we built for the Holy Angel University Clinic.

In this video, the six of us will walk you through the problem we saw, how we studied it, how we designed the system, and then the working system itself.

### Slide 2: Today, the clinic works on paper

Let us start with the problem. Right now, the University Clinic does almost everything by hand.

When you visit the clinic, your name goes into a handwritten patient log. Your medical record is on paper. Even the list of medicines in stock is kept by hand.

Paper works, but it is slow. During busy hours, when many students come in at the same time, the staff have to write, find and pass papers around. It is hard to search for an old record, and a sheet of paper can easily be misplaced.

### Slide 3: One record, shared by everyone

So our idea is simple. Instead of passing paper from one person to the next, everyone in the clinic looks at the same record.

The front desk logs the patient. The nurse records the visit. And the doctor sees that same record right away on their own screen, without anyone handing anything over.

The system runs only inside the clinic, on the clinic's own network. Nothing leaves the clinic's computers. That matters because health information is sensitive and is protected by the Data Privacy Act of 2012.

To explain how we studied the clinic, here is Mikko.

## Part 2: Studying the clinic

**Speaker: Mikko Brandon B. Panergo**

### Slide 4: The site: the University Clinic

Thank you, Sean. Before we wrote any code, we first had to understand the place where the system will be used.

The clinic is on the ground floor of the PGN Building, in the middle of the campus, so it is easy for students and employees to reach. It has a waiting area, an infirmary, two doctor's offices and a dental office.

The good news is that the clinic already has what the system needs. It has computers and a router, it has its own internet connection, and the building has a generator. So we did not need to ask for any new equipment. We designed the system to fit what is already there.

### Slide 5: What the clinic told us

We also sat down with the clinic personnel for an interview, and four things stood out.

First, everything is handwritten, so the staff write the same details again and again.

Second, the school portal no longer supports the clinic, so they have no digital way to keep patient information.

Third, the front desk slows down during peak hours, when student traffic is at its highest.

And fourth, they want the system to stay inside the clinic, because patient information must stay private. These four findings shaped everything we built.

### Slide 6: What the system must do

From the interview and our project paper, we wrote down the requirements. We ended up with fifteen functional requirements and fifteen non-functional requirements.

The functional requirements are the things the system does: signing in with a role, keeping patient records, recording visits, managing appointments, tracking the medicine inventory, making reports and showing a dashboard.

The non-functional requirements describe how well it should do those things: it must be secure, it must keep data private, it must be easy to use, and it must be reliable.

Next, Bernard will show how we turned these requirements into diagrams.

## Part 3: Designing the system

**Speaker: Bernard Rodriguez Jr.**

### Slide 7: Level 0: the system at a glance

Thanks, Mikko. This is our Level 0 diagram, also called the context diagram. It shows the whole system as one circle, and the people who give it information and get information back.

There are three kinds of users. The clinic staff, which means the nurses and the student assistants. The doctor. And the clinic coordinator, who manages the clinic.

You might notice that the patient is not here. That is on purpose. The clinic asked for a clinic-only system, so patients do not have accounts. The staff enter the patient's details for them.

### Slide 8: Level 1: inside the system

Now we open that one circle and look inside. This is our Level 1 data flow diagram.

The system is made of seven processes: managing patient records, managing appointments, recording visits and consultations, managing the medicine inventory, generating reports, signing in and showing the dashboard, and managing accounts and the audit log.

It also has seven data stores, which is where the information is kept. The arrows show how information moves. For example, when a nurse releases medicine during a visit, that goes to the inventory process, which takes it off the stock.

### Slide 9: Who can do what

This is our use case diagram. It answers one question: who is allowed to do what?

The clinic staff check patients in, record visits, release medicine and book appointments.

The doctor writes the consultation notes and the diagnosis.

The coordinator can do everything the staff and the doctor can, and also confirms appointments, manages the accounts and reads the audit log.

This is important for privacy. Each person only sees and does what their work needs. Now Gil will show you the actual system.

## Part 4: The system, from arrival to record

**Speaker: Gil Miranda**

### Slide 10: The clinic's day on one screen

Thank you, Bernard. Now let us look at the real thing. This is the dashboard, the first screen you see after signing in.

It puts the clinic's whole day on one screen: the visits today, the appointments today, the medicines that are running low, and the latest notifications.

And it updates live. If the front desk checks in a patient, the nurse and the doctor see it on their screens right away. Nobody needs to refresh the page.

### Slide 11: Check in, then record the visit

When a patient walks in, the staff search for them by name or by ID number, tap a common complaint such as headache or fever, and check them in. It only takes a few taps.

That opens a visit record. The nurse enters the vital signs, the assessment and the treatment. The system also checks what is typed. If someone enters a value that is not possible, like an oxygen level of one hundred twenty percent, it will not accept it.

Then the doctor opens the very same visit and adds the consultation notes and the diagnosis. While the doctor is editing, the system tells the nurse, so they do not overwrite each other's work.

### Slide 12: Each patient's record in one place

Every patient has one record. At the very top, the system shows the alerts first: allergies, health conditions and restrictions. So the staff see the important warnings before anything else.

Below that is the full history of the patient's visits, from the newest to the oldest. The staff can also attach files, such as a lab result.

And patients are never deleted. If a record is no longer needed, it is archived, so the history is always kept. Next is Mclaren.

## Part 5: Appointments, medicine, reports and privacy

**Speaker: Mclaren Ais Miranda**

### Slide 13: Appointments and medicine stock

Thanks, Gil. Let us continue with appointments. The staff can book an appointment and move it to another day. A new appointment starts as pending, and the coordinator confirms or cancels it. When the patient arrives, one tap checks them in.

For medicine, the system keeps count for the clinic. When a nurse releases medicine during a visit, the stock goes down by itself. When a medicine is running low, the system gives a warning. And every release is written in a log, so the clinic can always see where the medicine went.

### Slide 14: Clinic statistics for any period

The clinic also needs to submit reports. Before, someone had to count everything by hand.

Now the staff just choose a period, such as a month, a semester or the summer term, and the system shows the numbers and the charts: how many visits there were, what kind, from which department, and the most common complaints.

The report can be downloaded as a file that opens in Excel, or saved inside the system for later.

### Slide 15: Built to protect patient data

Because this is health information, we treated privacy as a main feature, not as an extra.

First, the data stays in the clinic. The system runs on the clinic's own network.

Second, access depends on your role, so you only see what your work needs.

Third, every time someone views or changes a patient's record, it is written in an audit log that the coordinator can read.

And fourth, a computer that is left unused for an hour signs itself out. All of this is in keeping with the Data Privacy Act of 2012. To explain how we built all of this, here is Paolo.

## Part 6: How we built it, and what is next

**Speaker: Paolo Villanueva**

### Slide 16: How it is built

Thank you, Mclaren. Here is how the system works behind the screen, in simple terms.

The system has two halves. The first half is what you see in the browser. We built it with React and TypeScript. The second half is the backend, which keeps the rules and the data. We built it with Python and FastAPI, and it saves everything in a database.

At the clinic, one computer acts as the server. The front desk, the nurse and the doctor simply open one address in their browser. The server also sends live updates to every station, which is why a change on one screen appears on the others.

### Slide 17: How we worked: Agile, in five phases

For our process, we followed the Agile model. That means we built the system in small parts, tested each part, and improved it as we learned more from the clinic.

We worked in five phases. First, the proposal and its approval. Second, gathering the requirements through the interview. Third, the database and the backend. Fourth, the screens. And fifth, where we are now, testing and evaluation.

### Slide 18: Tested, and what comes next

We do not just hope that the system works. We wrote automated tests that check it for us every time we change the code: 75 tests for the backend and 275 tests for the screens.

We also want to be honest about one thing. Every feature in our project paper is built, except the urgent-case queue, which our team decided to leave out.

From here, there are three steps left. We finish testing as a team. Then the clinic personnel try the system and tell us what to change. And finally, we install it on the clinic's computer and turn it over to them.

### Slide 19: Thank you

*Paolo Villanueva, then everyone*

To sum up: HAU-Sync replaces the clinic's paper with one shared record that is faster to use, easier to search, and safer for patient information.

We would like to thank the Holy Angel University Clinic for their time and support, and Prof. Evicen Flores for guiding us.

(Everyone) Thank you for watching!
