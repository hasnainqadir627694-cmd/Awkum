# AWKUM ClassHub Design System & Architecture

## 1. Product Vision & Philosophy
AWKUM ClassHub is a student companion application tailored for students of Abdul Wali Khan University Mardan (AWKUM).
Its core mandate is: **Information first. Minimum effort. Maximum clarity.**
Students must immediately know:
1. What is my next class?
2. What is my attendance progress?
3. Which subject has new notes?
4. Which assignments do I need to complete?
5. What important updates have I missed?

## 2. Color Palette & Design Tokens
Inspired directly by the AWKUM campus and reference visual identity:
- **Warm Cream Canvas**: `#F8F0E5` (Primary page background)
- **Ivory Surface**: `#FFFDF9` / `#FFF9F1` (Card and modal surfaces)
- **Deep Espresso Brown**: `#493222` (Primary buttons, selected states, dark highlight cards)
- **Espresso Dark Tone**: `#38271C` (Primary typography and brand titles)
- **Warm Muted Text**: `#806A56` (Secondary typography, timestamps, metadata)
- **Muted Olive Green**: `#668064` (Present attendance, positive completion, active progress)
- **Soft Beige Border**: `#E6D8C7` (Card outlines, separators, input borders)
- **Subtle Academic Red**: `#C84B31` (Absent status, overdue alerts, urgent deadlines)
- **Card Hover / Accent**: `#F3E9DD`

## 3. Typography & Hierarchy
- **Brand & Headings**: Clean, high-legibility sans-serif with academic weight hierarchy (`font-semibold` / `font-bold`).
- **Academic Monogram**: AWKUM classic serif arch motif.
- **Labels**: Short, recognizable labels (Home, Schedule, My Classes, Assignments, Progress, Documents, Due Soon, Submitted, Updates).
- **Numbers & Metrics**: Tabular figures, bold weights for percentages and room numbers.

## 4. Layout & Mobile-First Principles
- Mobile-first layout designed for 375px–430px smartphone viewports with seamless adaptation to desktop/tablet.
- Bottom navigation with 5 primary destinations:
  1. Home
  2. Schedule
  3. Classes
  4. Assignments
  5. Progress
- Top bar with compact AWKUM brand mark, notification bell (with unread badge), and student avatar.
- Touch targets $\ge 44\text{px}$, generous spacing, zero horizontal overflow.

## 5. Attendance Architecture (CRITICAL SPECIFICATION)
- **Single Daily Record**: There is exactly one attendance record for the entire class per date (not per subject).
- Formula: $\text{Overall Percentage} = \frac{\text{Present Days}}{\text{Total Finalized Days}} \times 100$.
- Students can view their overall attendance percentage, trend charts, and daily date-wise history, but cannot modify records.

## 6. The Six Official Subjects
1. **PF Theory** (Dr. Ali Khan) — Block B, Room 12
2. **PF Lab** (Lab Instructor) — Lab Block, Room L3
3. **Management** (Dr. Sara Ahmed) — Block A, Room 05
4. **English** (Ms. Ayesha) — Block C, Room 09
5. **Maths** (Dr. Imran) — Block B, Room 14
6. **Physics** (Dr. Farhan) — Block A, Room 07

## 7. Anti-Slop & Craft Guidelines
- No garish neon gradients or generic purple SaaS palettes.
- Genuine tactile feedback and purposeful micro-interactions.
- Clear empty, loading, error, and success states for all interactive flows.
- Real search filtering, real document previewing, interactive assignment submission, and actionable notifications.
