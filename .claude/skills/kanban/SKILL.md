---
name: kanban
description: 'Visa och uppdatera kanban-tavlan för Näthänget (GitHub Project 18): vad som pågår, vad som är nästa kort, flytta kort mellan Todo/In Progress/Done och skapa nya kort. Use when the user writes /kanban, "vad ska jag göra nu", "nästa kort", "uppdatera kanban", "flytta kortet", "skapa ett kort" or asks about the board/project.'
---

# /kanban – tavlan för Näthänget

ID:n, kommandon och regler står i `AGENTS.md` § Kanban. Läs den delen först.

## Användning

| Användaren skriver       | Gör                                                                          |
| ------------------------ | ---------------------------------------------------------------------------- |
| `/kanban`                | Visa tavlan (se nedan).                                                      |
| `/kanban nästa`          | Föreslå nästa kort att jobba på, med motivering.                             |
| `/kanban börja <sökord>` | Flytta kortet till _In Progress_, läs det och sammanfatta vad som ska göras. |
| `/kanban klar <sökord>`  | Flytta kortet till _Done_.                                                   |
| `/kanban nytt <titel>`   | Skapa en issue och lägg den i Todo. Saknas `[Område]` – föreslå ett.         |
| `/kanban städa`          | Jämför _In Progress_ med koden och föreslå vad som kan flyttas.              |

`<sökord>` är ett issuenummer (`12`, `#12`) eller matchas mot titeln (skiftlägesokänsligt). Matchar flera kort – fråga vilket.

## Visa tavlan

1. Hämta alla kort: `gh project item-list 18 --owner knixan --format json --limit 200`.
2. Visa kort och tydligt, i den här ordningen:
   - **In Progress** – alla kort.
   - **Todo** – grupperat per område (`[Säkerhet]`, `[Vänner]` …), antal per område och titlarna.
   - **Done** – bara antal.
3. Avsluta med ett förslag på nästa kort (se nedan) – en mening.

## Föreslå nästa kort

- Avsluta det som pågår först.
- Säkerhetskort som andra funktioner bygger på (t.ex. åldersband och separation minderårig/vuxen) går före funktioner där användare kontaktar varandra (Flaskpost, Vänner, Gästbok, Gruppchatt).
- Föredra kort som är små nog för en session. Är ett kort stort – föreslå att dela upp det i flera kort.

## Ändra kort

- Visa vad du tänker ändra innan du ändrar fler än ett kort i taget.
- Korten är issues: `id` (`PVTI_…`) används för status, `content.number` för `gh issue view/edit/comment`.
- Ett kort i listan som fortfarande är `DraftIssue` (inte gjort om till issue) – säg till användaren i stället för att ändra det.
- Skriv långa bodies och kommentarer i en fil i scratchpad och använd `--body-file`.
- Bekräfta efteråt med en rad per kort: `#12 [Område] Titel: Todo → In Progress`.
